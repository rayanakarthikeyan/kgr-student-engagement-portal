import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as dotenv from "dotenv";

// Load local Vercel env first, then fallback project env.
dotenv.config({ path: ".env.local" });
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY;
const hasPulledSensitivePlaceholder = [supabaseUrl, supabaseKey].some((value) => value === "[SENSITIVE]");

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables in .env");
  console.error("Required: SUPABASE_URL or VITE_SUPABASE_URL, plus SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY");
  process.exit(1);
}

if (hasPulledSensitivePlaceholder) {
  console.error("Vercel pulled sensitive environment variables as [SENSITIVE] placeholders.");
  console.error("For local seeding, create a local .env file with real Supabase values, or run the seed from an environment that has plaintext secrets.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  const seedPath = resolve("server/db.seed.json");
  const seedData = JSON.parse(readFileSync(seedPath, "utf8"));

  console.log("Clearing learning demo data...");
  const clearSteps = [
    ["engagement_records", "id"],
    ["assignments", "id"],
    ["subjects", "id"],
    ["users", "id"],
  ];

  for (const [table, column] of clearSteps) {
    const { error } = await supabase.from(table).delete().neq(column, "__seed_keep_none__");
    if (error) {
      throw new Error(`Error clearing ${table}: ${error.message}`);
    }
  }

  console.log("Seeding Super Admin...");
  for (const user of seedData.users) {
    const { error } = await supabase.from("users").upsert(user);
    if (error) throw new Error(`Error inserting user: ${error.message}`);
  }

  console.log("Seeding Subjects...");
  for (const subject of seedData.subjects) {
    const { error } = await supabase.from("subjects").upsert({
      id: subject.id,
      name: subject.name,
      type: subject.type,
      semester: subject.semester,
      section: subject.section,
      department: subject.department,
      academic_year: subject.academic_year,
      is_active: subject.is_active
    });
    if (error) throw new Error(`Error inserting subject: ${error.message}`);
  }

  console.log("Seeding Assignments...");
  for (const assignment of seedData.assignments) {
    const { error } = await supabase.from("assignments").upsert({
      id: assignment.id,
      title: assignment.title,
      subject_id: assignment.subjectId, // map subjectId -> subject_id
      due_date: assignment.dueDate,     // map dueDate -> due_date
      assigned: assignment.assigned,
      submitted: assignment.submitted,
      pending: assignment.pending,
      reviewed: assignment.reviewed
    });
    if (error) throw new Error(`Error inserting assignment: ${error.message}`);
  }

  console.log("Seeding Engagement Records...");
  for (const record of seedData.engagement_records || []) {
    const { error } = await supabase.from("engagement_records").upsert(record);
    if (error) throw new Error(`Error inserting engagement record: ${error.message}`);
  }

  console.log("Seed completed. Super Admin, faculty demo, and student demo accounts are present.");
}

seed().catch(console.error);
