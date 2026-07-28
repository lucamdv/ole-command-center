ALTER EXTENSION vector SET SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.match_oliver_knowledge(query_embedding extensions.vector, match_count integer DEFAULT 8, kind_filter text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, kind text, ref_id text, title text, content text, metadata jsonb, similarity double precision)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
  SELECT k.id, k.kind, k.ref_id, k.title, k.content, k.metadata,
         1 - (k.embedding OPERATOR(extensions.<=>) query_embedding) AS similarity
  FROM public.oliver_knowledge k
  WHERE kind_filter IS NULL OR k.kind = kind_filter
  ORDER BY k.embedding OPERATOR(extensions.<=>) query_embedding
  LIMIT match_count;
$function$;