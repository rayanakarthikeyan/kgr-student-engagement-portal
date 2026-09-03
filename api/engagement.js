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

const kinds = new Set([
  "help_request",
  "check_in",
  "feedback",
  "reminder",
  "announcement",
  "announcement_ack",
  "pulse",
  "pulse_response",
  "office_slot",
  "office_booking",
  "journal",
  "recognition",
  "discussion",
  "discussion_reply",
  "goal",
  "time_session",
]);

const studentCreateKinds = new Set([
  "help_request",
  "check_in",
  "announcement_ack",
  "pulse_response",
  "office_booking",
  "journal",
  "discussion",
  "discussion_reply",
  "goal",
  "time_session",
]);

const facultyCreateKinds = new Set([
  "feedback",
  "reminder",
  "announcement",
  "pulse",
  "office_slot",
  "recognition",
  "discussion",
  "discussion_reply",
  "goal",
  "time_session",
]);

function cleanMetadata(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function canCreate(actor, kind) {
  if (actor.role === "admin") return true;
  if (actor.role === "faculty") return facultyCreateKinds.has(kind);
  return studentCreateKinds.has(kind);
}

function canRead(record, actor) {
  if (actor.role === "admin") return true;
  if (record.author_id === actor.id || record.target_user_id === actor.id) return true;

  if (actor.role === "faculty") {
    if (record.kind === "journal") return record.metadata?.share_with_faculty === true;
    return true;
  }

  return ["announcement", "pulse", "office_slot", "discussion", "discussion_reply", "goal"].includes(record.kind);
}

function canUpdate(record, actor) {
  if (actor.role === "admin" || record.author_id === actor.id) return true;
  if (actor.role === "faculty" && ["help_request", "office_booking", "discussion_reply"].includes(record.kind)) return true;
  return record.target_user_id === actor.id && ["feedback", "reminder", "recognition"].includes(record.kind);
}

function normalizeRecord(body, actor, existing) {
  const metadata = { ...(existing?.metadata || {}), ...cleanMetadata(body.metadata) };
  return {
    kind: cleanText(body.kind || existing?.kind),
    author_id: existing?.author_id || actor.id,
    target_user_id: cleanText(body.targetUserId ?? body.target_user_id ?? existing?.target_user_id) || null,
    subject_id: cleanText(body.subjectId ?? body.subject_id ?? existing?.subject_id) || null,
    assignment_id: cleanText(body.assignmentId ?? body.assignment_id ?? existing?.assignment_id) || null,
    title: cleanText(body.title ?? existing?.title),
    body: cleanText(body.body ?? existing?.body),
    status: cleanText(body.status ?? existing?.status) || "open",
    metadata,
    updated_at: new Date().toISOString(),
  };
}

async function findRecord(supabase, id) {
  const { data, error } = await supabase.from("engagement_records").select("*").eq("id", id).limit(1);
  if (error) throw error;
  return data?.[0] || null;
}

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  try {
    const supabase = createSupabaseClient({ requirePrivileged: true });
    const actor = await requireUser(supabase, req);

    if (req.method === "GET") {
      const query = getQuery(req);
      let request = supabase.from("engagement_records").select("*").order("created_at", { ascending: false });
      if (query.kind) request = request.eq("kind", cleanText(query.kind));

      const [{ data, error }, { data: users, error: usersError }] = await Promise.all([
        request,
        supabase.from("users").select("id,name,role,is_active"),
      ]);
      if (error) throw error;
      if (usersError) throw usersError;

      return res.status(200).json({
        records: (data || []).filter((record) => canRead(record, actor)),
        people: (users || []).filter((user) => user.is_active !== false),
      });
    }

    if (!['POST', 'PATCH', 'DELETE'].includes(req.method)) return methodNotAllowed(res);

    const body = getBody(req);
    const id = cleanText(body.id || getQuery(req).id);

    if (req.method === "POST") {
      const kind = cleanText(body.kind);
      if (!kinds.has(kind)) return res.status(400).json({ error: "Invalid engagement record type" });
      if (!canCreate(actor, kind)) return res.status(403).json({ error: "Your role cannot create this record" });

      const recordId = id || `eng-${kind}-${randomUUID()}`;
      const existing = await findRecord(supabase, recordId);
      const payload = normalizeRecord({ ...body, kind }, actor, existing);

      if (["feedback", "reminder", "recognition"].includes(kind) && !payload.target_user_id) {
        return res.status(400).json({ error: "A student is required" });
      }

      if (kind === "time_session") {
        const delta = Math.min(60, Math.max(0, Number(body.metadata?.delta_seconds) || 0));
        payload.metadata.active_seconds = Number(existing?.metadata?.active_seconds || 0) + delta;
        payload.metadata.last_seen_at = new Date().toISOString();
        payload.status = "active";
      }

      if (existing) {
        if (existing.author_id !== actor.id) return res.status(403).json({ error: "Record belongs to another user" });
        const { data, error } = await supabase.from("engagement_records").update(payload).eq("id", recordId).select("*").single();
        if (error) throw error;
        return res.status(200).json({ record: data });
      }

      const { data, error } = await supabase
        .from("engagement_records")
        .insert({ id: recordId, ...payload })
        .select("*")
        .single();
      if (error) throw error;
      return res.status(201).json({ record: data });
    }

    if (!id) return res.status(400).json({ error: "Record id is required" });
    const existing = await findRecord(supabase, id);
    if (!existing) return res.status(404).json({ error: "Record not found" });
    if (!canUpdate(existing, actor)) return res.status(403).json({ error: "You cannot update this record" });

    if (req.method === "PATCH") {
      const payload = normalizeRecord(body, actor, existing);
      payload.kind = existing.kind;
      payload.author_id = existing.author_id;
      const { data, error } = await supabase.from("engagement_records").update(payload).eq("id", id).select("*").single();
      if (error) throw error;
      return res.status(200).json({ record: data });
    }

    if (actor.role !== "admin" && existing.author_id !== actor.id) {
      return res.status(403).json({ error: "You cannot delete this record" });
    }
    const { data, error } = await supabase.from("engagement_records").delete().eq("id", id).select("*").single();
    if (error) throw error;
    return res.status(200).json({ record: data });
  } catch (error) {
    return sendError(res, error, "Engagement API failed");
  }
}
