-- =====================================================================
-- COMPULSORY RECITAL — 24-hour reminder cron
-- Run AFTER recital.sql and recital_emails.sql.
--
-- Prerequisite: pg_cron extension. Most Supabase projects already have it.
-- Enable in Dashboard → Database → Extensions → search "pg_cron".
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- ---------------------------------------------------------------------
-- 1. Reminder function — sends a 24-hour reminder to every member with
--    a scheduled booking for tomorrow.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.send_recital_reminder_emails()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resend_key text := get_secret('resend_api_key');
  site_url   text := COALESCE(get_secret('site_url'), 'https://beninchoraleandphilharmonic.com');
  rec        record;
  inner_html text;
  full_html  text;
  date_label text;
BEGIN
  IF resend_key IS NULL OR resend_key = '' THEN
    RAISE WARNING 'RESEND_API_KEY not set in vault';
    RETURN;
  END IF;

  FOR rec IN
    SELECT b.recital_date,
           b.slot_number,
           b.chosen_piece,
           p.first_name,
           p.email
    FROM public.recital_bookings b
    JOIN public.profiles         p ON p.id = b.profile_id
    WHERE b.status       = 'scheduled'
      AND b.recital_date = CURRENT_DATE + 1
      AND p.email        IS NOT NULL
      AND p.email        <> ''
  LOOP
    date_label := to_char(rec.recital_date, 'FMDay, FMDD FMMonth YYYY');

    inner_html :=
         '<div style="background: #f9f9f7; border-radius: 12px; padding: 32px; border: 1px solid #e5e5e5;">'
      || '<h2 style="color: #1a5632; font-size: 20px; margin: 0 0 16px;">Reminder: your recital is tomorrow</h2>'
      || '<p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">'
      || 'Hi ' || COALESCE(rec.first_name, 'there') || ', this is a friendly reminder that your '
      || 'compulsory recital is <strong>tomorrow</strong>.</p>'
      || '<div style="background: #ffffff; border: 2px solid #1a5632; border-radius: 8px; padding: 16px; margin: 16px 0;">'
      || '<p style="margin: 0 0 6px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Date</p>'
      || '<p style="margin: 0 0 12px; color: #1a5632; font-size: 18px; font-weight: bold;">' || date_label || '</p>'
      || '<p style="margin: 0 0 6px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Slot</p>'
      || '<p style="margin: 0 0 12px; color: #1a5632; font-size: 18px; font-weight: bold;">#' || rec.slot_number || ' of 6</p>'
      || '<p style="margin: 0 0 6px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Piece</p>'
      || '<p style="margin: 0; color: #1a5632; font-size: 16px; font-weight: 600;">' || rec.chosen_piece || '</p>'
      || '</div>'
      || '<p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">'
      || 'Final preparation tips: warm up gently, hydrate, run through your score once with your accompanist, '
      || 'and arrive early to settle your nerves.</p>'
      || '<div style="text-align: center;">'
      || '<a href="' || site_url || '/dashboard/recital" style="display: inline-block; background: #1a5632; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600;">View My Booking</a>'
      || '</div></div>';

    full_html := build_email_html(inner_html);

    PERFORM net.http_post(
      url     := 'https://api.resend.com/emails',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || resend_key,
        'Content-Type',  'application/json'
      ),
      body    := jsonb_build_object(
        'from',    'The Benin Chorale & Philharmonic <noreply@beninchoraleandphilharmonic.com>',
        'to',       rec.email,
        'subject', 'Reminder: your recital is tomorrow — ' || date_label,
        'html',     full_html
      )
    );
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------
-- 2. Schedule it daily at 09:00 (server time / UTC).
--    Adjust the time if you want it to land in members' local morning;
--    Lagos (WAT) is UTC+1, so 09:00 UTC = 10:00 WAT.
-- ---------------------------------------------------------------------

-- Remove any prior schedule so this script is idempotent.
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'recital_reminders_daily';

SELECT cron.schedule(
  'recital_reminders_daily',
  '0 9 * * *',
  $cron$ SELECT public.send_recital_reminder_emails(); $cron$
);
