import { randomUUID } from "node:crypto";
import {
  assertSubjectType,
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

function createSubjectId(name) {
  const slug = cleanText(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `sub-${slug || randomUUID()}`;
}

function normalizeSubjectPayload(body, { partial = false } = {}) {
  const payload = {};
  if (!partial || body.name !== undefined) payload.name = cleanText(body.name);
  if (!partial || body.type !== undefined) {
    payload.type = cleanText(body.type);
    assertSubjectType(payload.type);
  }
  if (!partial || body.semester !== undefined)
    payload.semester = cleanText(body.semester);
  if (!partial || body.section !== undefined)
    payload.section = cleanText(body.section);
  if (body.department !== undefined)
    payload.department = cleanText(body.department);
  if (body.academicYear !== undefined)
    payload.academic_year = cleanText(body.academicYear);
  if (body.academic_year !== undefined)
    payload.academic_year = cleanText(body.academic_year);
  if (body.isActive !== undefined) payload.is_active = Boolean(body.isActive);
  if (body.is_active !== undefined) payload.is_active = Boolean(body.is_active);

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
        .from("subjects")
        .select("*")
        .order("name", { ascending: true });

      if (query.type) request = request.eq("type", cleanText(query.type));
      if (query.semester)
        request = request.eq("semester", cleanText(query.semester));
      if (query.section)
        request = request.eq("section", cleanText(query.section));
      if (query.search)
        request = request.ilike("name", `%${cleanText(query.search)}%`);

      const { data, error } = await request;
      if (error) throw error;
      return res.status(200).json({ subjects: data || [] });
    }

    if (!["POST", "PATCH", "DELETE"].includes(req.method)) {
      return methodNotAllowed(res);
    }

    if (!["admin", "faculty"].includes(actor.role)) {
      const error = new Error(
        "Only faculty or a Super Admin can manage student groups",
      );
      error.statusCode = 403;
      throw error;
    }

    if (req.method === "POST") {
      const body = getBody(req);
      const missing = requireFields(body, [
        "name",
        "type",
        "semester",
        "section",
      ]);
      if (missing) return res.status(400).json({ error: missing });

      const payload = normalizeSubjectPayload(body);
      payload.id = cleanText(body.id) || createSubjectId(payload.name);
      payload.is_active =
        body.isActive === undefined && body.is_active === undefined
          ? true
          : Boolean(payload.is_active);

      const { data, error } = await supabase
        .from("subjects")
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      return res.status(201).json({ subject: data });
    }

    const body = getBody(req);
    const id = cleanText(body.id || getQuery(req).id);
    if (!id) return res.status(400).json({ error: "Subject id is required" });

    if (req.method === "PATCH") {
      const payload = normalizeSubjectPayload(body, { partial: true });
      delete payload.id;
      if (Object.keys(payload).length === 0) {
        return res.status(400).json({ error: "No subject fields provided" });
      }

      const { data, error } = await supabase
        .from("subjects")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return res.status(200).json({ subject: data });
    }

    const { data, error } = await supabase
      .from("subjects")
      .delete()
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return res.status(200).json({ subject: data });
  } catch (error) {
    return sendError(res, error, "Subjects API failed");
  }
}
