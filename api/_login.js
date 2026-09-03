import {
  cleanText,
  createSessionToken,
  createSupabaseClient,
  findUserByIdentifier,
  getBody,
  handleOptions,
  methodNotAllowed,
  requireUser,
  safeUser,
  sendError,
  setCors,
  verifyPassword,
} from "./_shared.js";

export default async function handler(req, res) {
  setCors(res, "GET,POST,OPTIONS");
  if (handleOptions(req, res)) return;

  if (req.method === "GET") {
    try {
      const supabase = createSupabaseClient({ requirePrivileged: true });
      const user = await requireUser(supabase, req, [
        "student",
        "faculty",
        "admin",
      ]);
      return res.status(200).json({ user: safeUser(user) });
    } catch (error) {
      return sendError(res, error, "Session validation failed");
    }
  }

  if (req.method !== "POST") {
    return methodNotAllowed(res);
  }

  try {
    const { email, password } = getBody(req);

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const supabase = createSupabaseClient({ requirePrivileged: true });
    const { data: users, error } = await findUserByIdentifier(supabase, email);

    if (error) {
      throw error;
    }

    const user = users?.[0];

    if (
      !user ||
      !verifyPassword(cleanText(password), user.password_hash) ||
      user.is_active === false
    ) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    return res
      .status(200)
      .json({ user: safeUser(user), token: createSessionToken(user) });
  } catch (error) {
    return sendError(res, error, "Login failed");
  }
}
