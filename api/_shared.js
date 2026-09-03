import { createClient } from "@supabase/supabase-js";
import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";

const roleValues = new Set(["admin", "faculty", "student"]);
const subjectTypeValues = new Set(["Theory Only", "Lab Only", "Theory + Lab"]);
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
    localDb.learning_records ||= [];
    localDb.courses ||= [];
    localDb.enrollments ||= [];
    localDb.resources ||= [];
    localDb.assessments ||= [];
    localDb.submissions ||= [];
    localDb.activity_logs ||= [];
    localDb.users.forEach((user) => {
      if (!user.password_hash && user.role === "faculty" && process.env.FACULTY_PASSWORD) {
        user.password_hash = hashPassword(process.env.FACULTY_PASSWORD);
      }
      if (!user.password_hash && user.password) {
        user.password_hash = hashPassword(user.password);
        user.password = null;
      }
    });
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
      // Mirror the production enrollment trigger in the in-memory development adapter.
      if (this.tableName === "users") {
        for (const user of inserted.filter((row) => row.role === "student")) {
          for (const courseId of ["course-java", "course-dbms"]) {
            this.db.enrollments.push({ id: `enr-${user.id}-${courseId}`, user_id: user.id, course_id: courseId, tracks: ["theory", "lab"], progress: 0, study_minutes: 0, status: "active", created_at: user.created_at });
          }
        }
      }
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
    "Authorization, Content-Type, X-User-Email, X-User-Password, X-Admin-Email, X-Admin-Password, X-Bootstrap-Token",
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
  const { password: _password, password_hash: _passwordHash, ...publicUser } = user;
  return publicUser;
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString("base64url");
  const iterations = 210000;
  const derived = pbkdf2Sync(cleanText(password), salt, iterations, 32, "sha512").toString("base64url");
  return `pbkdf2_sha512$${iterations}$${salt}$${derived}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  const [algorithm, iterationsText, salt, expected] = String(storedHash).split("$");
  if (algorithm !== "pbkdf2_sha512" || !iterationsText || !salt || !expected) return false;
  const actual = pbkdf2Sync(cleanText(password), salt, Number(iterationsText), 32, "sha512");
  const expectedBuffer = Buffer.from(expected, "base64url");
  return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
}

function authSecret() {
  const secret = process.env.AUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET is required in production");
  return "academia-local-development-secret-change-before-deploy";
}

export function createSessionToken(user, maxAgeSeconds = 60 * 60 * 12) {
  const payload = Buffer.from(JSON.stringify({ sub: user.id, role: user.role, exp: Math.floor(Date.now() / 1000) + maxAgeSeconds })).toString("base64url");
  const signature = createHmac("sha256", authSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function verifySessionToken(token) {
  const [payload, signature] = cleanText(token).split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", authSecret()).update(payload).digest();
  const supplied = Buffer.from(signature, "base64url");
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return claims.exp > Math.floor(Date.now() / 1000) && claims.sub ? claims : null;
  } catch {
    return null;
  }
}

export async function findUserByIdentifier(supabase, identifier, columns = "id,name,email,password,password_hash,role,title,roll_number,batch,contact_number,department,year,section,college,is_active") {
  const email = cleanEmail(identifier);
  if (!/^\S+@\S+\.\S+$/.test(email)) return { data: [], error: null };
  return supabase.from("users").select(columns).eq("email", email).limit(1);
}

export async function requireUser(supabase, req, allowedRoles = ["admin", "faculty", "student"]) {
  const authorization = cleanText(getHeader(req, "authorization"));
  if (authorization.toLowerCase().startsWith("bearer ")) {
    const claims = verifySessionToken(authorization.slice(7));
    if (!claims) {
      const error = new Error("Your session is invalid or has expired");
      error.statusCode = 401;
      throw error;
    }
    const { data, error } = await supabase
      .from("users")
      .select("id,name,email,role,title,roll_number,batch,contact_number,department,year,section,college,is_active")
      .eq("id", claims.sub)
      .limit(1);
    if (error) throw error;
    const sessionUser = data?.[0];
    if (!sessionUser || sessionUser.is_active === false || sessionUser.role !== claims.role) {
      const error = new Error("Your account is invalid or inactive");
      error.statusCode = 403;
      throw error;
    }
    if (!allowedRoles.includes(sessionUser.role)) {
      const error = new Error("You do not have permission to perform this action");
      error.statusCode = 403;
      throw error;
    }
    return sessionUser;
  }

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
  if (!user || !verifyPassword(password, user.password_hash) || user.is_active === false) {
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
