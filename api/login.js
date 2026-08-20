import { cleanEmail, cleanText, createSupabaseClient, getBody, handleOptions, methodNotAllowed, safeUser, sendError, setCors } from "./_shared.js";

export default async function handler(req, res) {
  setCors(res, "POST,OPTIONS");
  if (handleOptions(req, res)) return;

  if (req.method !== "POST") {
    return methodNotAllowed(res);
  }

  try {
    const { email, password } = getBody(req);
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const supabase = createSupabaseClient();
    const emailLower = cleanEmail(email);

    const { data: users, error } = await supabase
      .from("users")
      .select("id,name,email,password,role,title,is_active")
      .eq("email", emailLower)
      .limit(1);

    if (error) {
      throw error;
    }

    const user = users?.[0];

    if (!user || user.password !== cleanText(password) || user.is_active === false) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    return res.status(200).json({ user: safeUser(user) });
  } catch (error) {
    return sendError(res, error, "Login failed");
  }
}
