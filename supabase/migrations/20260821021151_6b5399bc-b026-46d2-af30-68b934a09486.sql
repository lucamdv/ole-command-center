ALTER TABLE public.policy_sync_runs
  ADD COLUMN IF NOT EXISTS emissoes_status text NOT NULL DEFAULT 'running',
  ADD COLUMN IF NOT EXISTS emissoes_finished_at timestamptz,
  ADD COLUMN IF NOT EXISTS cobrancas_status text NOT NULL DEFAULT 'running',
  ADD COLUMN IF NOT EXISTS cobrancas_finished_at timestamptz,
  ADD COLUMN IF NOT EXISTS cobrancas_total integer NOT NULL DEFAULT 0;