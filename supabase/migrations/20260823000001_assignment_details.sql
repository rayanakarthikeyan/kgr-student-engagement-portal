ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS max_marks NUMERIC NOT NULL DEFAULT 10;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS starter_code TEXT NOT NULL DEFAULT '';
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS test_cases JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS assigned_user_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
