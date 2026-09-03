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
      return res.status(503).json({ error: "AI services are not configured. Please add GEMINI_API_KEY." });
    }

    // 1. Fetch all ungraded submissions (status = 'submitted')
    const { data: pendingSubmissions, error: fetchError } = await supabase
      .from("learning_records")
      .select("*, assignments(*)")
      .eq("kind", "submission")
      .eq("status", "submitted");

    if (fetchError) {
      console.error("Error fetching submissions:", fetchError);
      return res.status(500).json({ error: "Failed to fetch pending submissions" });
    }

    if (!pendingSubmissions || pendingSubmissions.length === 0) {
      return res.status(200).json({ gradedCount: 0, message: "No pending submissions to grade." });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    let gradedCount = 0;

    // 2. Iterate and evaluate each submission
    for (const submission of pendingSubmissions) {
      const assignment = submission.assignments;
      if (!assignment) continue;

      const maxMarks = assignment.max_marks || 10;
      const expectedOutput = assignment.test_cases?.[0]?.output || "Not provided";
      
      const systemPrompt = `You are an expert Computer Science professor at KG Reddy College of Engineering and Technology.
Your task is to evaluate a student's submission for an assignment and grade it.

Assignment Details:
- Title: ${assignment.title}
- Description: ${assignment.description}
- Max Marks: ${maxMarks}
- Expected Output (if applicable): ${expectedOutput}

Student's Submission:
\`\`\`
${submission.body}
\`\`\`

Evaluate the submission based on:
1. Correctness and completeness (Does it solve the problem?)
2. Structure and logic (Is the code/answer well-organized?)
3. Edge cases and quality (Did they handle potential issues?)

Respond with ONLY a valid JSON object matching this schema:
{
  "score": number, // Must be between 0 and ${maxMarks}
  "feedback": "string" // Constructive feedback for the student explaining the grade
}`;

      try {
        const result = await model.generateContent(systemPrompt);
        const responseText = result.response.text();
        const evaluation = JSON.parse(responseText);

        const score = Math.max(0, Math.min(maxMarks, Number(evaluation.score) || 0));
        const feedback = evaluation.feedback || "Graded automatically by AI.";

        // Update the record in Supabase
        const updatedMetadata = {
          ...submission.metadata,
          faculty_feedback: feedback,
          auto_graded: true
        };

        const { error: updateError } = await supabase
          .from("learning_records")
          .update({
            status: "graded",
            score: score,
            metadata: updatedMetadata,
            updated_at: new Date().toISOString()
          })
          .eq("id", submission.id);

        if (!updateError) {
          gradedCount++;
        }
      } catch (evalError) {
        console.error(`Failed to evaluate submission ${submission.id}:`, evalError);
        // Continue to the next one even if this one fails
      }
    }

    return res.status(200).json({ gradedCount, message: `Successfully graded ${gradedCount} submissions.` });

  } catch (err) {
    console.error("Bulk auto-grade error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
