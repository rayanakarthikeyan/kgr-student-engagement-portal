# Faculty Learning Portal

Vite + React + TypeScript portal for faculty assignments, quizzes, student monitoring, and role-based account management, with Vercel API functions connected to Supabase.

## Engagement Features

- active learning-time tracking with idle and background-tab exclusion
- private student check-ins and help requests
- faculty feedback, reminders, recognition, and clarification requests
- announcements with student acknowledgement
- pulse checks with student responses
- private or faculty-shared learning journals
- weekly faculty summaries for activity, follow-up, help requests, and coaching
- reusable question bank with reference rubrics and keywords
- student submissions with similarity scanning and faculty-reviewed auto-grading
- CSV exports for marks and AI support conversations
- assignment-aware AI student support with a built-in DBMS tutor fallback

## Local Frontend

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173/login`.

`npm run dev` starts:

- local Supabase API adapter: `http://127.0.0.1:8787`
- Vite frontend: `http://127.0.0.1:5173`

## Supabase Setup

1. Create a Supabase project.
2. Open Supabase SQL Editor.
3. Run `supabase/schema.sql`.
4. Copy `.env.example` to `.env`.
5. Fill in:

```bash
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
VITE_SUPABASE_ANON_KEY="your-public-anon-key"
SUPABASE_URL="https://your-project-ref.supabase.co"
SUPABASE_ANON_KEY="your-public-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

The API also supports Vercel Marketplace Supabase variables:

```bash
SUPABASE_PUBLISHABLE_KEY="your-publishable-key"
SUPABASE_SECRET_KEY="your-secret-key"
```

6. Seed test data:

```bash
npm run seed:supabase
```

If you added sensitive Supabase variables in Vercel, `vercel env pull` may write `[SENSITIVE]` placeholders instead of plaintext secrets. For local seeding, create a local `.env` file with real Supabase values:

```bash
npm run seed:supabase
```

Seeded development credentials:

- Super Admin: `admin` / `admin123`
- Faculty: `faculty.demo` / `faculty123`
- Student: `student.demo` / `student123`

`npm run seed:supabase` replaces existing portal data with the local demo seed. Use Super Admin to create additional faculty and student accounts.

## Local API Testing

The API files in `api/` are Vercel serverless functions. The local adapter in `server/local-api.mjs` runs those same handlers during `npm run dev`.

Available API routes:

```bash
GET    /api/health
POST   /api/login
POST   /api/bootstrap-admin
GET    /api/summary
GET    /api/users
POST   /api/users
PATCH  /api/users
DELETE /api/users?id=<user-id>
GET    /api/subjects
POST   /api/subjects
PATCH  /api/subjects
DELETE /api/subjects?id=<subject-id>
GET    /api/assignments
POST   /api/assignments
PATCH  /api/assignments
DELETE /api/assignments?id=<assignment-id>
GET    /api/learning
POST   /api/learning
PATCH  /api/learning
DELETE /api/learning?id=<learning-record-id>
GET    /api/engagement
POST   /api/engagement
PATCH  /api/engagement
DELETE /api/engagement?id=<record-id>
```

User management requires Super Admin credentials and a server-side Supabase service key. Faculty credentials can manage student groups, assignments, and quizzes.

```bash
curl -X POST http://127.0.0.1:8787/api/users \
  -H "Content-Type: application/json" \
  -H "X-User-Email: admin" \
  -H "X-User-Password: admin123" \
  -d "{\"name\":\"Faculty Name\",\"email\":\"faculty@learningportal.test\",\"password\":\"change-me\",\"role\":\"faculty\",\"title\":\"Faculty\"}"
```

Use `POST /api/bootstrap-admin` only once on an empty database to create the first Super Admin. It requires the server-only `BOOTSTRAP_ADMIN_TOKEN` value in the `X-Bootstrap-Token` header and returns `409` after an admin already exists.

The engagement API stores check-ins, private help requests, feedback, reminders, announcements, pulse checks, journals, recognition, and active-time sessions in `engagement_records`. Existing Supabase projects must run `supabase/migrations/20260823_engagement_records.sql` once before deploying this release.

The learning API stores question-bank rubrics, student submissions, similarity and auto-grade results, and assignment-support conversations in `learning_records`. Existing projects must also run `supabase/migrations/20260823_learning_records.sql`. Set the server-only `OPENAI_API_KEY` and optional `OPENAI_MODEL` variables to enable hosted AI responses; without them, the portal uses its built-in assignment-aware DBMS tutor.

To test through Vercel CLI instead, run:

```bash
npm run dev:vercel
```

Then open `http://localhost:3000/login`.

## Production Build

```bash
npm run build
npm run preview
```

The deployable static output is generated in `dist/`.

## Deploy on Vercel

Add these Vercel environment variables, or connect Supabase from the Vercel Marketplace so Vercel syncs them for you:

```bash
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

If Vercel provides the newer Marketplace names, use:

```bash
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
```

Build command:

```bash
npm run build
```

Output directory:

```bash
dist
```

## Security Note

This prototype stores demo passwords in a simple table to match the current portal behavior. Before real production use, migrate to Supabase Auth or hashed passwords with server-only verification.
