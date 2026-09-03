CREATE TABLE IF NOT EXISTS public.ai_chat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  challenge_id TEXT NOT NULL,
  role TEXT NOT NULL, -- 'user' or 'model'
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_chat_logs_user_idx ON public.ai_chat_logs (user_id);
CREATE INDEX IF NOT EXISTS ai_chat_logs_challenge_idx ON public.ai_chat_logs (challenge_id);
CREATE INDEX IF NOT EXISTS ai_chat_logs_created_idx ON public.ai_chat_logs (created_at DESC);

ALTER TABLE public.ai_chat_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own logs
CREATE POLICY "Users can insert their own AI chat logs" 
  ON public.ai_chat_logs FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid()::text = user_id);

-- Allow authenticated users to read their own logs
CREATE POLICY "Users can read their own AI chat logs" 
  ON public.ai_chat_logs FOR SELECT 
  TO authenticated 
  USING (auth.uid()::text = user_id);

-- Allow faculty to read all AI chat logs (assuming faculty have service role or we rely on app-level checks for now via service_role key, but let's add a basic RLS for users to see only their own)
