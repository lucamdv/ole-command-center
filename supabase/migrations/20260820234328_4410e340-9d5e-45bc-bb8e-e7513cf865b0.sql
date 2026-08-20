CREATE TABLE public.policy_billing (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_apolice text NOT NULL,
  numero_endosso text NOT NULL,
  numero_proposta text,
  status_pagamento text NOT NULL,
  situacao_emissao text NOT NULL,
  data_quitacao timestamptz,
  data_vencimento date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT policy_billing_unico UNIQUE (numero_apolice, numero_endosso)
);

CREATE INDEX idx_policy_billing_apolice ON public.policy_billing (numero_apolice);

GRANT SELECT ON public.policy_billing TO authenticated;
GRANT ALL ON public.policy_billing TO service_role;

ALTER TABLE public.policy_billing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read billing" ON public.policy_billing
  FOR SELECT TO authenticated USING (true);

CREATE TRIGGER touch_policy_billing BEFORE UPDATE ON public.policy_billing
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();