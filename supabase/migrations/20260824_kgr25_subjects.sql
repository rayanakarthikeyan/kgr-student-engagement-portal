BEGIN;

INSERT INTO public.subjects (
  id,
  name,
  type,
  semester,
  section,
  department,
  academic_year,
  is_active
)
VALUES
  (
    'sub-java-cse-a',
    'Object Oriented Programming through JAVA',
    'Theory + Lab',
    'Semester 3',
    'CSE A',
    'Computer Science',
    '2026-27',
    true
  ),
  (
    'sub-dbms-cse-a',
    'Database Management Systems (DBMS)',
    'Theory + Lab',
    'Semester 3',
    'CSE A',
    'Computer Science',
    '2026-27',
    true
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  semester = EXCLUDED.semester,
  section = EXCLUDED.section,
  department = EXCLUDED.department,
  academic_year = EXCLUDED.academic_year,
  is_active = EXCLUDED.is_active;

COMMIT;
