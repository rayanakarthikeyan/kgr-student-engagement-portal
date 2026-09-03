import { randomUUID } from "node:crypto";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  cleanText,
  createSupabaseClient,
  getBody,
  getQuery,
  handleOptions,
  methodNotAllowed,
  requireUser,
  sendError,
  setCors,
} from "./_shared.js";

const kinds = new Set(["question", "submission", "chat"]);

function metadata(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function words(value) {
  return new Set(cleanText(value).toLowerCase().match(/[a-z0-9]+/g)?.filter((word) => word.length > 2) || []);
}

function similarity(left, right) {
  const a = words(left);
  const b = words(right);
  if (a.size === 0 || b.size === 0) return 0;
  const intersection = [...a].filter((word) => b.has(word)).length;
  return Math.round((intersection / new Set([...a, ...b]).size) * 100);
}

function builtInTutor(message, assignmentTitle, questionTitles) {
  const value = `${assignmentTitle} ${message}`.toLowerCase();
  const context = questionTitles.length > 0 ? ` Your assignment focuses on ${questionTitles.join(", ")}.` : "";
  const asksForExample = /example|sample|show me/.test(value);
  const asksToCheck = /check|review|correct|wrong|error/.test(value);
  const opening = asksToCheck
    ? "Use this check sequence on your current work:"
    : asksForExample
      ? "Use this small practice pattern, then replace it with your assignment data:"
      : "Work through these steps:";

  if (value.includes("normal") || value.includes("bcnf") || value.includes("3nf")) {
    return `${opening} 1) list the functional dependencies, 2) find candidate keys using attribute closure, 3) test whether each determinant is a superkey, and 4) decompose only the violating dependency. A relation is in BCNF when every non-trivial dependency has a superkey on the left.${context} Send one dependency and your closure result for the next check.`;
  }
  if (value.includes("sql") || value.includes("join") || value.includes("query")) {
    const sqlHint = value.includes("having") || value.includes("group")
      ? "Use WHERE before grouping for row-level filters and HAVING after GROUP BY for aggregate filters."
      : value.includes("join")
        ? "Match each foreign key to its referenced primary key and qualify repeated column names with table aliases."
        : "Start with SELECT and FROM, verify the rows, then add joins, filters, grouping, and ordering one step at a time.";
    return `${opening} ${sqlHint}${context} Share your current query, the expected columns, and the result or error you received.`;
  }
  if (value.includes("transaction") || value.includes("concurr") || value.includes("serial")) {
    return `${opening} write the schedule in time order, mark read/write conflicts on the same item, add a graph edge from the earlier transaction to the later one, and check the graph for a cycle. A cycle means it is not conflict-serializable.${context} Send the first conflicting pair you found.`;
  }
  if (value.includes("er") || value.includes("schema") || value.includes("entity")) {
    return `${opening} identify entities and primary keys, add relationship cardinalities, convert strong entities to relations, place the foreign key on the many side for one-to-many relationships, and create a bridge relation for many-to-many relationships.${context} Send the entities and keys you selected.`;
  }
  if (value.includes("index") || value.includes("b tree") || value.includes("hash")) {
    return `${opening} identify the query predicate first. B-tree indexes support equality and range lookups; hash indexes are mainly useful for equality. Check selectivity and avoid indexing columns that change very frequently unless the read benefit is clear.${context} Share the query and the column you plan to index.`;
  }
  if (value.includes("deadlock") || value.includes("lock")) {
    return `${opening} draw a wait-for graph with one node per transaction. Add T1 -> T2 when T1 waits for a lock held by T2. A cycle indicates deadlock. Prevention options include a consistent lock order and shorter transactions.${context} Send the lock sequence you are analyzing.`;
  }
  if (value.includes("acid")) {
    return `${opening} map each property to a failure scenario: atomicity prevents partial transactions, consistency preserves rules, isolation limits interference, and durability preserves committed results.${context} Try explaining which property handles a crash after commit.`;
  }
  return `I can guide you locally without sending your work to an external service. Tell me the DBMS topic, the exact step where you are stuck, what you tried, and any error or unexpected result.${context}`;
}

async function findRecord(supabase, id) {
  const { data, error } = await supabase.from("learning_records").select("*").eq("id", id).limit(1);
  if (error) throw error;
  return data?.[0] || null;
}

async function refreshAssignmentCounts(supabase, assignmentId) {
  if (!assignmentId) return;
  const [{ data: assignments, error: assignmentError }, { data: submissions, error: submissionError }] = await Promise.all([
    supabase.from("assignments").select("*").eq("id", assignmentId).limit(1),
    supabase.from("learning_records").select("*").eq("kind", "submission").eq("assignment_id", assignmentId),
  ]);
  if (assignmentError) throw assignmentError;
  if (submissionError) throw submissionError;
  const assignment = assignments?.[0];
  if (!assignment) return;
  const submitted = (submissions || []).filter((record) => record.status !== "draft").length;
  const reviewed = (submissions || []).filter((record) => ["graded", "reviewed"].includes(record.status)).length;
  const { error } = await supabase.from("assignments").update({
    submitted,
    reviewed,
    pending: Math.max(0, Number(assignment.assigned || 0) - submitted),
  }).eq("id", assignmentId);
  if (error) throw error;
}

function canRead(record, actor) {
  if (actor.role !== "student") return true;
  if (record.kind === "question") return true;
  return record.author_id === actor.id;
}

function studentSafe(record, actor) {
  if (actor.role !== "student" || record.kind !== "question") return record;
  const { reference_answer: _answer, keywords: _keywords, ...safeMetadata } = metadata(record.metadata);
  return { ...record, metadata: safeMetadata };
}

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  try {
    const supabase = createSupabaseClient({ requirePrivileged: true });
    const actor = await requireUser(supabase, req);

    if (req.method === "GET") {
      const query = getQuery(req);
      if (query.kind === "submission" && query.summary === "1" && actor.role !== "student" && typeof supabase.rpc === "function") {
        const { data, error } = await supabase.rpc("kgr_submission_summary");
        if (error) throw error;
        return res.status(200).json({ records: data || [] });
      }
      let request = supabase.from("learning_records").select("*").order("created_at", { ascending: false });
      if (query.kind === "submission" && actor.role === "student") request = request.eq("author_id", actor.id);
      if (query.authorId && actor.role !== "student") request = request.eq("author_id", cleanText(query.authorId));
      if (query.kind) request = request.eq("kind", cleanText(query.kind));
      if (query.assignmentId) request = request.eq("assignment_id", cleanText(query.assignmentId));
      const [{ data, error }, { data: people, error: peopleError }] = await Promise.all([
        request,
        actor.role === "student"
          ? supabase.from("users").select("id,name,email,role,roll_number,batch,is_active").eq("id", actor.id)
          : supabase.from("users").select("id,name,email,role,roll_number,batch,is_active"),
      ]);
      if (error) throw error;
      if (peopleError) throw peopleError;
      return res.status(200).json({
        records: (data || []).filter((record) => canRead(record, actor)).map((record) => studentSafe(record, actor)),
        people: (people || []).filter((person) => person.is_active !== false),
        aiConfigured: false,
      });
    }

    if (!["POST", "PATCH", "DELETE"].includes(req.method)) return methodNotAllowed(res);
    const body = getBody(req);
    const action = cleanText(body.action);

    if (req.method === "POST" && action) {
      if (actor.role !== "faculty" && actor.role !== "admin") return res.status(403).json({ error: "Faculty access is required" });
      if (action === "submit_started") {
        const assignmentId = cleanText(body.assignmentId || body.assignment_id);
        if (!assignmentId) return res.status(400).json({ error: "Assignment id is required" });
        const { data, error } = await supabase.from("learning_records").update({ status: "submitted", updated_at: new Date().toISOString() }).eq("kind", "submission").eq("assignment_id", assignmentId).eq("status", "draft").select("*");
        if (error) throw error;
        await refreshAssignmentCounts(supabase, assignmentId);
        return res.status(200).json({ records: data || [], count: data?.length || 0 });
      }
      const record = await findRecord(supabase, cleanText(body.id));
      if (!record || record.kind !== "submission") return res.status(404).json({ error: "Submission not found" });

      if (action === "review") {
        const rubric = metadata(body.rubric);
        const score = Number(body.score);
        if (!Number.isFinite(score) || score < 0) return res.status(400).json({ error: "A valid score is required" });
        const nextMetadata = {
          ...metadata(record.metadata),
          rubric_scores: rubric,
          faculty_feedback: cleanText(body.feedback),
          reviewed_by: actor.id,
          reviewed_at: new Date().toISOString(),
        };
        const { data, error: updateError } = await supabase.from("learning_records").update({ score, status: "graded", metadata: nextMetadata, updated_at: new Date().toISOString() }).eq("id", record.id).select("*").single();
        if (updateError) throw updateError;
        await refreshAssignmentCounts(supabase, record.assignment_id);
        return res.status(200).json({ record: data });
      }

      if (action === "scan") {
        const { data: submissions, error } = await supabase.from("learning_records").select("*").eq("kind", "submission");
        if (error) throw error;
        const comparisons = (submissions || []).filter((item) => item.id !== record.id && item.assignment_id === record.assignment_id).map((item) => ({ id: item.id, score: similarity(record.body, item.body) }));
        const closest = comparisons.toSorted((left, right) => right.score - left.score)[0] || { id: null, score: 0 };
        const nextMetadata = { ...metadata(record.metadata), similarity_score: closest.score, similarity_match_id: closest.id, similarity_note: closest.score >= 60 ? "Review recommended" : "No strong text match found" };
        const { data, error: updateError } = await supabase.from("learning_records").update({ metadata: nextMetadata, updated_at: new Date().toISOString() }).eq("id", record.id).select("*").single();
        if (updateError) throw updateError;
        return res.status(200).json({ record: data });
      }

      if (action === "grade") {
        const { data: questions, error } = await supabase.from("learning_records").select("*").eq("kind", "question").eq("assignment_id", record.assignment_id);
        if (error) throw error;
        const answerWords = words(record.body);
        let possible = 0;
        let earned = 0;
        for (const question of questions || []) {
          const maxMarks = Number(question.score || 0);
          const keywords = Array.isArray(question.metadata?.keywords) ? question.metadata.keywords.map((item) => cleanText(item).toLowerCase()).filter(Boolean) : [];
          const matched = keywords.filter((keyword) => answerWords.has(keyword)).length;
          possible += maxMarks;
          earned += keywords.length > 0 ? maxMarks * (matched / keywords.length) : 0;
        }
        const score = possible > 0 ? Math.round(earned * 10) / 10 : 0;
        const nextMetadata = { ...metadata(record.metadata), auto_graded: true, auto_grade_possible: possible, auto_grade_summary: possible > 0 ? `Matched rubric keywords across ${questions.length} question${questions.length === 1 ? "" : "s"}. Faculty review is required.` : "No linked rubric questions were found." };
        const { data, error: updateError } = await supabase.from("learning_records").update({ score, status: "graded", metadata: nextMetadata, updated_at: new Date().toISOString() }).eq("id", record.id).select("*").single();
        if (updateError) throw updateError;
        await refreshAssignmentCounts(supabase, record.assignment_id);
        return res.status(200).json({ record: data });
      }
      return res.status(400).json({ error: "Unknown learning action" });
    }

    if (req.method === "POST") {
      const kind = cleanText(body.kind);
      if (!kinds.has(kind)) return res.status(400).json({ error: "Invalid learning record type" });
      if (kind === "question" && !["faculty", "admin"].includes(actor.role)) return res.status(403).json({ error: "Only faculty can add questions" });
      if (["submission", "chat"].includes(kind) && actor.role !== "student") return res.status(403).json({ error: "Only students can create this record" });

      if (kind === "chat") {
        const message = cleanText(body.message || body.body);
        if (!message) return res.status(400).json({ error: "A question is required" });
        const assignmentId = cleanText(body.assignmentId || body.assignment_id) || null;
        const [{ data: assignments }, { data: questions }] = await Promise.all([
          assignmentId ? supabase.from("assignments").select("*").eq("id", assignmentId).limit(1) : Promise.resolve({ data: [] }),
          assignmentId ? supabase.from("learning_records").select("*").eq("kind", "question").eq("assignment_id", assignmentId) : Promise.resolve({ data: [] }),
        ]);
        const reply = {
          answer: builtInTutor(message, assignments?.[0]?.title || "this assignment", (questions || []).map((item) => item.title)),
          model: "Built-in DBMS tutor",
        };
        const payload = {
          id: cleanText(body.id) || `learn-chat-${randomUUID()}`,
          kind,
          author_id: actor.id,
          subject_id: cleanText(body.subjectId || body.subject_id) || null,
          assignment_id: assignmentId,
          title: cleanText(body.title) || "Assignment support",
          body: message,
          status: "answered",
          score: null,
          metadata: { response: reply.answer, model: reply.model, assignment_title: assignments?.[0]?.title || "General assignment support" },
          updated_at: new Date().toISOString(),
        };
        const { data, error } = await supabase.from("learning_records").insert(payload).select("*").single();
        if (error) throw error;
        return res.status(201).json({ record: data });
      }

      const assignmentId = cleanText(body.assignmentId || body.assignment_id) || null;
      const id = cleanText(body.id) || (kind === "submission" ? `learn-submission-${assignmentId}-${actor.id}` : `learn-question-${randomUUID()}`);
      const existing = await findRecord(supabase, id);
      let submissionAssignment = null;
      if (kind === "submission") {
        if (actor.role === "student" && !["draft", "submitted"].includes(cleanText(body.status) || "submitted")) return res.status(400).json({ error: "Students can only save drafts or submit work" });
        if (!assignmentId) return res.status(400).json({ error: "Assignment id is required" });
        if (existing && existing.author_id !== actor.id) return res.status(403).json({ error: "You cannot modify this submission" });
        if (existing && existing.status !== "draft") return res.status(409).json({ error: "A submitted response cannot be changed" });
        const { data: assignmentRows, error: assignmentError } = await supabase.from("assignments").select("*").eq("id", assignmentId).limit(1);
        if (assignmentError) throw assignmentError;
        submissionAssignment = assignmentRows?.[0];
        if (!submissionAssignment) return res.status(404).json({ error: "Assignment not found" });
        const assignedIds = Array.isArray(submissionAssignment.assigned_user_ids) ? submissionAssignment.assigned_user_ids : [];
        if (assignedIds.length > 0 && !assignedIds.includes(actor.id)) return res.status(403).json({ error: "This assignment is not assigned to you" });
        const deadline = new Date(`${submissionAssignment.due_date}T18:29:59.999Z`);
        if (!Number.isNaN(deadline.getTime()) && Date.now() > deadline.getTime()) return res.status(409).json({ error: "The assignment deadline has passed" });
      }
      const submittedMetadata = metadata(body.metadata);
      let serverScore = kind === "submission" && submissionAssignment?.work_mode === "mcq" && cleanText(body.status) !== "draft"
        ? (Array.isArray(submissionAssignment.questions) ? submissionAssignment.questions : []).reduce((sum, question) => {
          const answer = submittedMetadata.answers?.[question.id];
          return sum + (Number.isInteger(answer) && answer === question.correctIndex ? Number(question.marks || 0) : 0);
        }, 0)
        : undefined;

      let finalStatus = cleanText(body.status) || existing?.status || (kind === "submission" ? "submitted" : "active");
      
      if (kind === "submission" && finalStatus === "submitted" && submissionAssignment?.work_mode !== "mcq" && process.env.GEMINI_API_KEY) {
        try {
          const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
          const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });
          const maxMarks = submissionAssignment.max_marks || 10;
          const expectedOutput = submissionAssignment.test_cases?.[0]?.output || "Not provided";
          const systemPrompt = `You are an expert Computer Science professor at KG Reddy College of Engineering and Technology.
Your task is to evaluate a student's submission for an assignment and grade it.
Assignment Details:
- Title: \${submissionAssignment.title}
- Description: \${submissionAssignment.description}
- Max Marks: \${maxMarks}
- Expected Output (if applicable): \${expectedOutput}
Student's Submission:
\\\`\\\`\\\`
\${cleanText(body.body) || existing?.body || ""}
\\\`\\\`\\\`
Evaluate the submission based on:
1. Correctness and completeness (Does it solve the problem?)
2. Structure and logic (Is the code/answer well-organized?)
3. Edge cases and quality (Did they handle potential issues?)
Respond with ONLY a valid JSON object matching this schema:
{
  "score": number, // Must be between 0 and \${maxMarks}
  "feedback": "string" // Constructive feedback for the student explaining the grade
}`;
          const result = await model.generateContent(systemPrompt);
          const evaluation = JSON.parse(result.response.text());
          serverScore = Math.max(0, Math.min(maxMarks, Number(evaluation.score) || 0));
          submittedMetadata.faculty_feedback = evaluation.feedback || "Graded automatically by AI.";
          submittedMetadata.auto_graded = true;
          finalStatus = "graded";
        } catch (evalError) {
          console.error("Failed to evaluate submission", evalError);
        }
      }

      const payload = {
        kind,
        author_id: existing?.author_id || actor.id,
        subject_id: submissionAssignment?.subject_id || cleanText(body.subjectId || body.subject_id) || existing?.subject_id || null,
        assignment_id: assignmentId || existing?.assignment_id || null,
        title: cleanText(body.title) || existing?.title || "",
        body: cleanText(body.body) || existing?.body || "",
        status: finalStatus,
        score: serverScore === undefined ? (actor.role === "student" ? existing?.score ?? null : (body.score === undefined ? existing?.score ?? null : Number(body.score))) : serverScore,
        metadata: { ...metadata(existing?.metadata), ...submittedMetadata },
        updated_at: new Date().toISOString(),
      };
      if (!payload.title || !payload.body) return res.status(400).json({ error: "Title and content are required" });
      if (payload.body.length > 100000) return res.status(413).json({ error: "Submission content is too large" });
      const result = existing
        ? await supabase.from("learning_records").update(payload).eq("id", id).select("*").single()
        : await supabase.from("learning_records").insert({ id, ...payload }).select("*").single();
      if (result.error) throw result.error;
      if (kind === "submission") await refreshAssignmentCounts(supabase, payload.assignment_id);
      return res.status(existing ? 200 : 201).json({ record: result.data });
    }

    const id = cleanText(body.id || getQuery(req).id);
    if (!id) return res.status(400).json({ error: "Learning record id is required" });
    const existing = await findRecord(supabase, id);
    if (!existing) return res.status(404).json({ error: "Learning record not found" });
    if (existing.kind === "submission" && actor.role === "student") return res.status(403).json({ error: "Use the validated submission workflow to save your work" });
    if (actor.role !== "admin" && existing.author_id !== actor.id && actor.role !== "faculty") return res.status(403).json({ error: "You cannot modify this record" });

    if (req.method === "PATCH") {
      const payload = {
        title: body.title === undefined ? existing.title : cleanText(body.title),
        body: body.body === undefined ? existing.body : cleanText(body.body),
        assignment_id: body.assignmentId === undefined && body.assignment_id === undefined ? existing.assignment_id : cleanText(body.assignmentId || body.assignment_id) || null,
        subject_id: body.subjectId === undefined && body.subject_id === undefined ? existing.subject_id : cleanText(body.subjectId || body.subject_id) || null,
        status: body.status === undefined ? existing.status : cleanText(body.status),
        score: body.score === undefined ? existing.score : Number(body.score),
        metadata: { ...metadata(existing.metadata), ...metadata(body.metadata) },
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase.from("learning_records").update(payload).eq("id", id).select("*").single();
      if (error) throw error;
      if (existing.kind === "submission") await refreshAssignmentCounts(supabase, existing.assignment_id);
      return res.status(200).json({ record: data });
    }

    const { data, error } = await supabase.from("learning_records").delete().eq("id", id).select("*").single();
    if (error) throw error;
    if (existing.kind === "submission") await refreshAssignmentCounts(supabase, existing.assignment_id);
    return res.status(200).json({ record: data });
  } catch (error) {
    return sendError(res, error, "Learning tools API failed");
  }
}
