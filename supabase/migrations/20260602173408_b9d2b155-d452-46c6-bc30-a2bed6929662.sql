CREATE TABLE public.audit_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  data_auditoria timestamptz NOT NULL,
  status_geral text NOT NULL,
  mensagem_geral text,
  total_processado int NOT NULL DEFAULT 0,
  aprovados int NOT NULL DEFAULT 0,
  reprovados int NOT NULL DEFAULT 0,
  duration_ms int,
  raw jsonb NOT NULL
);

CREATE INDEX audit_runs_created_at_idx ON public.audit_runs (created_at DESC);

CREATE TABLE public.audit_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.audit_runs(id) ON DELETE CASCADE,
  apolice text NOT NULL,
  tipo_erro text NOT NULL,
  endosso text,
  data_inicio date,
  data_fim date,
  detalhes jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_findings_run_id_idx ON public.audit_findings (run_id);
CREATE INDEX audit_findings_tipo_erro_idx ON public.audit_findings (tipo_erro);
CREATE INDEX audit_findings_apolice_idx ON public.audit_findings (apolice);

GRANT SELECT ON public.audit_runs TO anon, authenticated;
GRANT ALL ON public.audit_runs TO service_role;
GRANT SELECT ON public.audit_findings TO anon, authenticated;
GRANT ALL ON public.audit_findings TO service_role;

ALTER TABLE public.audit_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read audit_runs" ON public.audit_runs FOR SELECT USING (true);
CREATE POLICY "Public read audit_findings" ON public.audit_findings FOR SELECT USING (true);
