import { createSupabaseClient, handleOptions, methodNotAllowed, sendError, setCors } from "./_shared.js";

export default async function handler(req, res) {
  setCors(res, "GET,OPTIONS");
  if (handleOptions(req, res)) return;

  if (req.method !== "GET") {
    return methodNotAllowed(res);
  }

  try {
    const supabase = createSupabaseClient();

    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, name, email, role, title, is_active, created_at")
      .order("created_at", { ascending: false });
    
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
    return sendError(res, error, "Summary failed");
  }
}
