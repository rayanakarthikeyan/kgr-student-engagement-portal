import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as dotenv from "dotenv";

// Load environment variables from .env
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables in .env");
  console.error("Required: SUPABASE_URL or VITE_SUPABASE_URL, plus SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  const seedPath = resolve("server/db.seed.json");
  const seedData = JSON.parse(readFileSync(seedPath, "utf8"));

  console.log("Clearing learning demo data...");
  const clearSteps = [
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
      section: subject.section
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

  console.log("Seed completed. Only the Super Admin account is present.");
}

seed().catch(console.error);
