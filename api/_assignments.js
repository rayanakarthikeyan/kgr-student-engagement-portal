import { randomUUID } from "node:crypto";
import { activityTemplates } from "../server/curriculum-templates.js";
import {
  cleanText,
  createSupabaseClient,
  getBody,
  getQuery,
  handleOptions,
  methodNotAllowed,
  requireUser,
  requireFields,
  sendError,
  setCors,
} from "./_shared.js";

const assignmentTypes = new Set(["theory", "practice", "assessment", "lab"]);
const workModes = new Set(["response", "mcq", "ide"]);
const courseCodes = new Set(["JAVA", "DBMS"]);

function createAssignmentId(title) {
  const slug = cleanText(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `act-${slug.slice(0, 70)}-${randomUUID()}`;
}

function toInteger(value, fallback = 0) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function toNumber(value, fallback = 0) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeAssignmentPayload(body, { partial = false } = {}) {
  const payload = {};
  if (!partial || body.title !== undefined)
    payload.title = cleanText(body.title);
  if (
    !partial ||
    body.subjectId !== undefined ||
    body.subject_id !== undefined
  ) {
    payload.subject_id = cleanText(body.subjectId || body.subject_id);
  }
  if (!partial || body.dueDate !== undefined || body.due_date !== undefined) {
    payload.due_date = cleanText(body.dueDate || body.due_date);
  }
  if (!partial || body.maxMarks !== undefined || body.max_marks !== undefined) {
    payload.max_marks = toNumber(body.maxMarks ?? body.max_marks, 10);
  }
  if (!partial || body.description !== undefined)
    payload.description = cleanText(body.description);
  if (
    !partial ||
    body.starterCode !== undefined ||
    body.starter_code !== undefined
  ) {
    payload.starter_code = cleanText(body.starterCode ?? body.starter_code);
  }
  if (
    !partial ||
    body.testCases !== undefined ||
    body.test_cases !== undefined
  ) {
    payload.test_cases = toArray(body.testCases ?? body.test_cases);
  }
  if (!partial || body.questions !== undefined)
    payload.questions = toArray(body.questions);
  if (!partial || body.hints !== undefined)
    payload.hints = toArray(body.hints)
      .map(cleanText)
      .filter(Boolean)
      .slice(0, 10);
  if (!partial || body.executionEnvironment !== undefined) {
    payload.execution_environment =
      body.executionEnvironment === "external" ? "external" : "runner";
  }
  if (!partial || body.workMode !== undefined || body.work_mode !== undefined) {
    const value = cleanText(body.workMode || body.work_mode).toLowerCase();
    if (!workModes.has(value))
      throw new Error("Work mode must be response, mcq, or ide");
    payload.work_mode = value;
  }
  if (
    !partial ||
    body.assignedUserIds !== undefined ||
    body.assigned_user_ids !== undefined
  ) {
    payload.assigned_user_ids = toArray(
      body.assignedUserIds ?? body.assigned_user_ids,
    )
      .map(cleanText)
      .filter(Boolean);
  }
  if (
    !partial ||
    body.assignmentType !== undefined ||
    body.assignment_type !== undefined
  ) {
    const value = cleanText(
      body.assignmentType || body.assignment_type,
    ).toLowerCase();
    if (!assignmentTypes.has(value))
      throw new Error(
        "Assignment type must be theory, practice, assessment, or lab",
      );
    payload.assignment_type = value;
  }
  if (
    !partial ||
    body.curriculumItemId !== undefined ||
    body.curriculum_item_id !== undefined
  ) {
    payload.curriculum_item_id = cleanText(
      body.curriculumItemId || body.curriculum_item_id,
    );
  }
  if (
    !partial ||
    body.courseCode !== undefined ||
    body.course_code !== undefined
  ) {
    const value = cleanText(body.courseCode || body.course_code).toUpperCase();
    if (!courseCodes.has(value))
      throw new Error("Course code must be JAVA or DBMS");
    payload.course_code = value;
  }
  if (
    !partial ||
    body.unitNumber !== undefined ||
    body.unit_number !== undefined
  ) {
    payload.unit_number = Math.min(
      5,
      Math.max(1, toInteger(body.unitNumber ?? body.unit_number, 1)),
    );
  }
  if (
    !partial ||
    body.durationMinutes !== undefined ||
    body.duration_minutes !== undefined
  ) {
    payload.duration_minutes = Math.min(
      480,
      Math.max(1, toInteger(body.durationMinutes ?? body.duration_minutes, 30)),
    );
  }
  if (body.assigned !== undefined) payload.assigned = toInteger(body.assigned);
  if (body.submitted !== undefined)
    payload.submitted = toInteger(body.submitted);
  if (body.pending !== undefined) payload.pending = toInteger(body.pending);
  if (body.reviewed !== undefined) payload.reviewed = toInteger(body.reviewed);

  Object.keys(payload).forEach((key) => {
    if (
      payload[key] === "" &&
      !["description", "starter_code", "curriculum_item_id"].includes(key)
    )
      delete payload[key];
  });

  return payload;
}

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  try {
    const supabase = createSupabaseClient({ requirePrivileged: true });
    const actor = await requireUser(supabase, req);

    if (req.method === "GET") {
      const query = getQuery(req);
      if (query.templates === "1") {
        if (!["faculty", "admin"].includes(actor.role))
          return res
            .status(403)
            .json({ error: "Templates are available to faculty only" });
        res.setHeader("Cache-Control", "private, no-store");
        return res.status(200).json({ templates: activityTemplates });
      }
      let request = supabase
        .from("assignments")
        .select("*, subjects(name,type,semester,section)")
        .order("due_date", { ascending: true });

      if (query.subjectId)
        request = request.eq("subject_id", cleanText(query.subjectId));
      if (query.subject_id)
        request = request.eq("subject_id", cleanText(query.subject_id));
      if (query.search)
        request = request.ilike("title", `%${cleanText(query.search)}%`);

      const { data, error } = await request;
      if (error) throw error;
      const assignments =
        actor.role === "student"
          ? (data || [])
              .filter((assignment) => {
                const assignedUserIds = Array.isArray(
                  assignment.assigned_user_ids,
                )
                  ? assignment.assigned_user_ids
                  : [];
                return (
                  assignedUserIds.length === 0 ||
                  assignedUserIds.includes(actor.id)
                );
              })
              .map((assignment) => ({
                ...assignment,
                questions: Array.isArray(assignment.questions)
                  ? assignment.questions.map(
                      ({ correctIndex: _correctIndex, ...question }) =>
                        question,
                    )
                  : [],
              }))
          : data || [];
      return res.status(200).json({ assignments });
    }

    if (!["POST", "PATCH", "DELETE"].includes(req.method)) {
      return methodNotAllowed(res);
    }

    if (!["admin", "faculty"].includes(actor.role)) {
      const error = new Error(
        "Only faculty or a Super Admin can manage assignments and quizzes",
      );
      error.statusCode = 403;
      throw error;
    }

    if (req.method === "POST") {
      const body = getBody(req);
      const missingTitle = requireFields(body, ["title"]);
      if (missingTitle) return res.status(400).json({ error: missingTitle });
      const missing = [];
      if (!cleanText(body.subjectId || body.subject_id))
        missing.push("subjectId");
      if (!cleanText(body.dueDate || body.due_date)) missing.push("dueDate");
      if (missing.length > 0) {
        return res
          .status(400)
          .json({ error: `Missing required fields: ${missing.join(", ")}` });
      }

      const payload = normalizeAssignmentPayload(body);
      const validationError = validateAssignment(payload);
      if (validationError)
        return res.status(400).json({ error: validationError });
      payload.id = cleanText(body.id) || createAssignmentId(payload.title);
      payload.assigned = toInteger(body.assigned);
      payload.submitted = toInteger(body.submitted);
      payload.pending = toInteger(body.pending);
      payload.reviewed = toInteger(body.reviewed);

      const { data, error } = await supabase
        .from("assignments")
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      return res.status(201).json({ assignment: data });
    }

    const body = getBody(req);
    const id = cleanText(body.id || getQuery(req).id);
    if (!id)
      return res.status(400).json({ error: "Assignment id is required" });

    if (req.method === "PATCH") {
      const payload = normalizeAssignmentPayload(body, { partial: true });
      delete payload.id;
      if (Object.keys(payload).length === 0) {
        return res.status(400).json({ error: "No assignment fields provided" });
      }
      const { data: existing, error: readError } = await supabase
        .from("assignments")
        .select("*")
        .eq("id", id)
        .single();
      if (readError) throw readError;
      if (!existing)
        return res.status(404).json({ error: "Assignment not found" });
      const { data: attempts, error: attemptError } = await supabase
        .from("learning_records")
        .select("id")
        .eq("assignment_id", id)
        .limit(1);
      if (attemptError) throw attemptError;
      if (attempts?.length)
        return res
          .status(409)
          .json({
            error:
              "Students have started this assignment. Publish a new copy to change it.",
          });
      const merged = { ...existing, ...payload };
      const validationError = validateAssignment(merged);
      if (validationError)
        return res.status(400).json({ error: validationError });
      payload.max_marks = merged.max_marks;

      const { data, error } = await supabase
        .from("assignments")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return res.status(200).json({ assignment: data });
    }

    const { data, error } = await supabase
      .from("assignments")
      .delete()
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return res.status(200).json({ assignment: data });
  } catch (error) {
    return sendError(res, error, "Assignments API failed");
  }
}

function validateAssignment(payload) {
  // Empty assigned_user_ids means "all students" (current and future).
  // No validation needed on the list itself.
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(payload.due_date || "") ||
    !Number.isFinite(Date.parse(payload.due_date))
  )
    return "A valid deadline is required";
  if (payload.assignment_type === "theory")
    return "Assign theory links through Theory resources";
  if (payload.assignment_type === "assessment" && payload.work_mode !== "mcq")
    return "Assessments currently support proctored MCQs";
  if (payload.work_mode === "mcq") {
    const qs = payload.questions;
    if (!Array.isArray(qs) || qs.length < 1 || qs.length > 100)
      return "Add 1-100 questions";
    if (new Set(qs.map((q) => q?.id)).size !== qs.length)
      return "Question IDs must be unique";
    if (
      qs.some(
        (q) =>
          !q ||
          !cleanText(q.id) ||
          !cleanText(q.prompt) ||
          !Array.isArray(q.options) ||
          q.options.length !== 4 ||
          q.options.some((o) => !cleanText(o)) ||
          !Number.isInteger(q.correctIndex) ||
          q.correctIndex < 0 ||
          q.correctIndex > 3 ||
          !Number.isFinite(q.marks) ||
          q.marks <= 0,
      )
    )
      return "Complete each question, four options, correct answer and marks";
    payload.max_marks = qs.reduce((sum, q) => sum + q.marks, 0);
  } else if (!payload.test_cases?.[0]?.output?.trim())
    return "Add expected output or expected observations";
  return null;
}
