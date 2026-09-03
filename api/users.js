import { randomUUID } from "node:crypto";
import {
  assertRole,
  cleanEmail,
  cleanText,
  createSupabaseClient,
  getBody,
  getQuery,
  handleOptions,
  methodNotAllowed,
  requireAdmin,
  requireFields,
  safeUser,
  sendError,
  setCors,
} from "./_shared.js";

function createUserId(role) {
  return `u-${role}-${randomUUID()}`;
}

function normalizeUserPayload(body, { partial = false } = {}) {
  const payload = {};

  if (!partial || body.name !== undefined) payload.name = cleanText(body.name);
  if (!partial || body.email !== undefined) payload.email = cleanEmail(body.email);
  if (!partial || body.role !== undefined) {
    payload.role = cleanText(body.role);
    assertRole(payload.role);
  }
  if (!partial || body.title !== undefined) payload.title = cleanText(body.title);
  if (!partial || body.password !== undefined) payload.password = cleanText(body.password);
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
    const readClient = createSupabaseClient();

    if (req.method === "GET") {
      const query = getQuery(req);
      let request = readClient
        .from("users")
        .select("id,name,email,role,title,is_active,created_at")
        .order("created_at", { ascending: false });

      if (query.role) request = request.eq("role", cleanText(query.role));
      if (query.search) {
        const search = cleanText(query.search);
        request = request.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { data, error } = await request;
      if (error) throw error;
      return res.status(200).json({ users: data || [] });
    }

    if (!["POST", "PATCH", "DELETE"].includes(req.method)) {
      return methodNotAllowed(res);
    }

    const supabase = createSupabaseClient({ requirePrivileged: true });
    await requireAdmin(supabase, req);

    if (req.method === "POST") {
      const body = getBody(req);
      const missing = requireFields(body, ["name", "email", "password", "role"]);
      if (missing) return res.status(400).json({ error: missing });

      const payload = normalizeUserPayload(body);
      payload.id = cleanText(body.id) || createUserId(payload.role);
      payload.is_active = body.isActive === undefined && body.is_active === undefined ? true : Boolean(payload.is_active);

      const { data, error } = await supabase
        .from("users")
        .insert(payload)
        .select("id,name,email,role,title,is_active,created_at")
        .single();

      if (error) throw error;
      return res.status(201).json({ user: data });
    }

    const body = getBody(req);
    const id = cleanText(body.id || getQuery(req).id);
    if (!id) return res.status(400).json({ error: "User id is required" });

    if (req.method === "PATCH") {
      const payload = normalizeUserPayload(body, { partial: true });
      delete payload.id;

      if (Object.keys(payload).length === 0) {
        return res.status(400).json({ error: "No user fields provided" });
      }

      const { data, error } = await supabase
        .from("users")
        .update(payload)
        .eq("id", id)
        .select("id,name,email,role,title,is_active,created_at")
        .single();

      if (error) throw error;
      return res.status(200).json({ user: data });
    }

    const { data, error } = await supabase
      .from("users")
      .delete()
      .eq("id", id)
      .select("id,name,email,role,title,is_active,created_at")
      .single();

    if (error) throw error;
    return res.status(200).json({ user: safeUser(data) });
  } catch (error) {
    return sendError(res, error, "Users API failed");
  }
}
