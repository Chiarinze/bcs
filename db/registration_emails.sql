-- =====================================================================
-- REGISTRATION CONFIRMATION EMAILS — tickets and auditions
-- Run in: Supabase Dashboard → SQL Editor (after event_times.sql)
-- Idempotent: safe to re-run.
--
-- Members' internal registrations already have on_internal_registration.
-- These cover the two public flows that had no confirmation:
--   tickets                (paid via Paystack and free registrations)
--   audition_registrations
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TICKETS — fires on every insert (paid and free share the table)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.send_ticket_confirmation_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  site_url     text := COALESCE(get_secret('site_url'), 'https://beninchoraleandphilharmonic.com');
  ev           record;
  date_display text;
  amount_text  text;
  inner_html   text;
  full_html    text;
BEGIN

  IF NEW.buyer_email IS NULL OR NEW.buyer_email = '' THEN
    RETURN NEW;
  END IF;

  SELECT title, slug, location, date, end_date
  INTO ev
  FROM public.events WHERE id = NEW.event_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  date_display := to_char(ev.date, 'FMDay, FMDD FMMonth YYYY');
  IF ev.end_date IS NOT NULL AND ev.end_date::date <> ev.date::date THEN
    date_display := date_display || ' — ' || to_char(ev.end_date, 'FMDay, FMDD FMMonth YYYY');
  END IF;

  amount_text := CASE
    WHEN COALESCE(NEW.amount_paid, 0) > 0 THEN '₦' || to_char(NEW.amount_paid, 'FM999,999,999')
    ELSE 'Free'
  END;

  inner_html :=
       '<div style="background: #f9f9f7; border-radius: 12px; padding: 32px; border: 1px solid #e5e5e5;">'
    || '<h2 style="color: #1a5632; font-size: 20px; margin: 0 0 16px;">'
    || CASE WHEN COALESCE(NEW.amount_paid, 0) > 0 THEN 'Your ticket is confirmed' ELSE 'Registration confirmed' END
    || '</h2>'
    || '<p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">'
    || 'Dear <strong>' || html_escape(NEW.buyer_name) || '</strong>, thank you — we look forward to seeing you at:</p>'
    || '<div style="background: #ffffff; border: 2px solid #1a5632; border-radius: 8px; padding: 20px; margin: 16px 0; text-align: center;">'
    || '<p style="color: #1a5632; font-size: 20px; font-weight: bold; margin: 0 0 8px;">' || html_escape(ev.title) || '</p>'
    || '<p style="color: #6b7280; font-size: 14px; margin: 0;">' || date_display || '</p>'
    || CASE WHEN ev.location IS NOT NULL AND ev.location <> ''
         THEN '<p style="color: #6b7280; font-size: 14px; margin: 4px 0 0;">' || html_escape(ev.location) || '</p>'
         ELSE '' END
    || '</div>'
    || '<table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #374151; margin: 0 0 16px;">'
    || CASE WHEN NEW.category IS NOT NULL AND NEW.category <> ''
         THEN '<tr><td style="padding: 6px 0; color: #6b7280;">Ticket</td><td style="padding: 6px 0; text-align: right;">' || html_escape(NEW.category) || '</td></tr>'
         ELSE '' END
    || '<tr><td style="padding: 6px 0; color: #6b7280;">Amount</td><td style="padding: 6px 0; text-align: right;">' || amount_text || '</td></tr>'
    || '<tr><td style="padding: 6px 0; color: #6b7280;">Reference</td><td style="padding: 6px 0; text-align: right; font-family: monospace;">' || html_escape(NEW.payment_ref) || '</td></tr>'
    || '</table>'
    || '<p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">'
    || 'Please keep this email — your name and reference will be checked at the entrance.</p>'
    || '<div style="text-align: center;">'
    || '<a href="' || site_url || '/events/' || COALESCE(ev.slug, '') || '" style="display: inline-block; background: #1a5632; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 15px; font-weight: 600;">View Event Details</a>'
    || '</div></div>';

  full_html := build_email_html(inner_html);

  PERFORM send_email(
    'ticket_confirmation',
    NEW.buyer_email,
    CASE WHEN COALESCE(NEW.amount_paid, 0) > 0 THEN 'Your ticket — ' ELSE 'Registration confirmed — ' END || ev.title,
    full_html,
    'The Benin Chorale & Philharmonic <noreply@beninchoraleandphilharmonic.com>'
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Ticket confirmation email failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_ticket_created ON public.tickets;
CREATE TRIGGER on_ticket_created
  AFTER INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.send_ticket_confirmation_email();

-- ---------------------------------------------------------------------
-- 2. AUDITIONS
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.send_audition_confirmation_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  site_url     text := COALESCE(get_secret('site_url'), 'https://beninchoraleandphilharmonic.com');
  ev           record;
  date_display text;
  what         text;
  inner_html   text;
  full_html    text;
BEGIN

  IF NEW.email IS NULL OR NEW.email = '' THEN
    RETURN NEW;
  END IF;

  SELECT title, slug, location, date, end_date, start_time, end_time
  INTO ev
  FROM public.events WHERE id = NEW.event_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  date_display := to_char(ev.date, 'FMDay, FMDD FMMonth YYYY');
  IF ev.end_date IS NOT NULL AND ev.end_date::date <> ev.date::date THEN
    date_display := date_display || ' — ' || to_char(ev.end_date, 'FMDay, FMDD FMMonth YYYY');
  END IF;
  IF event_time_label(ev.start_time, ev.end_time) IS NOT NULL THEN
    date_display := date_display || ' · ' || event_time_label(ev.start_time, ev.end_time);
  END IF;

  what := CASE
    WHEN NEW.audition_type = 'instrument' THEN 'Instrument' || COALESCE(' — ' || NEW.instrument_name, '')
    ELSE 'Voice' || COALESCE(' — ' || NEW.voice_part, '')
  END;

  inner_html :=
       '<div style="background: #f9f9f7; border-radius: 12px; padding: 32px; border: 1px solid #e5e5e5;">'
    || '<h2 style="color: #1a5632; font-size: 20px; margin: 0 0 16px;">Audition registration received</h2>'
    || '<p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">'
    || 'Dear <strong>' || html_escape(NEW.first_name) || '</strong>, thank you for registering to audition for:</p>'
    || '<div style="background: #ffffff; border: 2px solid #1a5632; border-radius: 8px; padding: 20px; margin: 16px 0; text-align: center;">'
    || '<p style="color: #1a5632; font-size: 20px; font-weight: bold; margin: 0 0 8px;">' || html_escape(ev.title) || '</p>'
    || '<p style="color: #6b7280; font-size: 14px; margin: 0;">' || date_display || '</p>'
    || CASE WHEN ev.location IS NOT NULL AND ev.location <> ''
         THEN '<p style="color: #6b7280; font-size: 14px; margin: 4px 0 0;">' || html_escape(ev.location) || '</p>'
         ELSE '' END
    || '</div>'
    || '<table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #374151; margin: 0 0 16px;">'
    || '<tr><td style="padding: 6px 0; color: #6b7280;">Auditioning for</td><td style="padding: 6px 0; text-align: right;">' || html_escape(what) || '</td></tr>'
    || '<tr><td style="padding: 6px 0; color: #6b7280;">Preferred time</td><td style="padding: 6px 0; text-align: right;">' || html_escape(NEW.preferred_time) || '</td></tr>'
    || '</table>'
    || '<p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">'
    || 'Please arrive a little before your preferred time and bring any sheet music you intend to use. '
    || 'We will contact you at this address if anything changes.</p>'
    || '<div style="text-align: center;">'
    || '<a href="' || site_url || '/events/' || COALESCE(ev.slug, '') || '" style="display: inline-block; background: #1a5632; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 15px; font-weight: 600;">View Audition Details</a>'
    || '</div></div>';

  full_html := build_email_html(inner_html);

  PERFORM send_email(
    'audition_confirmation',
    NEW.email,
    'Audition registration received — ' || ev.title,
    full_html,
    'The Benin Chorale & Philharmonic <noreply@beninchoraleandphilharmonic.com>'
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Audition confirmation email failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_audition_registered ON public.audition_registrations;
CREATE TRIGGER on_audition_registered
  AFTER INSERT ON public.audition_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.send_audition_confirmation_email();
