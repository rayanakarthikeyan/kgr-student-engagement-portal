import "dotenv/config";
import { createServer } from "node:http";
import health from "../api/health.js";
import login from "../api/login.js";
import summary from "../api/summary.js";
import users from "../api/users.js";
import subjects from "../api/subjects.js";
import assignments from "../api/assignments.js";
import bootstrapAdmin from "../api/bootstrap-admin.js";

const HOST = process.env.HOST ?? "127.0.0.1";
const PORT = Number(process.env.PORT ?? 8787);

const routes = {
  "/api/health": health,
  "/api/login": login,
  "/api/summary": summary,
  "/api/users": users,
  "/api/subjects": subjects,
  "/api/assignments": assignments,
  "/api/bootstrap-admin": bootstrapAdmin,
};

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (chunks.length === 0) return undefined;
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function createResponse(nativeResponse) {
  return {
    setHeader(name, value) {
      nativeResponse.setHeader(name, value);
    },
    status(code) {
      nativeResponse.statusCode = code;
      return this;
    },
    json(payload) {
      if (!nativeResponse.hasHeader("Content-Type")) {
        nativeResponse.setHeader("Content-Type", "application/json; charset=utf-8");
      }
      nativeResponse.end(JSON.stringify(payload));
    },
    end() {
      nativeResponse.end();
    },
  };
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
    const handler = routes[url.pathname];

    if (!handler) {
      response.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "Not found" }));
      return;
    }

    request.query = Object.fromEntries(url.searchParams.entries());
    request.body = await readBody(request);

    await handler(request, createResponse(response));
  } catch (error) {
    response.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: error instanceof Error ? error.message : "Server error" }));
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Local Supabase API adapter running at http://${HOST}:${PORT}`);
});
