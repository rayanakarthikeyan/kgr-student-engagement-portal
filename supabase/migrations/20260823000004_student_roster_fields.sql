ALTER TABLE public.users ADD COLUMN IF NOT EXISTS roll_number TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS batch TEXT;

CREATE INDEX IF NOT EXISTS users_roll_number_idx ON public.users (roll_number);
CREATE INDEX IF NOT EXISTS users_batch_idx ON public.users (batch);
