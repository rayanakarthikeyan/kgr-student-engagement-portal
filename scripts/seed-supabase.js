import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as dotenv from "dotenv";
import { hashPassword } from "../api/_shared.js";
import ws from "ws";

dotenv.config({ path: ".env.local" });
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const hasPlaceholder = [supabaseUrl, supabaseKey].some(
  (value) => value === "[SENSITIVE]",
);

if (!supabaseUrl || !supabaseKey || hasPlaceholder) {
  throw new Error(
    "A real Supabase URL and privileged service key are required",
  );
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  realtime: {
    transport: ws,
  },
});

async function seed() {
  const seedData = JSON.parse(
    readFileSync(resolve("server/db.seed.json"), "utf8"),
  );

  console.log("Upserting system accounts without clearing registered users...");
  for (const user of seedData.users) {
    const { password, password_hash: storedHash, ...profile } = user;
    const { data: existing, error: readError } = await supabase
      .from("users")
      .select("id")
      .eq("email", user.email)
      .limit(1);
    if (readError) throw readError;
    const initialPassword =
      user.role === "faculty"
        ? process.env.FACULTY_PASSWORD || password
        : password;
    const passwordHash =
      storedHash || (initialPassword ? hashPassword(initialPassword) : "");
    if (!existing?.length && !passwordHash)
      throw new Error(
        `Set FACULTY_PASSWORD before creating system account ${user.id}`,
      );
    const payload = existing?.length
      ? { ...profile, id: existing[0].id }
      : { ...profile, password: null, password_hash: passwordHash };
    const { error } = await supabase.from("users").upsert(payload);
    if (error)
      throw new Error(`Error upserting system account: ${error.message}`);
  }

  console.log("Upserting JAVA and DBMS course definitions...");
  const courses = (seedData.courses || []).map((course) => ({
    id: course.id,
    code: course.code,
    title: course.title,
    description: course.description,
    is_active: course.is_active !== false,
  }));
  const { error: courseError } = await supabase.from("courses").upsert(courses);
  if (courseError)
    throw new Error(`Error upserting courses: ${courseError.message}`);

  console.log("Upserting KGR25 subjects...");
  for (const subject of seedData.subjects) {
    const { error } = await supabase.from("subjects").upsert({
      id: subject.id,
      name: subject.name,
      type: subject.type,
      semester: subject.semester,
      section: subject.section,
      department: subject.department,
      academic_year: subject.academic_year,
      is_active: subject.is_active,
    });
    if (error) throw new Error(`Error upserting subject: ${error.message}`);
  }

  console.log(
    "Baseline seed complete. Existing student and coursework data was preserved.",
  );
}

seed().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
