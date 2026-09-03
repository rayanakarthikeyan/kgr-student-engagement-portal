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

ALTER TABLE public.learning_records ENABLE ROW LEVEL SECURITY;
