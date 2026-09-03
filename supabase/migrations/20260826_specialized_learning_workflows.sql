ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS work_mode TEXT NOT NULL DEFAULT 'response',
  ADD COLUMN IF NOT EXISTS questions JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.assignments DROP CONSTRAINT IF EXISTS assignments_work_mode_check;
ALTER TABLE public.assignments
  ADD CONSTRAINT assignments_work_mode_check CHECK (work_mode IN ('response', 'mcq', 'ide'));

UPDATE public.assignments
SET work_mode = CASE
  WHEN assignment_type IN ('practice', 'lab') THEN 'ide'
  WHEN assignment_type = 'assessment' THEN 'mcq'
  ELSE 'response'
END
WHERE work_mode = 'response';

ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS curriculum_item_id TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS course_code TEXT NOT NULL DEFAULT 'JAVA',
  ADD COLUMN IF NOT EXISTS unit_number INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS assigned_user_ids JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.resources DROP CONSTRAINT IF EXISTS resources_course_code_check;
ALTER TABLE public.resources
  ADD CONSTRAINT resources_course_code_check CHECK (course_code IN ('JAVA', 'DBMS'));

ALTER TABLE public.resources DROP CONSTRAINT IF EXISTS resources_unit_number_check;
ALTER TABLE public.resources
  ADD CONSTRAINT resources_unit_number_check CHECK (unit_number BETWEEN 1 AND 5);

CREATE INDEX IF NOT EXISTS resources_course_unit_deadline_idx
  ON public.resources (course_code, unit_number, due_date);
