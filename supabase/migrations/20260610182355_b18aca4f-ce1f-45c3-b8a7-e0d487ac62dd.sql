CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.oliver_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  ref_id text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  embedding vector(3072) NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, ref_id)
);

GRANT ALL ON public.oliver_knowledge TO service_role;

ALTER TABLE public.oliver_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Server only - no client access"
  ON public.oliver_knowledge FOR ALL
  TO authenticated
  USING (false) WITH CHECK (false);

CREATE INDEX IF NOT EXISTS oliver_knowledge_kind_idx ON public.oliver_knowledge (kind);

CREATE OR REPLACE FUNCTION public.match_oliver_knowledge(
  query_embedding vector(3072),
  match_count int DEFAULT 8,
  kind_filter text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  kind text,
  ref_id text,
  title text,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT k.id, k.kind, k.ref_id, k.title, k.content, k.metadata,
         1 - (k.embedding <=> query_embedding) AS similarity
  FROM public.oliver_knowledge k
  WHERE kind_filter IS NULL OR k.kind = kind_filter
  ORDER BY k.embedding <=> query_embedding
  LIMIT match_count;
$$;