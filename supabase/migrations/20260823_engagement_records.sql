CREATE TABLE IF NOT EXISTS public.engagement_records (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  author_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  subject_id TEXT REFERENCES public.subjects(id) ON DELETE SET NULL,
  assignment_id TEXT REFERENCES public.assignments(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS engagement_records_kind_idx ON public.engagement_records (kind);
CREATE INDEX IF NOT EXISTS engagement_records_author_idx ON public.engagement_records (author_id);
CREATE INDEX IF NOT EXISTS engagement_records_target_idx ON public.engagement_records (target_user_id);
CREATE INDEX IF NOT EXISTS engagement_records_created_idx ON public.engagement_records (created_at DESC);

ALTER TABLE public.engagement_records ENABLE ROW LEVEL SECURITY;
