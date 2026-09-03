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
