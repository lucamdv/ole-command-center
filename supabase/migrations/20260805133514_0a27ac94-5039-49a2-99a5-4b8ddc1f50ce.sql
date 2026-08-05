CREATE TABLE public.endorsement_extraction_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'running',
  total_apolices integer NOT NULL DEFAULT 0,
  duration_ms integer,
  error_message text,
  raw jsonb,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.endorsement_extraction_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.endorsement_extraction_runs(id) ON DELETE CASCADE,
  policy_number text NOT NULL,
  last_sequencial_endosso_used integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_endorsement_items_run ON public.endorsement_extraction_items(run_id);

CREATE TABLE public.endorsement_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_number text NOT NULL UNIQUE,
  motivo text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.endorsement_extraction_runs TO service_role;
GRANT ALL ON public.endorsement_extraction_items TO service_role;
GRANT SELECT ON public.endorsement_exceptions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.endorsement_exceptions TO authenticated;
GRANT ALL ON public.endorsement_exceptions TO service_role;

ALTER TABLE public.endorsement_extraction_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.endorsement_extraction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.endorsement_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No client access to extraction runs"
  ON public.endorsement_extraction_runs FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "No client access to extraction items"
  ON public.endorsement_extraction_items FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE POLICY "Authenticated can read extraction exceptions"
  ON public.endorsement_exceptions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert extraction exceptions"
  ON public.endorsement_exceptions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
CREATE POLICY "Admins can update extraction exceptions"
  ON public.endorsement_exceptions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
CREATE POLICY "Admins can delete extraction exceptions"
  ON public.endorsement_exceptions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

CREATE TRIGGER touch_endorsement_extraction_runs BEFORE UPDATE ON public.endorsement_extraction_runs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_endorsement_exceptions BEFORE UPDATE ON public.endorsement_exceptions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();