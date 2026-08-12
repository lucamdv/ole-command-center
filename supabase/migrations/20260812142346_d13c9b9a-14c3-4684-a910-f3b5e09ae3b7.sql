DROP FUNCTION IF EXISTS public.match_oliver_knowledge(extensions.vector, integer, text);

DROP TABLE IF EXISTS public.oliver_messages CASCADE;
DROP TABLE IF EXISTS public.oliver_threads CASCADE;
DROP TABLE IF EXISTS public.oliver_knowledge CASCADE;
DROP TABLE IF EXISTS public.oliver_memory CASCADE;

DROP TABLE IF EXISTS public.calendar_attachments CASCADE;
DROP TABLE IF EXISTS public.calendar_notifications CASCADE;
DROP TABLE IF EXISTS public.calendar_reminders CASCADE;
DROP TABLE IF EXISTS public.calendar_saved_views CASCADE;
DROP TABLE IF EXISTS public.calendar_activities CASCADE;