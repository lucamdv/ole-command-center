ALTER TABLE public.audit_resolutions
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'manual';

DROP INDEX IF EXISTS public.audit_resolutions_active_key;

CREATE UNIQUE INDEX audit_resolutions_active_key
  ON public.audit_resolutions (apolice, tipo_erro, coalesce(endosso, ''))
  WHERE (reopened_at IS NULL);