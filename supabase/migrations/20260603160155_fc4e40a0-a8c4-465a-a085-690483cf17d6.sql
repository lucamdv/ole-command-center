
-- policy_sync_runs
CREATE TABLE public.policy_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  total_apolices integer NOT NULL DEFAULT 0,
  duration_ms integer,
  error_message text,
  raw jsonb
);
GRANT SELECT ON public.policy_sync_runs TO anon, authenticated;
GRANT ALL ON public.policy_sync_runs TO service_role;
ALTER TABLE public.policy_sync_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read policy_sync_runs" ON public.policy_sync_runs FOR SELECT USING (true);

-- policies
CREATE TABLE public.policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_apolice text NOT NULL UNIQUE,
  numero_endosso_atual text,
  premio_liquido numeric(18,2) DEFAULT 0,
  proposta jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_sync_run_id uuid REFERENCES public.policy_sync_runs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_policies_numero ON public.policies(numero_apolice);
GRANT SELECT ON public.policies TO anon, authenticated;
GRANT ALL ON public.policies TO service_role;
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read policies" ON public.policies FOR SELECT USING (true);

-- endorsements
CREATE TABLE public.endorsements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  numero_apolice text NOT NULL,
  numero_endosso text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  premio_liquido numeric(18,2) DEFAULT 0,
  proposta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (policy_id, numero_endosso)
);
CREATE INDEX idx_endorsements_policy ON public.endorsements(policy_id);
GRANT SELECT ON public.endorsements TO anon, authenticated;
GRANT ALL ON public.endorsements TO service_role;
ALTER TABLE public.endorsements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read endorsements" ON public.endorsements FOR SELECT USING (true);

-- updated_at trigger for policies
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_policies_updated_at BEFORE UPDATE ON public.policies
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
