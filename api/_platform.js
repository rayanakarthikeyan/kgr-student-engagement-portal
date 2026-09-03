import { createHash, randomUUID } from "node:crypto";
import { cleanText, createSupabaseClient, getBody, getQuery, handleOptions, methodNotAllowed, requireFields, requireUser, sendError, setCors } from "./_shared.js";

const activityKinds = new Set([
  "video_play", "video_pause", "video_progress", "video_complete", "pdf_dwell",
  "exam_started", "exam_violation", "exam_autosave", "exam_submitted",
  "editor_change", "editor_paste", "code_run", "code_submit",
]);
const bucketedActivityKinds = new Set(["video_progress", "pdf_dwell", "exam_autosave", "editor_change"]);

const entityTables = {
  enrollment: "enrollments",
  resource: "resources",
  assessment: "assessments",
  submission: "submissions",
  activity: "activity_logs",
};

function metadata(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function tableFor(entity) {
  return entityTables[entity] || null;
}

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  try {
    const query = getQuery(req);
    const body = getBody(req);
    const entity = cleanText(query.entity || body.entity);
    const table = tableFor(entity);
    if (!table) return res.status(400).json({ error: "A valid platform entity is required" });

    const supabase = createSupabaseClient({ requirePrivileged: true });
    const actor = await requireUser(supabase, req);

    if (req.method === "GET") {
      if (entity === "activity" && query.summary === "1" && actor.role !== "student" && typeof supabase.rpc === "function") {
        const { data, error } = await supabase.rpc("kgr_activity_summary");
        if (error) throw error;
        return res.status(200).json({ activity_logs: data || [] });
      }
      let request = supabase.from(table).select("*").order("created_at", { ascending: false });
      if (entity === "enrollment" && actor.role === "student") request = request.eq("user_id", actor.id);
      if (entity === "submission" && actor.role === "student") request = request.eq("user_id", actor.id);
      if (entity === "activity" && actor.role === "student") request = request.eq("user_id", actor.id);
      if (entity === "resource" && actor.role === "student") request = request.eq("is_published", true);
      if (query.courseId) request = request.eq("course_id", cleanText(query.courseId));
      if (query.resourceId) request = request.eq("resource_id", cleanText(query.resourceId));
      if (query.assessmentId) request = request.eq("assessment_id", cleanText(query.assessmentId));
      const { data, error } = await request;
      if (error) throw error;
      const rows = entity === "resource" && actor.role === "student"
        ? (data || []).filter((resource) => {
          const assignedUserIds = Array.isArray(resource.assigned_user_ids) ? resource.assigned_user_ids : [];
          return assignedUserIds.length === 0 || assignedUserIds.includes(actor.id);
        })
        : data || [];
      return res.status(200).json({ [table]: rows });
    }

    if (req.method === "POST") {
      const now = new Date().toISOString();
      if (entity === "activity") {
        const kind = cleanText(body.kind);
        if (!activityKinds.has(kind)) return res.status(400).json({ error: "Invalid activity kind" });
        const assignmentId = cleanText(body.assignmentId) || null;
        const aggregateKey = [
          actor.id,
          kind,
          cleanText(body.resourceId),
          cleanText(body.assessmentId),
          assignmentId || cleanText(body.metadata?.challengeId),
          cleanText(body.courseId),
          now.slice(0, 13),
        ].join("|");
        const bucketed = bucketedActivityKinds.has(kind);
        const payload = {
          id: bucketed ? `log-bucket-${createHash("sha256").update(aggregateKey).digest("hex").slice(0, 32)}` : `log-${randomUUID()}`,
          user_id: actor.id,
          course_id: cleanText(body.courseId) || null,
          resource_id: cleanText(body.resourceId) || null,
          assessment_id: cleanText(body.assessmentId) || null,
          assignment_id: assignmentId,
          submission_id: cleanText(body.submissionId) || null,
          kind,
          duration_seconds: Math.max(0, Math.min(3600, Number(body.durationSeconds) || 0)),
          metadata: metadata(body.metadata),
          occurred_at: now,
        };
        if (bucketed) {
          const { data: existingRows, error: readError } = await supabase.from(table).select("*").eq("id", payload.id).limit(1);
          if (readError) throw readError;
          const existing = existingRows?.[0];
          if (existing) {
            const update = {
              duration_seconds: Math.min(3600, Number(existing.duration_seconds || 0) + payload.duration_seconds),
              metadata: {
                ...metadata(existing.metadata),
                ...payload.metadata,
                sampleCount: Number(existing.metadata?.sampleCount || 1) + 1,
                bucketHour: now.slice(0, 13),
              },
              occurred_at: now,
            };
            const { data, error } = await supabase.from(table).update(update).eq("id", payload.id).select("*").single();
            if (error) throw error;
            return res.status(200).json({ activity: data, aggregated: true });
          }
          payload.metadata = { ...payload.metadata, sampleCount: 1, bucketHour: now.slice(0, 13) };
        }
        const { data, error } = await supabase.from(table).insert(payload).select("*").single();
        if (error) throw error;
        return res.status(201).json({ activity: data, aggregated: bucketed });
      }

      if (entity === "enrollment") {
        if (actor.role !== "student") return res.status(403).json({ error: "Only students can self-enroll" });
        const missing = requireFields(body, ["courseId"]);
        if (missing) return res.status(400).json({ error: missing });
        const courseId = cleanText(body.courseId);
        const { data: existing, error: existingError } = await supabase.from(table).select("*").eq("user_id", actor.id).eq("course_id", courseId).limit(1);
        if (existingError) throw existingError;
        if (existing?.length) return res.status(200).json({ enrollment: existing[0] });
        const payload = { id: `enr-${randomUUID()}`, user_id: actor.id, course_id: courseId, tracks: Array.isArray(body.tracks) ? body.tracks : ["theory", "lab"], progress: 0, study_minutes: 0, status: "active", created_at: now, updated_at: now };
        const { data, error } = await supabase.from(table).insert(payload).select("*").single();
        if (error) throw error;
        return res.status(201).json({ enrollment: data });
      }

      if (entity === "resource" || entity === "assessment") {
        if (!['faculty', 'admin'].includes(actor.role)) return res.status(403).json({ error: "Faculty access is required" });
        const required = entity === "resource" ? ["courseId", "title", "type", "externalUrl"] : ["courseId", "title", "durationMinutes"];
        const missing = requireFields(body, required);
        if (missing) return res.status(400).json({ error: missing });
        const payload = entity === "resource"
          ? { id: `res-${randomUUID()}`, course_id: cleanText(body.courseId), created_by: actor.id, title: cleanText(body.title), topic: cleanText(body.topic), type: cleanText(body.type), external_url: cleanText(body.externalUrl), duration_minutes: Number(body.durationMinutes) || 0, curriculum_item_id: cleanText(body.curriculumItemId), course_code: cleanText(body.courseCode).toUpperCase(), unit_number: Math.min(5, Math.max(1, Number(body.unitNumber) || 1)), due_date: cleanText(body.dueDate) || null, assigned_user_ids: Array.isArray(body.assignedUserIds) ? body.assignedUserIds.map(cleanText).filter(Boolean) : [], is_published: body.isPublished !== false, created_at: now, updated_at: now }
          : { id: `asm-${randomUUID()}`, course_id: cleanText(body.courseId), created_by: actor.id, title: cleanText(body.title), description: cleanText(body.description), duration_minutes: Number(body.durationMinutes), total_marks: Number(body.totalMarks) || 0, starts_at: body.startsAt || null, ends_at: body.endsAt || null, status: cleanText(body.status) || "draft", settings: metadata(body.settings), questions: Array.isArray(body.questions) ? body.questions : [], created_at: now, updated_at: now };
        const { data, error } = await supabase.from(table).insert(payload).select("*").single();
        if (error) throw error;
        return res.status(201).json({ [entity]: data });
      }

      if (entity === "submission") {
        if (actor.role !== "student") return res.status(403).json({ error: "Only students can create submissions" });
        const missing = requireFields(body, ["assessmentId"]);
        if (missing) return res.status(400).json({ error: missing });
        const payload = { id: `sub-${randomUUID()}`, assessment_id: cleanText(body.assessmentId), user_id: actor.id, answers: metadata(body.answers), code: cleanText(body.code), language: cleanText(body.language) || null, status: cleanText(body.status) || "submitted", score: body.score === undefined ? null : Number(body.score), violation_count: Number(body.violationCount) || 0, submitted_at: now, created_at: now, updated_at: now };
        const { data, error } = await supabase.from(table).insert(payload).select("*").single();
        if (error) throw error;
        return res.status(201).json({ submission: data });
      }
    }

    if (!['PATCH', 'DELETE'].includes(req.method)) return methodNotAllowed(res);
    if (!['faculty', 'admin'].includes(actor.role)) return res.status(403).json({ error: "Faculty access is required" });
    if (!['resource', 'assessment'].includes(entity)) return res.status(403).json({ error: "This entity cannot be modified here" });
    const id = cleanText(body.id || query.id);
    if (!id) return res.status(400).json({ error: "Entity id is required" });
    if (req.method === "DELETE") {
      const { data, error } = await supabase.from(table).delete().eq("id", id).select("*").single();
      if (error) throw error;
      return res.status(200).json({ [entity]: data });
    }
    const allowed = entity === "resource"
      ? { title: body.title, topic: body.topic, external_url: body.externalUrl, duration_minutes: body.durationMinutes, curriculum_item_id: body.curriculumItemId, course_code: body.courseCode, unit_number: body.unitNumber, due_date: body.dueDate, assigned_user_ids: body.assignedUserIds, is_published: body.isPublished }
      : { title: body.title, description: body.description, duration_minutes: body.durationMinutes, total_marks: body.totalMarks, starts_at: body.startsAt, ends_at: body.endsAt, status: body.status, settings: body.settings, questions: body.questions };
    const payload = Object.fromEntries(Object.entries(allowed).filter(([, value]) => value !== undefined));
    payload.updated_at = new Date().toISOString();
    const { data, error } = await supabase.from(table).update(payload).eq("id", id).select("*").single();
    if (error) throw error;
    return res.status(200).json({ [entity]: data });
  } catch (error) {
    return sendError(res, error, "Platform API failed");
  }
}
