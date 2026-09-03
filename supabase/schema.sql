-- Schema for Faculty Learning Portal

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  title TEXT,
  roll_number TEXT,
  batch TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS roll_number TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS batch TEXT;

CREATE INDEX IF NOT EXISTS users_email_idx ON public.users (email);
CREATE INDEX IF NOT EXISTS users_role_idx ON public.users (role);
CREATE INDEX IF NOT EXISTS users_roll_number_idx ON public.users (roll_number);
CREATE INDEX IF NOT EXISTS users_batch_idx ON public.users (batch);

-- Subjects table
CREATE TABLE IF NOT EXISTS public.subjects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  semester TEXT NOT NULL,
  section TEXT NOT NULL,
  department TEXT,
  academic_year TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS academic_year TEXT;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS subjects_type_idx ON public.subjects (type);
CREATE INDEX IF NOT EXISTS subjects_semester_idx ON public.subjects (semester);

-- Assignments table
CREATE TABLE IF NOT EXISTS public.assignments (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subject_id TEXT NOT NULL REFERENCES public.subjects(id),
  due_date DATE NOT NULL,
  assigned INTEGER DEFAULT 0,
  submitted INTEGER DEFAULT 0,
  pending INTEGER DEFAULT 0,
  reviewed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS assignments_subject_idx ON public.assignments (subject_id);
CREATE INDEX IF NOT EXISTS assignments_due_date_idx ON public.assignments (due_date);

-- Flexible engagement records for communication, coaching, and active-time tracking.
CREATE TABLE IF NOT EXISTS public.engagement_records (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  author_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  subject_id TEXT REFERENCES public.subjects(id) ON DELETE SET NULL,
  assignment_id TEXT REFERENCES public.assignments(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS engagement_records_kind_idx ON public.engagement_records (kind);
CREATE INDEX IF NOT EXISTS engagement_records_author_idx ON public.engagement_records (author_id);
CREATE INDEX IF NOT EXISTS engagement_records_target_idx ON public.engagement_records (target_user_id);
CREATE INDEX IF NOT EXISTS engagement_records_created_idx ON public.engagement_records (created_at DESC);

-- Questions, submissions, grading analysis, and assignment-support conversations.
CREATE TABLE IF NOT EXISTS public.learning_records (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  author_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subject_id TEXT REFERENCES public.subjects(id) ON DELETE SET NULL,
  assignment_id TEXT REFERENCES public.assignments(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  score NUMERIC,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS learning_records_kind_idx ON public.learning_records (kind);
CREATE INDEX IF NOT EXISTS learning_records_author_idx ON public.learning_records (author_id);
CREATE INDEX IF NOT EXISTS learning_records_assignment_idx ON public.learning_records (assignment_id);
CREATE INDEX IF NOT EXISTS learning_records_created_idx ON public.learning_records (created_at DESC);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read users for prototype API" ON public.users;
DROP POLICY IF EXISTS "Allow anon read subjects for prototype API" ON public.subjects;
DROP POLICY IF EXISTS "Allow anon read assignments for prototype API" ON public.assignments;

CREATE POLICY "Allow anon read users for prototype API"
  ON public.users FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon read subjects for prototype API"
  ON public.subjects FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon read assignments for prototype API"
  ON public.assignments FOR SELECT
  TO anon
  USING (true);
