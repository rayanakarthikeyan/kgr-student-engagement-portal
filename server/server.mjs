import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? "127.0.0.1";
const DB_PATH = resolve(process.env.DB_PATH ?? "server/db.local.json");
const SEED_PATH = resolve("server/db.seed.json");

async function ensureDb() {
  if (existsSync(DB_PATH)) return;

  await mkdir(dirname(DB_PATH), { recursive: true });
  const seed = await readFile(SEED_PATH, "utf8");
  await writeFile(DB_PATH, seed, "utf8");
}

async function readDb() {
  await ensureDb();
  return JSON.parse(await readFile(DB_PATH, "utf8"));
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function send(response, status, body) {
  response.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

function publicUser(user) {
  const { password: _password, ...safeUser } = user;
  return safeUser;
}

const server = createServer(async (request, response) => {
  try {
    if (request.method === "OPTIONS") {
      send(response, 204, {});
      return;
    }

    const url = new URL(request.url ?? "/", `http://${request.headers.host}`);

    if (request.method === "GET" && url.pathname === "/api/health") {
      send(response, 200, { ok: true, dbPath: DB_PATH });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/login") {
      const body = await readJsonBody(request);
      const email = String(body.email ?? "").trim().toLowerCase();
      const password = String(body.password ?? "");
      const db = await readDb();
      const user = db.users.find((item) => item.email.toLowerCase() === email && item.password === password);

      if (!user) {
        send(response, 401, { error: "Invalid email or password" });
        return;
      }

      send(response, 200, { user: publicUser(user) });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/summary") {
      const db = await readDb();
      send(response, 200, {
        users: db.users.map(publicUser),
        subjectCount: db.subjects.length,
        assignmentCount: db.assignments.length,
      });
      return;
    }

    send(response, 404, { error: "Not found" });
  } catch (error) {
    send(response, 500, { error: error instanceof Error ? error.message : "Server error" });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Local API running at http://${HOST}:${PORT}`);
  console.log(`Database file: ${DB_PATH}`);
});
