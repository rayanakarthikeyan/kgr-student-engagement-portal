BEGIN;

DELETE FROM public.activity_logs
WHERE user_id IN ('u-student-demo', 'u-demo-student')
   OR resource_id IN (
     'resource-java-polymorphism',
     'resource-java-collections',
     'resource-dbms-normalization',
     'resource-dbms-transactions'
   )
   OR assessment_id IN ('assessment-java-oop', 'assessment-dbms-normalization')
   OR assignment_id IN (
     'act-dbms-er-model',
     'act-dbms-sql-practice',
     'act-dbms-normalization-quiz',
     'act-dbms-transactions'
   );

DELETE FROM public.submissions
WHERE user_id IN ('u-student-demo', 'u-demo-student')
   OR assessment_id IN ('assessment-java-oop', 'assessment-dbms-normalization');

DELETE FROM public.enrollments WHERE user_id IN ('u-student-demo', 'u-demo-student');

DELETE FROM public.learning_records
WHERE author_id IN ('u-student-demo', 'u-demo-student')
   OR assignment_id IN (
     'act-dbms-er-model',
     'act-dbms-sql-practice',
     'act-dbms-normalization-quiz',
     'act-dbms-transactions'
   );

DELETE FROM public.engagement_records
WHERE author_id IN ('u-student-demo', 'u-demo-student')
   OR target_user_id IN ('u-student-demo', 'u-demo-student')
   OR id LIKE 'eng-demo-%'
   OR assignment_id IN (
     'act-dbms-er-model',
     'act-dbms-sql-practice',
     'act-dbms-normalization-quiz',
     'act-dbms-transactions'
   );

DELETE FROM public.resources
WHERE id IN (
  'resource-java-polymorphism',
  'resource-java-collections',
  'resource-dbms-normalization',
  'resource-dbms-transactions'
);

DELETE FROM public.assessments
WHERE id IN ('assessment-java-oop', 'assessment-dbms-normalization');

DELETE FROM public.assignments
WHERE id IN (
  'act-dbms-er-model',
  'act-dbms-sql-practice',
  'act-dbms-normalization-quiz',
  'act-dbms-transactions'
);

DELETE FROM public.users
WHERE id IN ('u-student-demo', 'u-demo-student')
   OR email = 'student.demo@kgr.ac.in'
   OR roll_number = 'DEMO-DBMS-01';

UPDATE public.users
SET name = 'KGR Faculty', title = 'Faculty'
WHERE id IN ('u-faculty-demo', 'u-demo-faculty');

COMMIT;
