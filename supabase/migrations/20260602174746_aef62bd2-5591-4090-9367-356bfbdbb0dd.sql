ALTER TABLE public.audit_runs
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'success',
  ADD COLUMN IF NOT EXISTS error_message text;

ALTER TABLE public.audit_runs ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.audit_runs ALTER COLUMN data_auditoria DROP NOT NULL;
ALTER TABLE public.audit_runs ALTER COLUMN status_geral DROP NOT NULL;
ALTER TABLE public.audit_runs ALTER COLUMN raw DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_runs_status ON public.audit_runs (status);
CREATE INDEX IF NOT EXISTS idx_audit_runs_created_at ON public.audit_runs (created_at DESC);