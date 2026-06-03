CREATE TABLE public.oliver_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Nova conversa',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.oliver_threads TO anon, authenticated;
GRANT ALL ON public.oliver_threads TO service_role;
ALTER TABLE public.oliver_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public manage oliver_threads" ON public.oliver_threads FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_oliver_threads_updated BEFORE UPDATE ON public.oliver_threads
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.oliver_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.oliver_threads(id) ON DELETE CASCADE,
  role text NOT NULL,
  parts jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_oliver_messages_thread ON public.oliver_messages(thread_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.oliver_messages TO anon, authenticated;
GRANT ALL ON public.oliver_messages TO service_role;
ALTER TABLE public.oliver_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public manage oliver_messages" ON public.oliver_messages FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.oliver_memory (
  id uuid PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  content text NOT NULL DEFAULT '# Memória do Oléver

Aqui o Oléver registra aprendizados, regras de negócio e preferências da operação OLÉ.
',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.oliver_memory TO anon, authenticated;
GRANT ALL ON public.oliver_memory TO service_role;
ALTER TABLE public.oliver_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public manage oliver_memory" ON public.oliver_memory FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_oliver_memory_updated BEFORE UPDATE ON public.oliver_memory
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
INSERT INTO public.oliver_memory (id) VALUES ('00000000-0000-0000-0000-000000000001'::uuid) ON CONFLICT (id) DO NOTHING;