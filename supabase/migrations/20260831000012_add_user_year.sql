ALTER TABLE public.users ADD COLUMN IF NOT EXISTS year TEXT;
CREATE INDEX IF NOT EXISTS users_year_idx ON public.users (year);
