import * as dotenv from "dotenv";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const envFile = process.argv[2] || ".env.local";
const migrationFile =
  process.argv[3] || "supabase/migrations/20260824_academic_platform.sql";

dotenv.config({ path: envFile });

const rawConnectionString =
  process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
if (!rawConnectionString || rawConnectionString === "[SENSITIVE]") {
  throw new Error("POSTGRES_URL_NON_POOLING or POSTGRES_URL is required");
}
const connectionUrl = new URL(rawConnectionString);
connectionUrl.searchParams.delete("sslmode");
const connectionString = connectionUrl.toString();

const sql = readFileSync(resolve(migrationFile), "utf8");
const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
  statement_timeout: 60000,
});

try {
  await client.connect();
  await client.query("BEGIN");
  await client.query(sql);
  await client.query("COMMIT");

  const { rows } = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('users', 'courses', 'enrollments', 'resources', 'assessments', 'submissions', 'activity_logs')
    ORDER BY table_name
  `);

  console.log(
    `Migration applied. Verified tables: ${rows.map((row) => row.table_name).join(", ")}`,
  );
} catch (error) {
  try {
    await client.query("ROLLBACK");
  } catch {
    /* Connection may already be closed. */
  }
  throw error;
} finally {
  await client.end().catch(() => undefined);
}
