import { _auth, _createClient } from "./_shared.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const user = await _auth(req);
    if (!user || user.role !== "faculty") {
      return res.status(401).json({ error: "Unauthorized. Only faculty can view AI chat logs." });
    }

    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: "Missing userId parameter" });
    }

    const supabase = _createClient();
    const { data, error } = await supabase
      .from("ai_chat_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("AI Chat Logs Database Error:", error);
      return res.status(500).json({ error: "Failed to fetch AI chat logs" });
    }

    return res.status(200).json({ logs: data || [] });
  } catch (error) {
    console.error("AI Chat Logs Error:", error);
    return res.status(500).json({ error: "Server error while fetching AI chat logs" });
  }
}
