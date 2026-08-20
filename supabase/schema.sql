-- Schema for KGR Student Engagement Portal

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  title TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS users_email_idx ON public.users (email);
CREATE INDEX IF NOT EXISTS users_role_idx ON public.users (role);

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

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

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
