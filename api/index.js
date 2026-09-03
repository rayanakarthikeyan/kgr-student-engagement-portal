// Auto-generated API Router
import aiChatLogs from "./_ai-chat-logs.js";
import aiChat from "./_ai-chat.js";
import assignments from "./_assignments.js";
import autoGradeBulk from "./_auto-grade-bulk.js";
import bootstrapAdmin from "./_bootstrap-admin.js";
import codeRunner from "./_code-runner.js";
import engagement from "./_engagement.js";
import health from "./_health.js";
import learning from "./_learning.js";
import login from "./_login.js";
import platform from "./_platform.js";
import register from "./_register.js";
import subjects from "./_subjects.js";
import summary from "./_summary.js";
import users from "./_users.js";

export default async function handler(req, res) {
  let url = req.url || "";
  // req.url in Vercel might be /api/users or just /users if rewritten
  let pathName = url
    .split("?")[0]
    .replace(/^\/api\//, "")
    .replace(/^\//, "");
  // If rewrites mapped /api/users to /api/index.js, Vercel might leave req.url as /api/users

  switch (pathName) {
    case "ai-chat-logs":
      return aiChatLogs(req, res);
    case "ai-chat":
      return aiChat(req, res);
    case "assignments":
      return assignments(req, res);
    case "auto-grade-bulk":
      return autoGradeBulk(req, res);
    case "bootstrap-admin":
      return bootstrapAdmin(req, res);
    case "code-runner":
      return codeRunner(req, res);
    case "engagement":
      return engagement(req, res);
    case "health":
      return health(req, res);
    case "learning":
      return learning(req, res);
    case "login":
      return login(req, res);
    case "platform":
      return platform(req, res);
    case "register":
      return register(req, res);
    case "subjects":
      return subjects(req, res);
    case "summary":
      return summary(req, res);
    case "users":
      return users(req, res);
    default:
      return res.status(404).json({ error: "API route not found" });
  }
}
