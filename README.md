# Academia Labs

Full-stack academic learning and lab assessment platform for JAVA and DBMS theory/lab tracks. The application combines external learning resources, engagement telemetry, proctored assessments, and a Monaco-based coding workspace in one role-aware interface.

## Included modules

- Student self-registration and separate student/faculty portals
- Signed bearer sessions, PBKDF2-SHA512 password hashing, server-side RBAC, and inactive-account enforcement
- JAVA and DBMS course enrollment with theory and lab tracks
- Unit-wise KGR25 JAVA/DBMS theory and lab catalog loaded from the supplied curriculum
- Faculty assignment composer for theory, practice, proctored assessments, and lab experiments with deadlines and explicit student targeting
- Student draft/final submission workflow with assignment status and deadline enforcement
- YouTube playback tracking through the IFrame Player API
- Focused PDF/Google Drive reading-time tracking using viewport, focus, and visibility state
- Proctored exams with fullscreen enforcement, focus-loss detection, warning/auto-submit policy, timer recovery, and autosave
- Monaco Java/SQL editor with run/submit controls, expected/actual output comparison, paste detection, error logging, and debugging timelines
- Faculty resource manager, assessment manager, cohort health table, and per-student activity timeline
- Zero-storage resource architecture: only external URLs and metadata are stored
- One-minute engagement batching and capped roster rendering for 500-student cohorts
- Light/dark themes and responsive desktop/mobile layouts

## Stack

- React 19 + Vite + TypeScript
- Tailwind CSS 4 and custom design tokens
- Monaco Editor, Lucide React, Framer Motion
- Vercel Node API functions
- Supabase PostgreSQL with RLS enabled and server-mediated access

## Local development

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. The local API runs on `http://127.0.0.1:8787` and uses `server/db.seed.json` when valid Supabase credentials are not configured.

Students create their own accounts from the registration screen. The local baseline contains the faculty profile only; set `FACULTY_PASSWORD` in ignored `.env.local` to enable local faculty login. `npm run seed:supabase` preserves existing account passwords, users and coursework; new faculty accounts require `FACULTY_PASSWORD`.

## Database setup

For a new project, run [supabase/schema.sql](supabase/schema.sql) in the Supabase SQL editor. For an existing portal database, apply the migrations in order, including [20260824_academic_platform.sql](supabase/migrations/20260824_academic_platform.sql), [20260824_kgr25_subjects.sql](supabase/migrations/20260824_kgr25_subjects.sql), and [20260826_unit_coursework_and_scale.sql](supabase/migrations/20260826_unit_coursework_and_scale.sql).

The production tables are:

- `users`
- `courses`
- `enrollments`
- `resources`
- `assessments`
- `submissions`
- `activity_logs`

`subjects`, `assignments`, and `learning_records` hold the unit coursework and student responses. Anonymous policies are removed by the platform migration; API functions use the service role only after signed-session and role validation.

## Environment

Copy `.env.example` to `.env.local` and provide:

```dotenv
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="server-only-service-key"
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="public-anon-key"
AUTH_SECRET="at-least-32-random-bytes"
```

`SUPABASE_SERVICE_ROLE_KEY` and `AUTH_SECRET` must never use a `VITE_` prefix or be exposed to the browser.

## Code runner

The portal does not pretend to execute Java or SQL when no runner is configured: Run returns a clear service-unavailable error, while drafting and submission remain available. For real Java compilation and isolated SQL execution in production, configure:

```dotenv
CODE_RUNNER_URL="https://your-isolated-runner.example/run"
CODE_RUNNER_TOKEN="server-to-server-token"
```

The runner receives:

```json
{
  "language": "java",
  "code": "...",
  "stdin": "...",
  "timeoutMs": 5000,
  "memoryMb": 256
}
```

It must return `status`, `stdout`, `stderr`, and `durationMs`. Run untrusted code in disposable containers with network disabled, strict CPU/memory/process limits, and no host filesystem mounts.

## Verification

```bash
npm run typecheck
npm run build
npm audit
```

Vercel is the configured deployment target. Add the server-only environment variables in the Vercel project before deployment and apply the Supabase migration first.

## KGR25 Curriculum And Cohorts (2026-08-30)

- Apply `supabase/migrations/20260830_curriculum_profiles.sql` before deploying this release. It adds profile fields, assignment hints, atomic dual-course enrollment, and compact faculty analytics functions. Existing students are enrolled in both courses without deleting their work.
- Registration collects name, email, Indian mobile number, department (CSE/CSM/CSD), section (A-E), roll number and password. The college is fixed to KG Reddy College of Engineering and Technology.
- `server/curriculum-templates.js` has all 31 syllabus experiments and 10 unit practice templates, each with two editable MCQs and one coding activity. Tasks, fixtures and hints are teaching examples added to the syllabus, not official answer keys.
- Faculty loads a unit/experiment, edits questions, sample input, expected output/observations and hints, chooses a deadline and recipients, then explicitly enables/publishes it. The template API is faculty-only. Published work is editable until a student saves an attempt; after that, publish a new copy.
- ER design and normalization use written responses. GUI, JDBC, timed threading and legacy applet experiments require an external lab runtime. PL/SQL examples require a faculty-managed Oracle environment. Applets are legacy syllabus material, not browser-executable activities; see [Oracle JDK 26 migration guide](https://docs.oracle.com/en/java/javase/26/migrate/jdk-migration-guide.pdf).
- Faculty can filter recipients and reports by department/section. Reports preview the complete filtered roster or one student's insights before printing/saving as PDF. Roster screens render 50 students at a time.
- Analytics use database aggregates and load source code only for the selected student. This reduces transfer size; it is not a measured guarantee of 500 concurrent students. Size and stress-test the isolated runner separately.
- `npm test` runs local, in-memory registration, enrollment, access-control, template and grading tests without touching production.

Production database migration `20260830_curriculum_profiles` was applied and verified on 2026-08-30, including dual-course enrollment and both analytics functions. Deploy this source only after that migration. No temporary migration endpoint or credential is retained in the repository.
