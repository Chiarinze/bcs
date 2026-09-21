-- =====================================================================
-- EVENTS — start/end time of day (all event types)
-- Idempotent: safe to re-run.
-- =====================================================================
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS start_time time;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS end_time   time;

-- Human-readable "10:00 AM" / "10:00 AM – 1:00 PM" for emails.
CREATE OR REPLACE FUNCTION public.event_time_label(p_start time, p_end time)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_start IS NULL THEN NULL
    WHEN p_end IS NULL OR p_end = p_start THEN to_char(('2000-01-01'::date + p_start), 'FMHH12:MI AM')
    ELSE to_char(('2000-01-01'::date + p_start), 'FMHH12:MI AM') || ' – ' || to_char(('2000-01-01'::date + p_end), 'FMHH12:MI AM')
  END;
$$;
