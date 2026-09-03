import { randomUUID } from "node:crypto";
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

  if (value.includes("normal") || value.includes("bcnf") || value.includes("3nf")) {
    return `Start by listing every functional dependency, then identify each candidate key. Check 3NF dependency by dependency before testing whether every determinant is a superkey for BCNF.${context} Try one decomposition step and send me the resulting relations.`;
  }
  if (value.includes("sql") || value.includes("join") || value.includes("query")) {
    return `Break the query into four parts: required columns, source tables, join conditions, and filters. Write the smallest working SELECT first, then add grouping or ordering.${context} Share your current query and the result you expected.`;
  }
  if (value.includes("transaction") || value.includes("concurr") || value.includes("serial")) {
    return `Write the schedule in time order and mark every conflicting read/write pair. Build the precedence graph; a cycle means the schedule is not conflict-serializable.${context} Tell me which two operations you think conflict first.`;
  }
  if (value.includes("er") || value.includes("schema") || value.includes("entity")) {
    return `List the entities and their identifiers first. Add relationships with cardinality, then convert each entity and many-to-many relationship into relations.${context} Start by naming the entities and primary keys you selected.`;
  }
  return `I can guide you without completing the assignment for you. Tell me the exact step where you are stuck, what you already tried, and any error or unexpected result.${context}`;
}

async function tutorReply(message, assignment, questions) {
  const fallback = builtInTutor(message, assignment?.title || "this assignment", questions.map((item) => item.title));
  if (!process.env.OPENAI_API_KEY) return { answer: fallback, model: "Built-in DBMS tutor" };

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5-mini",
        store: false,
        instructions: "You are a concise academic support tutor. Guide the student with hints, checks, and next steps. Do not provide a complete ready-to-submit answer. Focus only on the supplied assignment context.",
        input: `Assignment: ${assignment?.title || "General assignment support"}\nAvailable question topics: ${questions.map((item) => item.title).join(", ") || "None"}\nStudent: ${message}`,
        max_output_tokens: 450,
      }),
    });
    if (!response.ok) return { answer: fallback, model: "Built-in DBMS tutor" };
    const data = await response.json();
    return { answer: cleanText(data.output_text) || fallback, model: process.env.OPENAI_MODEL || "gpt-5-mini" };
  } catch {
    return { answer: fallback, model: "Built-in DBMS tutor" };
  }
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
  const submitted = submissions?.length || 0;
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
      let request = supabase.from("learning_records").select("*").order("created_at", { ascending: false });
      if (query.kind) request = request.eq("kind", cleanText(query.kind));
      if (query.assignmentId) request = request.eq("assignment_id", cleanText(query.assignmentId));
      const [{ data, error }, { data: people, error: peopleError }] = await Promise.all([
        request,
        supabase.from("users").select("id,name,email,role,is_active"),
      ]);
      if (error) throw error;
      if (peopleError) throw peopleError;
      return res.status(200).json({
        records: (data || []).filter((record) => canRead(record, actor)).map((record) => studentSafe(record, actor)),
        people: (people || []).filter((person) => person.is_active !== false),
        aiConfigured: Boolean(process.env.OPENAI_API_KEY),
      });
    }

    if (!["POST", "PATCH", "DELETE"].includes(req.method)) return methodNotAllowed(res);
    const body = getBody(req);
    const action = cleanText(body.action);

    if (req.method === "POST" && action) {
      if (actor.role !== "faculty" && actor.role !== "admin") return res.status(403).json({ error: "Faculty access is required" });
      const record = await findRecord(supabase, cleanText(body.id));
      if (!record || record.kind !== "submission") return res.status(404).json({ error: "Submission not found" });

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
        const reply = await tutorReply(message, assignments?.[0], questions || []);
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
      const payload = {
        kind,
        author_id: existing?.author_id || actor.id,
        subject_id: cleanText(body.subjectId || body.subject_id) || existing?.subject_id || null,
        assignment_id: assignmentId || existing?.assignment_id || null,
        title: cleanText(body.title) || existing?.title || "",
        body: cleanText(body.body) || existing?.body || "",
        status: cleanText(body.status) || existing?.status || (kind === "submission" ? "submitted" : "active"),
        score: body.score === undefined ? existing?.score ?? null : Number(body.score),
        metadata: { ...metadata(existing?.metadata), ...metadata(body.metadata) },
        updated_at: new Date().toISOString(),
      };
      if (!payload.title || !payload.body) return res.status(400).json({ error: "Title and content are required" });
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
    if (actor.role !== "admin" && existing.author_id !== actor.id && actor.role !== "faculty") return res.status(403).json({ error: "You cannot modify this record" });

    if (req.method === "PATCH") {
      const payload = {
        title: body.title === undefined ? existing.title : cleanText(body.title),
        body: body.body === undefined ? existing.body : cleanText(body.body),
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
