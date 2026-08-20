import { createClient } from "@supabase/supabase-js";

function createSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(supabaseUrl, supabaseKey);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const supabase = createSupabaseClient();

    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, name, email, role, title");
    
    if (usersError) throw usersError;

    const { count: subjectCount, error: subjectError } = await supabase
      .from("subjects")
      .select("*", { count: "exact", head: true });
      
    if (subjectError) throw subjectError;

    const { count: assignmentCount, error: assignmentError } = await supabase
      .from("assignments")
      .select("*", { count: "exact", head: true });
      
    if (assignmentError) throw assignmentError;

    return res.status(200).json({
      users: users || [],
      subjectCount: subjectCount || 0,
      assignmentCount: assignmentCount || 0,
    });
  } catch (error) {
    console.error("Summary error:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
}
