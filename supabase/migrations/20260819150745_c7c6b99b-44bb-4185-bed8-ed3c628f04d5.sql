CREATE TABLE public.automation_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job text NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT false,
  run_at_time time NOT NULL DEFAULT '08:00',
  weekdays integer[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}',
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  last_triggered_at timestamptz,
  last_status text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.automation_schedules TO authenticated;
GRANT ALL ON public.automation_schedules TO service_role;

ALTER TABLE public.automation_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read automation schedules"
  ON public.automation_schedules FOR SELECT TO authenticated USING (true);

CREATE TRIGGER touch_automation_schedules
  BEFORE UPDATE ON public.automation_schedules
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.automation_schedules (job) VALUES ('audit'), ('policy_sync');