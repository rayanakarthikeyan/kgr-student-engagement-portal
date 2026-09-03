import dotenv from "dotenv";
import { createSupabaseClient, hashPassword } from "../api/_shared.js";

dotenv.config({ path: ".env.local" });
dotenv.config();

const email = String(process.env.FACULTY_EMAIL || "")
  .trim()
  .toLowerCase();
const password = String(process.env.FACULTY_PASSWORD || "");
const name = String(process.env.FACULTY_NAME || "Uma Shankar").trim();

if (!/^\S+@\S+\.\S+$/.test(email))
  throw new Error("FACULTY_EMAIL must be a valid email address");
if (password.length < 8)
  throw new Error("FACULTY_PASSWORD must contain at least 8 characters");

const supabase = createSupabaseClient({ requirePrivileged: true });
const { data: emailMatches, error: emailError } = await supabase
  .from("users")
  .select("id,email,role")
  .eq("email", email)
  .limit(1);
if (emailError) throw emailError;

let target = emailMatches?.[0];
if (target && target.role !== "faculty")
  throw new Error(
    "The requested faculty email belongs to a non-faculty account",
  );

if (!target) {
  const { data: facultyUsers, error: facultyError } = await supabase
    .from("users")
    .select("id,email,role")
    .eq("role", "faculty")
    .limit(20);
  if (facultyError) throw facultyError;
  target = facultyUsers?.find((user) =>
    ["u-demo-faculty", "u-faculty-demo", "u-faculty-umashankar"].includes(
      user.id,
    ),
  );
  if (!target && facultyUsers?.length === 1) target = facultyUsers[0];
}

if (!target)
  throw new Error(
    "Could not identify a single faculty account to provision safely",
  );

const { data: updated, error: updateError } = await supabase
  .from("users")
  .update({
    name,
    email,
    password: null,
    password_hash: hashPassword(password),
    role: "faculty",
    title: "Faculty",
    is_active: true,
  })
  .eq("id", target.id)
  .select("id,name,email,role,title,is_active")
  .single();
if (updateError) throw updateError;

console.log(JSON.stringify(updated));
