import { randomUUID } from "node:crypto";
import {
  cleanEmail,
  cleanText,
  createSessionToken,
  createSupabaseClient,
  getBody,
  handleOptions,
  hashPassword,
  methodNotAllowed,
  requireFields,
  safeUser,
  sendError,
  setCors,
} from "./_shared.js";

export default async function handler(req, res) {
  setCors(res, "POST,OPTIONS");
  if (handleOptions(req, res)) return;
  if (req.method !== "POST") return methodNotAllowed(res);

  try {
    const body = getBody(req);
    const missing = requireFields(body, ["name", "email", "rollNumber", "password", "contactNumber", "department", "year", "section"]);
    if (missing) return res.status(400).json({ error: missing });

    const email = cleanEmail(body.email);
    const rollNumber = cleanText(body.rollNumber).toUpperCase();
    const password = cleanText(body.password);
    const contactNumber = cleanText(body.contactNumber).replace(/[\s()-]/g, "");
    const department = cleanText(body.department).toUpperCase();
    const year = cleanText(body.year);
    const section = cleanText(body.section).toUpperCase();
    if (cleanText(body.name).length < 2 || cleanText(body.name).length > 120) return res.status(400).json({ error: "Enter your full name (2-120 characters)" });
    if (!/^(?:\+91)?[6-9]\d{9}$/.test(contactNumber)) return res.status(400).json({ error: "Enter a valid 10-digit Indian mobile number, optionally prefixed with +91" });
    if (!["CSE", "CSM", "CSD"].includes(department)) return res.status(400).json({ error: "Choose CSE, CSM or CSD" });
    if (!["1", "2", "3", "4"].includes(year)) return res.status(400).json({ error: "Choose a year between 1 and 4" });
    if (!["A", "B", "C", "D", "E"].includes(section)) return res.status(400).json({ error: "Choose a section from A to E" });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: "Enter a valid institutional email address" });
    if (password.length < 8) return res.status(400).json({ error: "Password must contain at least 8 characters" });
    if (rollNumber.length < 4 || rollNumber.length > 32) return res.status(400).json({ error: "Enter a valid roll number" });

    const supabase = createSupabaseClient({ requirePrivileged: true });
    const [{ data: emailMatches, error: emailError }, { data: rollMatches, error: rollError }] = await Promise.all([
      supabase.from("users").select("id").eq("email", email).limit(1),
      supabase.from("users").select("id").eq("roll_number", rollNumber).limit(1),
    ]);
    if (emailError) throw emailError;
    if (rollError) throw rollError;
    if (emailMatches?.length) return res.status(409).json({ error: "An account already exists for this email" });
    if (rollMatches?.length) return res.status(409).json({ error: "An account already exists for this roll number" });

    const payload = {
      id: `u-student-${randomUUID()}`,
      name: cleanText(body.name),
      email,
      password: null,
      password_hash: hashPassword(password),
      role: "student",
      title: "Student",
      roll_number: rollNumber,
      batch: cleanText(body.batch) || null,
      contact_number: contactNumber,
      department,
      year,
      section,
      college: "KG Reddy College of Engineering and Technology",
      is_active: true,
    };
    // The database trigger enrolls both courses atomically with account creation.
    const { data, error } = await supabase.from("users").insert(payload).select("id,name,email,role,title,roll_number,batch,contact_number,department,year,section,college,is_active,created_at").single();
    if (error) throw error;
    return res.status(201).json({ user: safeUser(data), token: createSessionToken(data) });
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ error: "An account already exists for this email or roll number" });
    return sendError(res, error, "Registration failed");
  }
}
