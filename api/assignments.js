import { randomUUID } from "node:crypto";
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

function createAssignmentId(title) {
  const slug = cleanText(title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `act-${slug || randomUUID()}`;
}

function toInteger(value, fallback = 0) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function normalizeAssignmentPayload(body, { partial = false } = {}) {
  const payload = {};
  if (!partial || body.title !== undefined) payload.title = cleanText(body.title);
  if (!partial || body.subjectId !== undefined || body.subject_id !== undefined) {
    payload.subject_id = cleanText(body.subjectId || body.subject_id);
  }
  if (!partial || body.dueDate !== undefined || body.due_date !== undefined) {
    payload.due_date = cleanText(body.dueDate || body.due_date);
  }
  if (body.assigned !== undefined) payload.assigned = toInteger(body.assigned);
  if (body.submitted !== undefined) payload.submitted = toInteger(body.submitted);
  if (body.pending !== undefined) payload.pending = toInteger(body.pending);
  if (body.reviewed !== undefined) payload.reviewed = toInteger(body.reviewed);

  Object.keys(payload).forEach((key) => {
    if (payload[key] === "") delete payload[key];
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
      let request = supabase
        .from("assignments")
        .select("*, subjects(name,type,semester,section)")
        .order("due_date", { ascending: true });

      if (query.subjectId) request = request.eq("subject_id", cleanText(query.subjectId));
      if (query.subject_id) request = request.eq("subject_id", cleanText(query.subject_id));
      if (query.search) request = request.ilike("title", `%${cleanText(query.search)}%`);

      const { data, error } = await request;
      if (error) throw error;
      return res.status(200).json({ assignments: data || [] });
    }

    if (!["POST", "PATCH", "DELETE"].includes(req.method)) {
      return methodNotAllowed(res);
    }

    if (!["admin", "faculty"].includes(actor.role)) {
      const error = new Error("Only faculty or a Super Admin can manage assignments and quizzes");
      error.statusCode = 403;
      throw error;
    }

    if (req.method === "POST") {
      const body = getBody(req);
      const missingTitle = requireFields(body, ["title"]);
      if (missingTitle) return res.status(400).json({ error: missingTitle });
      const missing = [];
      if (!cleanText(body.subjectId || body.subject_id)) missing.push("subjectId");
      if (!cleanText(body.dueDate || body.due_date)) missing.push("dueDate");
      if (missing.length > 0) {
        return res.status(400).json({ error: `Missing required fields: ${missing.join(", ")}` });
      }

      const payload = normalizeAssignmentPayload(body);
      payload.id = cleanText(body.id) || createAssignmentId(payload.title);
      payload.assigned = toInteger(body.assigned);
      payload.submitted = toInteger(body.submitted);
      payload.pending = toInteger(body.pending);
      payload.reviewed = toInteger(body.reviewed);

      const { data, error } = await supabase.from("assignments").insert(payload).select("*").single();
      if (error) throw error;
      return res.status(201).json({ assignment: data });
    }

    const body = getBody(req);
    const id = cleanText(body.id || getQuery(req).id);
    if (!id) return res.status(400).json({ error: "Assignment id is required" });

    if (req.method === "PATCH") {
      const payload = normalizeAssignmentPayload(body, { partial: true });
      delete payload.id;
      if (Object.keys(payload).length === 0) {
        return res.status(400).json({ error: "No assignment fields provided" });
      }

      const { data, error } = await supabase.from("assignments").update(payload).eq("id", id).select("*").single();
      if (error) throw error;
      return res.status(200).json({ assignment: data });
    }

    const { data, error } = await supabase.from("assignments").delete().eq("id", id).select("*").single();
    if (error) throw error;
    return res.status(200).json({ assignment: data });
  } catch (error) {
    return sendError(res, error, "Assignments API failed");
  }
}
