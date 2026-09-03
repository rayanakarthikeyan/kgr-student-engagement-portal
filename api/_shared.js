import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const roleValues = new Set(["admin", "faculty", "student"]);
const subjectTypeValues = new Set(["Theory Only", "Lab Only", "Theory + Lab"]);
const demoAccountNames = new Map([
  ["admin", "admin"],
  ["faculty.demo", "Demo Faculty"],
  ["student.demo", "Demo Student"],
]);
let localDb;

function hasUsableSupabaseConfig(url, key) {
  if (!url || !key) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function getLocalDb() {
  if (!process.env.LOCAL_API_SEED_PATH) return null;
  if (!localDb) {
    localDb = JSON.parse(readFileSync(process.env.LOCAL_API_SEED_PATH, "utf8"));
    localDb.users ||= [];
    localDb.subjects ||= [];
    localDb.assignments ||= [];
    localDb.engagement_records ||= [];
  }
  return localDb;
}

function matchesIlike(value, pattern) {
  const needle = String(pattern).replaceAll("%", "").toLowerCase();
  return String(value ?? "").toLowerCase().includes(needle);
}

function projectRows(rows, selectColumns, tableName, db) {
  const includeSubjects = tableName === "assignments" && selectColumns.includes("subjects(");
  const baseColumns = selectColumns.split(",").map((column) => column.trim()).filter(Boolean);
  const wantsAll = selectColumns === "*" || selectColumns.startsWith("*,");

  return rows.map((row) => {
    const projected = wantsAll
      ? { ...row }
      : Object.fromEntries(baseColumns.filter((column) => !column.includes("(") && row[column] !== undefined).map((column) => [column, row[column]]));

    if (includeSubjects) {
      projected.subjects = db.subjects.find((subject) => subject.id === row.subject_id) ?? null;
    }

    return projected;
  });
}

class LocalQuery {
  constructor(db, tableName) {
    this.db = db;
    this.tableName = tableName;
    this.filters = [];
    this.sort = null;
    this.selectColumns = "*";
    this.selectOptions = {};
    this.operation = "select";
    this.payload = null;
    this.returnSingle = false;
  }

  select(columns = "*", options = {}) {
    this.selectColumns = columns;
    this.selectOptions = options;
    return this;
  }

  order(column, { ascending = true } = {}) {
    this.sort = { column, ascending };
    return this;
  }

  eq(column, value) {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  ilike(column, pattern) {
    this.filters.push((row) => matchesIlike(row[column], pattern));
    return this;
  }

  or(expression) {
    const clauses = expression.split(",").map((clause) => clause.split(".ilike.")).filter(([column, pattern]) => column && pattern);
    this.filters.push((row) => clauses.some(([column, pattern]) => matchesIlike(row[column], pattern)));
    return this;
  }

  limit(count) {
    this.limitCount = count;
    return this;
  }

  insert(payload) {
    this.operation = "insert";
    this.payload = Array.isArray(payload) ? payload : [payload];
    return this;
  }

  update(payload) {
    this.operation = "update";
    this.payload = payload;
    return this;
  }

  delete() {
    this.operation = "delete";
    return this;
  }

  single() {
    this.returnSingle = true;
    return this;
  }

  async execute() {
    const table = this.db[this.tableName];
    if (!Array.isArray(table)) {
      return { data: null, error: new Error(`Unknown table: ${this.tableName}`) };
    }

    if (this.operation === "insert") {
      const inserted = this.payload.map((row) => ({ ...row, created_at: row.created_at ?? new Date().toISOString() }));
      table.push(...inserted);
      const data = projectRows(inserted, this.selectColumns, this.tableName, this.db);
      return { data: this.returnSingle ? data[0] : data, error: null };
    }

    const indexes = table.map((row, index) => ({ row, index })).filter(({ row }) => this.filters.every((filter) => filter(row)));

    if (this.operation === "update") {
      const updated = indexes.map(({ index }) => {
        table[index] = { ...table[index], ...this.payload };
        return table[index];
      });
      const data = projectRows(updated, this.selectColumns, this.tableName, this.db);
      return { data: this.returnSingle ? data[0] ?? null : data, error: null };
    }

    if (this.operation === "delete") {
      const deleted = indexes.map(({ row }) => row);
      for (const { index } of indexes.toReversed()) table.splice(index, 1);
      const data = projectRows(deleted, this.selectColumns, this.tableName, this.db);
      return { data: this.returnSingle ? data[0] ?? null : data, error: null };
    }

    let rows = indexes.map(({ row }) => row);
    if (this.sort) {
      rows = rows.toSorted((left, right) => {
        const comparison = String(left[this.sort.column] ?? "").localeCompare(String(right[this.sort.column] ?? ""));
        return this.sort.ascending ? comparison : -comparison;
      });
    }
    if (this.limitCount !== undefined) rows = rows.slice(0, this.limitCount);

    const count = this.selectOptions.count ? indexes.length : null;
    const data = this.selectOptions.head ? null : projectRows(rows, this.selectColumns, this.tableName, this.db);
    return { data: this.returnSingle ? data?.[0] ?? null : data, count, error: null };
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }
}

function createLocalDataClient(db) {
  return {
    from(tableName) {
      return new LocalQuery(db, tableName);
    },
  };
}

export function setCors(res, methods = "GET,POST,PATCH,DELETE,OPTIONS") {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", methods);
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, X-User-Email, X-User-Password, X-Admin-Email, X-Admin-Password, X-Bootstrap-Token",
  );
}

export function handleOptions(req, res) {
  if (req.method !== "OPTIONS") return false;
  res.status(204).end();
  return true;
}

export function methodNotAllowed(res) {
  return res.status(405).json({ error: "Method not allowed" });
}

export function createSupabaseClient({ requirePrivileged = false } = {}) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const privilegedKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  const publicKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;
  const supabaseKey = privilegedKey || publicKey;
  const localSeedDb = getLocalDb();

  if (!hasUsableSupabaseConfig(supabaseUrl, supabaseKey)) {
    if (localSeedDb) return createLocalDataClient(localSeedDb);
    throw new Error("Missing Supabase environment variables");
  }

  if (requirePrivileged && !privilegedKey) {
    if (localSeedDb) return createLocalDataClient(localSeedDb);
    throw new Error("Missing Supabase service role or secret key for write operations");
  }

  return createClient(supabaseUrl, requirePrivileged ? privilegedKey : supabaseKey);
}

export function getBody(req) {
  return req.body && typeof req.body === "object" ? req.body : {};
}

export function getQuery(req) {
  return req.query && typeof req.query === "object" ? req.query : {};
}

export function getHeader(req, name) {
  const headers = req.headers ?? {};
  const value = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

export function cleanText(value) {
  return String(value ?? "").trim();
}

export function cleanEmail(value) {
  return cleanText(value).toLowerCase();
}

export function requireFields(body, fields) {
  const missing = fields.filter((field) => cleanText(body[field]) === "");
  if (missing.length > 0) {
    return `Missing required field${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`;
  }
  return null;
}

export function assertRole(role) {
  if (!roleValues.has(role)) {
    throw new Error("Role must be admin, faculty, or student");
  }
}

export function assertSubjectType(type) {
  if (!subjectTypeValues.has(type)) {
    throw new Error("Subject type must be Theory Only, Lab Only, or Theory + Lab");
  }
}

export function safeUser(user) {
  if (!user) return user;
  const { password: _password, ...withoutPassword } = user;
  return withoutPassword;
}

export async function findUserByIdentifier(supabase, identifier, columns = "id,name,email,password,role,title,is_active") {
  const normalized = cleanText(identifier).toLowerCase();
  let request = supabase.from("users").select(columns);

  if (normalized.includes("@")) {
    request = request.eq("email", cleanEmail(normalized));
  } else {
    const accountName = demoAccountNames.get(normalized);
    if (!accountName) return { data: [], error: null };
    request = request.eq("name", accountName);
  }

  return request.limit(1);
}

export async function requireUser(supabase, req, allowedRoles = ["admin", "faculty", "student"]) {
  const body = getBody(req);
  const identifier = cleanText(
    getHeader(req, "x-user-email") || getHeader(req, "x-admin-email") || body.userEmail || body.adminEmail,
  );
  const password = cleanText(
    getHeader(req, "x-user-password") || getHeader(req, "x-admin-password") || body.userPassword || body.adminPassword,
  );

  if (!identifier || !password) {
    const error = new Error("Sign in is required");
    error.statusCode = 401;
    throw error;
  }

  const { data, error } = await findUserByIdentifier(supabase, identifier);

  if (error) throw error;

  const user = data?.[0];
  if (!user || user.password !== password || user.is_active === false) {
    const error = new Error("Invalid or inactive account");
    error.statusCode = 403;
    throw error;
  }

  if (!allowedRoles.includes(user.role)) {
    const error = new Error("You do not have permission to perform this action");
    error.statusCode = 403;
    throw error;
  }

  return safeUser(user);
}

export function requireAdmin(supabase, req) {
  return requireUser(supabase, req, ["admin"]);
}

export function sendError(res, error, fallback = "Server error") {
  const statusCode = error?.statusCode || 500;
  if (statusCode >= 500) {
    console.error(error);
  }
  return res.status(statusCode).json({ error: error?.message || fallback });
}
