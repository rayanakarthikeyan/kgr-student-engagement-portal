import { createClient } from "@supabase/supabase-js";

const roleValues = new Set(["admin", "faculty", "student"]);
const subjectTypeValues = new Set(["Theory Only", "Lab Only", "Theory + Lab"]);

export function setCors(res, methods = "GET,POST,PATCH,DELETE,OPTIONS") {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", methods);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Admin-Email, X-Admin-Password");
}

export function handleOptions(req, res) {
  if (req.method !== "OPTIONS") return false;
  res.status(204).end();
  return true;
}

export function methodNotAllowed(res) {
  return res.status(405).json({ error: "Method not allowed" });
}

export function createSupabaseClient({ requirePrivileged = false } = {}) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const privilegedKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  const publicKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;
  const supabaseKey = privilegedKey || publicKey;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables");
  }

  if (requirePrivileged && !privilegedKey) {
    throw new Error("Missing Supabase service role or secret key for write operations");
  }

  return createClient(supabaseUrl, requirePrivileged ? privilegedKey : supabaseKey);
}

export function getBody(req) {
  return req.body && typeof req.body === "object" ? req.body : {};
}

export function getQuery(req) {
  return req.query && typeof req.query === "object" ? req.query : {};
}

export function getHeader(req, name) {
  const headers = req.headers ?? {};
  const value = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

export function cleanText(value) {
  return String(value ?? "").trim();
}

export function cleanEmail(value) {
  return cleanText(value).toLowerCase();
}

export function requireFields(body, fields) {
  const missing = fields.filter((field) => cleanText(body[field]) === "");
  if (missing.length > 0) {
    return `Missing required field${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`;
  }
  return null;
}

export function assertRole(role) {
  if (!roleValues.has(role)) {
    throw new Error("Role must be admin, faculty, or student");
  }
}

export function assertSubjectType(type) {
  if (!subjectTypeValues.has(type)) {
    throw new Error("Subject type must be Theory Only, Lab Only, or Theory + Lab");
  }
}

export function safeUser(user) {
  if (!user) return user;
  const { password: _password, ...withoutPassword } = user;
  return withoutPassword;
}

export async function requireAdmin(supabase, req) {
  const body = getBody(req);
  const email = cleanEmail(getHeader(req, "x-admin-email") || body.adminEmail);
  const password = cleanText(getHeader(req, "x-admin-password") || body.adminPassword);

  if (!email || !password) {
    const error = new Error("Super Admin credentials are required");
    error.statusCode = 401;
    throw error;
  }

  const { data, error } = await supabase
    .from("users")
    .select("id,name,email,password,role,title,is_active")
    .eq("email", email)
    .eq("role", "admin")
    .limit(1);

  if (error) throw error;

  const admin = data?.[0];
  if (!admin || admin.password !== password || admin.is_active === false) {
    const error = new Error("Invalid Super Admin credentials");
    error.statusCode = 403;
    throw error;
  }

  return safeUser(admin);
}

export function sendError(res, error, fallback = "Server error") {
  const statusCode = error?.statusCode || 500;
  if (statusCode >= 500) {
    console.error(error);
  }
  return res.status(statusCode).json({ error: error?.message || fallback });
}
