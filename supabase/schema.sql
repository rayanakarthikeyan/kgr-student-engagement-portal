-- Schema for KGR Student Engagement Portal

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  title TEXT
);

CREATE INDEX IF NOT EXISTS users_email_idx ON public.users (email);

-- Subjects table
CREATE TABLE IF NOT EXISTS public.subjects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  semester TEXT NOT NULL,
  section TEXT NOT NULL
);

-- Assignments table
CREATE TABLE IF NOT EXISTS public.assignments (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subject_id TEXT NOT NULL REFERENCES public.subjects(id),
  due_date DATE NOT NULL,
  assigned INTEGER DEFAULT 0,
  submitted INTEGER DEFAULT 0,
  pending INTEGER DEFAULT 0,
  reviewed INTEGER DEFAULT 0
);

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
