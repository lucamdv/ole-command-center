UPDATE public.audit_runs
SET status = 'error',
    error_message = COALESCE(error_message, 'Timeout: callback do n8n não chegou em 10min'),
    status_geral = 'ERRO'
WHERE status = 'running'
  AND created_at < now() - interval '10 minutes';

UPDATE public.policy_sync_runs
SET status = 'error',
    error_message = COALESCE(error_message, 'Timeout: callback do n8n não chegou em 10min'),
    finished_at = now()
WHERE status = 'running'
  AND created_at < now() - interval '10 minutes';