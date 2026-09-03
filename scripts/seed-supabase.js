import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as dotenv from "dotenv";

// Load environment variables from .env
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables in .env");
  console.error("Required: VITE_SUPABASE_URL and one of SUPABASE_SERVICE_ROLE_KEY, SUPABASE_SECRET_KEY, SUPABASE_ANON_KEY, SUPABASE_PUBLISHABLE_KEY, or VITE_SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  const seedPath = resolve("server/db.seed.json");
  const seedData = JSON.parse(readFileSync(seedPath, "utf8"));

  console.log("Seeding Users...");
  for (const user of seedData.users) {
    const { error } = await supabase.from("users").upsert(user);
    if (error) console.error("Error inserting user:", error.message);
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
    if (error) console.error("Error inserting subject:", error.message);
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
    if (error) console.error("Error inserting assignment:", error.message);
  }

  console.log("Seeding completed.");
}

seed().catch(console.error);
