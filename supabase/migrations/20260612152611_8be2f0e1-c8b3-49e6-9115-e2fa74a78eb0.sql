
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ACTIVITIES
CREATE TABLE public.calendar_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description jsonb NOT NULL DEFAULT '{}'::jsonb,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  all_day boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','waiting_approval','done','cancelled')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  category text,
  project text,
  client text,
  tags text[] NOT NULL DEFAULT '{}',
  color text,
  recurrence_rule text,
  recurrence_until timestamptz,
  recurrence_count integer,
  parent_activity_id uuid REFERENCES public.calendar_activities(id) ON DELETE CASCADE,
  series_exception jsonb,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_calendar_activities_user_start ON public.calendar_activities(user_id, start_at);
CREATE INDEX idx_calendar_activities_user_end ON public.calendar_activities(user_id, end_at);
CREATE INDEX idx_calendar_activities_user_status ON public.calendar_activities(user_id, status);
CREATE INDEX idx_calendar_activities_parent ON public.calendar_activities(parent_activity_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_activities TO authenticated;
GRANT ALL ON public.calendar_activities TO service_role;
ALTER TABLE public.calendar_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own activities" ON public.calendar_activities FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER touch_calendar_activities BEFORE UPDATE ON public.calendar_activities FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ATTACHMENTS
CREATE TABLE public.calendar_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_id uuid NOT NULL REFERENCES public.calendar_activities(id) ON DELETE CASCADE,
  file_path text,
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  is_link boolean NOT NULL DEFAULT false,
  external_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_calendar_attachments_activity ON public.calendar_attachments(activity_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_attachments TO authenticated;
GRANT ALL ON public.calendar_attachments TO service_role;
ALTER TABLE public.calendar_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own attachments" ON public.calendar_attachments FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- REMINDERS
CREATE TABLE public.calendar_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_id uuid NOT NULL REFERENCES public.calendar_activities(id) ON DELETE CASCADE,
  offset_minutes integer NOT NULL DEFAULT 15,
  channels text[] NOT NULL DEFAULT ARRAY['in_app']::text[],
  next_trigger_at timestamptz NOT NULL,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_calendar_reminders_next ON public.calendar_reminders(next_trigger_at) WHERE sent_at IS NULL;
CREATE INDEX idx_calendar_reminders_activity ON public.calendar_reminders(activity_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_reminders TO authenticated;
GRANT ALL ON public.calendar_reminders TO service_role;
ALTER TABLE public.calendar_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own reminders" ON public.calendar_reminders FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- SAVED VIEWS
CREATE TABLE public.calendar_saved_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  view_mode text NOT NULL DEFAULT 'month' CHECK (view_mode IN ('month','week','day','list')),
  is_favorite boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_calendar_views_user ON public.calendar_saved_views(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_saved_views TO authenticated;
GRANT ALL ON public.calendar_saved_views TO service_role;
ALTER TABLE public.calendar_saved_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saved views" ON public.calendar_saved_views FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER touch_calendar_views BEFORE UPDATE ON public.calendar_saved_views FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- NOTIFICATIONS
CREATE TABLE public.calendar_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_id uuid REFERENCES public.calendar_activities(id) ON DELETE SET NULL,
  title text NOT NULL,
  body text,
  kind text NOT NULL DEFAULT 'reminder' CHECK (kind IN ('reminder','due_soon','overdue')),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_calendar_notifs_user_unread ON public.calendar_notifications(user_id, created_at DESC) WHERE read_at IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_notifications TO authenticated;
GRANT ALL ON public.calendar_notifications TO service_role;
ALTER TABLE public.calendar_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own notifications" ON public.calendar_notifications FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- STORAGE: bucket created via tool; add policies
CREATE POLICY "calendar attachments user read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'calendar-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "calendar attachments user write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'calendar-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "calendar attachments user update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'calendar-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "calendar attachments user delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'calendar-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

-- CRON
SELECT cron.schedule(
  'calendar-reminders-tick',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--5db7fa90-1492-4717-b26e-8b99a107e006.lovable.app/api/public/calendar-reminders-tick',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'apikey','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0b3hybmxxaXlndmliZ2ZtaWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MTU1MTgsImV4cCI6MjA5NTk5MTUxOH0.u1T_9VAJMOCPZIf_-JAv-J8b6_X8ddsRP8fRI51Fc18'
    ),
    body := '{}'::jsonb
  );
  $$
);
