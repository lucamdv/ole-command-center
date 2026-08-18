CREATE TABLE public.audit_resolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apolice text NOT NULL,
  tipo_erro text NOT NULL,
  endosso text,
  run_id uuid REFERENCES public.audit_runs(id) ON DELETE SET NULL,
  first_seen_at timestamptz,
  resolved_at timestamptz NOT NULL DEFAULT now(),
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  motivo text,
  reopened_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX audit_resolutions_active_key
  ON public.audit_resolutions (apolice, tipo_erro)
  WHERE reopened_at IS NULL;

CREATE INDEX audit_resolutions_resolved_at_idx ON public.audit_resolutions (resolved_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_resolutions TO authenticated;
GRANT ALL ON public.audit_resolutions TO service_role;

ALTER TABLE public.audit_resolutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read audit resolutions"
  ON public.audit_resolutions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert audit resolutions"
  ON public.audit_resolutions FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = resolved_by) OR (resolved_by IS NULL));

CREATE POLICY "Creators or admins can update audit resolutions"
  ON public.audit_resolutions FOR UPDATE TO authenticated
  USING ((resolved_by = auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK ((resolved_by = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Creators or admins can delete audit resolutions"
  ON public.audit_resolutions FOR DELETE TO authenticated
  USING ((resolved_by = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER touch_audit_resolutions
  BEFORE UPDATE ON public.audit_resolutions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();