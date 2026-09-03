import { GoogleGenerativeAI } from "@google/generative-ai";
import { requireUser, createSupabaseClient } from "./_shared.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const supabase = createSupabaseClient();
    const user = await requireUser(supabase, req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res
        .status(503)
        .json({
          error: "AI services are not configured. Please add GEMINI_API_KEY.",
        });
    }

    const { challengeId, code, statement, history, message } = req.body;

    if (!challengeId || !message) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Save the user's message to the database
    // Save the user's message to the database
    await supabase.from("ai_chat_logs").insert({
      user_id: user.id,
      challenge_id: challengeId,
      role: "user",
      content: message,
    });

    const systemPrompt = `You are an expert teaching assistant at KG Reddy College of Engineering and Technology. 
The student is currently working on a programming challenge in the IDE.
Challenge Statement: ${statement || "Unknown"}
Student's Current Code:
\`\`\`
${code || "No code provided"}
\`\`\`

Your goal is to help the student learn. 
CRITICAL RULES:
1. NEVER give the direct answer or write the complete code for the student.
2. Use the Socratic method: ask leading questions to help them identify their own mistakes.
3. Be encouraging, concise, and professional.
4. Keep your responses short (under 3 paragraphs).`;

    const chatHistory = history.map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: systemPrompt,
    });

    const chat = model.startChat({
      history: chatHistory,
    });

    const result = await chat.sendMessage(message);
    const aiResponse = result.response.text();

    // Save the AI's response to the database
    await supabase.from("ai_chat_logs").insert({
      user_id: user.id,
      challenge_id: challengeId,
      role: "model",
      content: aiResponse,
    });

    return res.status(200).json({ response: aiResponse });
  } catch (error) {
    console.error("AI Chat Error:", error);
    return res
      .status(500)
      .json({ error: "Failed to communicate with AI service" });
  }
}
