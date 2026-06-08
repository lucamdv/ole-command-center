CREATE TABLE public.audit_ignores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  scope text NOT NULL CHECK (scope IN ('apolice','apolice_tipo')),
  apolice text NOT NULL,
  tipo_erro text,
  motivo text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX audit_ignores_unique_idx
  ON public.audit_ignores (user_id, apolice, COALESCE(tipo_erro, ''));

CREATE INDEX audit_ignores_user_idx ON public.audit_ignores (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_ignores TO authenticated;
GRANT ALL ON public.audit_ignores TO service_role;

ALTER TABLE public.audit_ignores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own audit ignores"
  ON public.audit_ignores
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);