-- Schema for Faculty Learning Portal
-- Student profiles and mandatory enrollment trigger are installed below.

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT,
  password_hash TEXT,
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
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE public.users ALTER COLUMN password DROP NOT NULL;

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
  max_marks NUMERIC NOT NULL DEFAULT 10,
  description TEXT NOT NULL DEFAULT '',
  starter_code TEXT NOT NULL DEFAULT '',
  test_cases JSONB NOT NULL DEFAULT '[]'::jsonb,
  assigned_user_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  assigned INTEGER DEFAULT 0,
  submitted INTEGER DEFAULT 0,
  pending INTEGER DEFAULT 0,
  reviewed INTEGER DEFAULT 0,
  assignment_type TEXT NOT NULL DEFAULT 'theory' CHECK (assignment_type IN ('theory', 'practice', 'assessment', 'lab')),
  curriculum_item_id TEXT NOT NULL DEFAULT '',
  course_code TEXT NOT NULL DEFAULT 'DBMS' CHECK (course_code IN ('JAVA', 'DBMS')),
  unit_number INTEGER NOT NULL DEFAULT 1 CHECK (unit_number BETWEEN 1 AND 5),
  duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (duration_minutes BETWEEN 1 AND 480),
  work_mode TEXT NOT NULL DEFAULT 'response' CHECK (work_mode IN ('response', 'mcq', 'ide')),
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS max_marks NUMERIC NOT NULL DEFAULT 10;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS starter_code TEXT NOT NULL DEFAULT '';
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS test_cases JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS assigned_user_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS assignment_type TEXT NOT NULL DEFAULT 'theory';
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS curriculum_item_id TEXT NOT NULL DEFAULT '';
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS course_code TEXT NOT NULL DEFAULT 'DBMS';
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS unit_number INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 30;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS work_mode TEXT NOT NULL DEFAULT 'response';
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS questions JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS assignments_subject_idx ON public.assignments (subject_id);
CREATE INDEX IF NOT EXISTS assignments_due_date_idx ON public.assignments (due_date);
CREATE INDEX IF NOT EXISTS assignments_type_course_unit_idx ON public.assignments (assignment_type, course_code, unit_number);

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

-- No anon policies are installed. All relational data is accessed through the
-- server API with a service key after signed-session and RBAC validation.

-- Production academic platform tables. Browser clients never receive the service key;
-- access is mediated by the signed-session API and its role checks.
CREATE TABLE IF NOT EXISTS public.courses (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL CHECK (code IN ('JAVA', 'DBMS')),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  faculty_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.enrollments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  tracks JSONB NOT NULL DEFAULT '["theory", "lab"]'::jsonb,
  progress NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  study_minutes INTEGER NOT NULL DEFAULT 0 CHECK (study_minutes >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'withdrawn')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS public.resources (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  topic TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('youtube', 'pdf')),
  external_url TEXT NOT NULL CHECK (external_url ~ '^https://'),
  duration_minutes INTEGER NOT NULL DEFAULT 0 CHECK (duration_minutes >= 0),
  curriculum_item_id TEXT NOT NULL DEFAULT '',
  course_code TEXT NOT NULL DEFAULT 'JAVA' CHECK (course_code IN ('JAVA', 'DBMS')),
  unit_number INTEGER NOT NULL DEFAULT 1 CHECK (unit_number BETWEEN 1 AND 5),
  due_date DATE,
  assigned_user_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS curriculum_item_id TEXT NOT NULL DEFAULT '';
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS course_code TEXT NOT NULL DEFAULT 'JAVA';
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS unit_number INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS assigned_user_ids JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.assessments (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes BETWEEN 1 AND 480),
  total_marks NUMERIC(8,2) NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'available', 'closed')),
  settings JSONB NOT NULL DEFAULT '{"maxViolations": 2, "fullscreenRequired": true}'::jsonb,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.submissions (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  code TEXT NOT NULL DEFAULT '',
  language TEXT CHECK (language IS NULL OR language IN ('java', 'sql')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'auto_submitted', 'graded')),
  score NUMERIC(8,2),
  violation_count INTEGER NOT NULL DEFAULT 0 CHECK (violation_count >= 0),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id TEXT REFERENCES public.courses(id) ON DELETE CASCADE,
  resource_id TEXT REFERENCES public.resources(id) ON DELETE CASCADE,
  assessment_id TEXT REFERENCES public.assessments(id) ON DELETE CASCADE,
  assignment_id TEXT REFERENCES public.assignments(id) ON DELETE CASCADE,
  submission_id TEXT REFERENCES public.submissions(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN (
    'video_play', 'video_pause', 'video_progress', 'video_complete', 'pdf_dwell',
    'exam_started', 'exam_violation', 'exam_autosave', 'exam_submitted',
    'editor_change', 'editor_paste', 'code_run', 'code_submit'
  )),
  duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds BETWEEN 0 AND 3600),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS enrollments_user_idx ON public.enrollments (user_id);
CREATE INDEX IF NOT EXISTS enrollments_course_idx ON public.enrollments (course_id);
CREATE INDEX IF NOT EXISTS resources_course_published_idx ON public.resources (course_id, is_published);
CREATE INDEX IF NOT EXISTS assessments_course_status_idx ON public.assessments (course_id, status);
CREATE INDEX IF NOT EXISTS submissions_assessment_idx ON public.submissions (assessment_id);
CREATE INDEX IF NOT EXISTS submissions_user_idx ON public.submissions (user_id);
CREATE INDEX IF NOT EXISTS activity_logs_user_time_idx ON public.activity_logs (user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS activity_logs_course_kind_idx ON public.activity_logs (course_id, kind, occurred_at DESC);
CREATE INDEX IF NOT EXISTS activity_logs_resource_idx ON public.activity_logs (resource_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS activity_logs_assignment_idx ON public.activity_logs (assignment_id, occurred_at DESC);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS contact_number TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS department TEXT CHECK (department IN ('CSE', 'CSM', 'CSD'));
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS section TEXT CHECK (section IN ('A', 'B', 'C', 'D', 'E'));
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS college TEXT NOT NULL DEFAULT 'KG Reddy College of Engineering and Technology';
CREATE INDEX IF NOT EXISTS users_cohort_idx ON public.users (role, department, section);
CREATE UNIQUE INDEX IF NOT EXISTS users_student_roll_unique ON public.users (upper(roll_number)) WHERE role = 'student' AND roll_number IS NOT NULL;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS hints JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS execution_environment TEXT NOT NULL DEFAULT 'runner' CHECK (execution_environment IN ('runner', 'external'));

INSERT INTO public.courses (id, code, title) VALUES
  ('course-java', 'JAVA', 'Object Oriented Programming through Java'),
  ('course-dbms', 'DBMS', 'Database Management Systems')
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.enroll_kgr_student() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.role = 'student' THEN
    INSERT INTO public.enrollments (id, user_id, course_id, tracks)
    SELECT 'enr-' || NEW.id || '-' || c.id, NEW.id, c.id, '["theory","lab"]'::jsonb
    FROM public.courses c WHERE c.id IN ('course-java', 'course-dbms')
    ON CONFLICT (user_id, course_id) DO UPDATE SET tracks = EXCLUDED.tracks;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enroll_kgr_student() FROM PUBLIC;
DROP TRIGGER IF EXISTS enroll_kgr_student_trigger ON public.users;
CREATE TRIGGER enroll_kgr_student_trigger AFTER INSERT OR UPDATE OF role ON public.users
FOR EACH ROW EXECUTE FUNCTION public.enroll_kgr_student();

INSERT INTO public.enrollments (id, user_id, course_id, tracks)
SELECT 'enr-' || u.id || '-' || c.id, u.id, c.id, '["theory","lab"]'::jsonb
FROM public.users u CROSS JOIN public.courses c
WHERE u.role = 'student' AND c.id IN ('course-java', 'course-dbms')
ON CONFLICT (user_id, course_id) DO UPDATE SET tracks = EXCLUDED.tracks;

-- Aggregate before returning analytics; never transfer keystroke metadata to the roster.
CREATE OR REPLACE FUNCTION public.kgr_activity_summary() RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) FROM (
    SELECT min(id) AS id, user_id, resource_id, assignment_id, kind,
      sum(duration_seconds) AS duration_seconds, count(*) AS event_count,
      max(occurred_at) AS occurred_at,
      jsonb_build_object('completionPercent', max(CASE
        WHEN jsonb_typeof(metadata->'completionPercent') = 'number'
        THEN least(100, greatest(0, (metadata->>'completionPercent')::numeric)) ELSE 0 END)) AS metadata
    FROM public.activity_logs GROUP BY user_id, resource_id, assignment_id, kind
  ) s;
$$;
REVOKE ALL ON FUNCTION public.kgr_activity_summary() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kgr_activity_summary() TO service_role;

CREATE OR REPLACE FUNCTION public.kgr_submission_summary() RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) FROM (
    SELECT id, kind, author_id, subject_id, assignment_id, title, status, score,
      created_at, updated_at, ''::text AS body,
      jsonb_build_object('hints_used', coalesce(metadata->'hints_used', '[]'::jsonb)) AS metadata
    FROM public.learning_records WHERE kind = 'submission' ORDER BY created_at DESC
  ) s;
$$;
REVOKE ALL ON FUNCTION public.kgr_submission_summary() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kgr_submission_summary() TO service_role;

-- Course cohorts for publishing rules
CREATE TABLE IF NOT EXISTS public.course_cohorts (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  target_audience TEXT NOT NULL,
  department TEXT,
  academic_year TEXT,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS course_cohorts_course_idx ON public.course_cohorts (course_id);

ALTER TABLE public.course_cohorts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Course cohorts are viewable by everyone" ON public.course_cohorts FOR SELECT USING (true);
CREATE POLICY "Only faculty can insert cohorts" ON public.course_cohorts FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()::text AND role IN ('faculty', 'admin'))
);
