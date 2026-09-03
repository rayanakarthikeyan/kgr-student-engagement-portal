import {
  cleanText,
  createSupabaseClient,
  getBody,
  handleOptions,
  methodNotAllowed,
  requireUser,
  sendError,
  setCors,
} from "./_shared.js";

export default async function handler(req, res) {
  setCors(res, "POST,OPTIONS");
  if (handleOptions(req, res)) return;
  if (req.method !== "POST") return methodNotAllowed(res);
  try {
    const supabase = createSupabaseClient({ requirePrivileged: true });
    await requireUser(supabase, req);
    const body = getBody(req);
    const language = cleanText(body.language);
    const code = String(body.code || "");
    const stdin = String(body.stdin || "");
    if (!["java", "sql"].includes(language))
      return res.status(400).json({ error: "Language must be java or sql" });
    if (!code.trim())
      return res.status(400).json({ error: "Source code is required" });
    if (code.length > 100000 || stdin.length > 10000)
      return res.status(413).json({ error: "Runner input is too large" });

    if (process.env.CODE_RUNNER_URL) {
      const isPiston = process.env.CODE_RUNNER_URL.includes("piston");
      
      let requestBody, headers;
      if (isPiston) {
        requestBody = JSON.stringify({
          language: language === "sql" ? "sqlite3" : language,
          version: "*",
          files: [{ content: code }],
          stdin: stdin || "",
        });
        headers = { "Content-Type": "application/json" };
      } else {
        requestBody = JSON.stringify({
          language,
          code,
          stdin,
          timeoutMs: 5000,
          memoryMb: 256,
        });
        headers = {
          "Content-Type": "application/json",
          ...(process.env.CODE_RUNNER_TOKEN
            ? { Authorization: `Bearer ${process.env.CODE_RUNNER_TOKEN}` }
            : {}),
        };
      }

      const response = await fetch(process.env.CODE_RUNNER_URL, {
        method: "POST",
        headers,
        body: requestBody,
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "No response body");
        throw new Error(`The isolated code runner rejected the request. Details: ${errText}`);
      }

      const responseData = await response.json();
      
      if (isPiston) {
        const runCode = responseData.run?.code ?? 0;
        const compileCode = responseData.compile?.code ?? 0;
        return res.status(200).json({
          status: (runCode === 0 && compileCode === 0) ? "passed" : "error",
          stdout: responseData.run?.stdout || "",
          stderr: responseData.run?.stderr || responseData.compile?.stderr || "",
          durationMs: 0
        });
      }

      return res.status(200).json(responseData);
    }

    return res
      .status(503)
      .json({
        error:
          "Code execution is not configured. Save your source or submit for faculty review. A college-managed isolated runner must be connected before Java or SQL can run here.",
      });
  } catch (error) {
    return sendError(res, error, "Code runner failed");
  }
}
