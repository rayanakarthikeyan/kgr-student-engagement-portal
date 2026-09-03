BEGIN;

ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS assignment_type TEXT NOT NULL DEFAULT 'theory';
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS curriculum_item_id TEXT NOT NULL DEFAULT '';
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS course_code TEXT NOT NULL DEFAULT 'DBMS';
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS unit_number INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 30;

CREATE INDEX IF NOT EXISTS assignments_type_course_unit_idx
  ON public.assignments (assignment_type, course_code, unit_number);
CREATE INDEX IF NOT EXISTS assignments_due_type_idx
  ON public.assignments (due_date, assignment_type);

ALTER TABLE public.activity_logs
  ADD COLUMN IF NOT EXISTS assignment_id TEXT REFERENCES public.assignments(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS activity_logs_assignment_idx
  ON public.activity_logs (assignment_id, occurred_at DESC);

COMMIT;
