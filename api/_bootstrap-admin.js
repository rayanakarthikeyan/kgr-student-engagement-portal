import {
  cleanEmail,
  cleanText,
  createSupabaseClient,
  getBody,
  handleOptions,
  hashPassword,
  methodNotAllowed,
  safeUser,
  sendError,
  setCors,
} from "./_shared.js";

export default async function handler(req, res) {
  setCors(res, "POST,OPTIONS");
  if (handleOptions(req, res)) return;

  if (req.method !== "POST") {
    return methodNotAllowed(res);
  }

  try {
    const expectedToken = process.env.BOOTSTRAP_ADMIN_TOKEN;
    const providedToken = req.headers?.["x-bootstrap-token"] || req.headers?.["X-Bootstrap-Token"];

    if (!expectedToken) {
      return res.status(503).json({ error: "Bootstrap token is not configured" });
    }

    if (providedToken !== expectedToken) {
      return res.status(403).json({ error: "Invalid bootstrap token" });
    }

    const supabase = createSupabaseClient({ requirePrivileged: true });

    const { count, error: countError } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");

    if (countError) throw countError;

    if ((count ?? 0) > 0) {
      return res.status(409).json({ error: "Super Admin already exists" });
    }

    const body = getBody(req);
    const password = cleanText(body.password);
    if (password.length < 12) {
      return res.status(400).json({ error: "The initial administrator password must contain at least 12 characters" });
    }
    const payload = {
      id: cleanText(body.id) || "u-admin-001",
      name: cleanText(body.name) || "admin",
      email: cleanEmail(body.email) || "admin@learningportal.test",
      password: null,
      password_hash: hashPassword(password),
      role: "admin",
      title: cleanText(body.title) || "Super Admin",
      is_active: true,
    };

    const { data, error } = await supabase
      .from("users")
      .insert(payload)
      .select("id,name,email,role,title,is_active,created_at")
      .single();

    if (error) throw error;

    return res.status(201).json({ user: safeUser(data) });
  } catch (error) {
    return sendError(res, error, "Bootstrap failed");
  }
}
