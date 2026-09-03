ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE public.users ALTER COLUMN password DROP NOT NULL;

DROP POLICY IF EXISTS "Allow anon read users for prototype API" ON public.users;
DROP POLICY IF EXISTS "Allow anon read subjects for prototype API" ON public.subjects;
DROP POLICY IF EXISTS "Allow anon read assignments for prototype API" ON public.assignments;

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
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
  submission_id TEXT REFERENCES public.submissions(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('video_play','video_pause','video_progress','video_complete','pdf_dwell','exam_started','exam_violation','exam_autosave','exam_submitted','editor_change','editor_paste','code_run','code_submit')),
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

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

INSERT INTO public.courses (id, code, title, description)
VALUES
  ('course-java', 'JAVA', 'Object-Oriented Programming with Java', 'JAVA theory and lab tracks'),
  ('course-dbms', 'DBMS', 'Database Management Systems', 'DBMS theory and lab tracks')
ON CONFLICT (id) DO NOTHING;
