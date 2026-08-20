ALTER TABLE public.audit_runs
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'manual';

ALTER TABLE public.audit_runs
  ADD CONSTRAINT audit_runs_origem_check CHECK (origem IN ('manual','auto'));