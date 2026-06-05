
-- Drop overly permissive public policies
DROP POLICY IF EXISTS "Public read policies" ON public.policies;
DROP POLICY IF EXISTS "Public read endorsements" ON public.endorsements;
DROP POLICY IF EXISTS "Public read audit_runs" ON public.audit_runs;
DROP POLICY IF EXISTS "Public read audit_findings" ON public.audit_findings;
DROP POLICY IF EXISTS "Public read policy_sync_runs" ON public.policy_sync_runs;
DROP POLICY IF EXISTS "Public manage oliver_memory" ON public.oliver_memory;
DROP POLICY IF EXISTS "Public manage oliver_threads" ON public.oliver_threads;
DROP POLICY IF EXISTS "Public manage oliver_messages" ON public.oliver_messages;

-- Ensure RLS is enabled on every sensitive table
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.endorsements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oliver_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oliver_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oliver_messages ENABLE ROW LEVEL SECURITY;

-- Revoke Data API access from anon and authenticated roles.
-- All app access goes through server functions using the service_role
-- client (supabaseAdmin), which bypasses RLS, so no client grants are needed.
REVOKE ALL ON public.policies          FROM anon, authenticated;
REVOKE ALL ON public.endorsements      FROM anon, authenticated;
REVOKE ALL ON public.audit_runs        FROM anon, authenticated;
REVOKE ALL ON public.audit_findings    FROM anon, authenticated;
REVOKE ALL ON public.policy_sync_runs  FROM anon, authenticated;
REVOKE ALL ON public.oliver_memory     FROM anon, authenticated;
REVOKE ALL ON public.oliver_threads    FROM anon, authenticated;
REVOKE ALL ON public.oliver_messages   FROM anon, authenticated;

-- Ensure service_role retains full access (server functions rely on this)
GRANT ALL ON public.policies          TO service_role;
GRANT ALL ON public.endorsements      TO service_role;
GRANT ALL ON public.audit_runs        TO service_role;
GRANT ALL ON public.audit_findings    TO service_role;
GRANT ALL ON public.policy_sync_runs  TO service_role;
GRANT ALL ON public.oliver_memory     TO service_role;
GRANT ALL ON public.oliver_threads    TO service_role;
GRANT ALL ON public.oliver_messages   TO service_role;
