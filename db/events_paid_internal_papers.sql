-- =====================================================================
-- EVENTS — paid internal events + paper-presentation details on
-- public event registrations
-- Run AFTER email_log.sql and contact_messages.sql (send_email, html_escape).
-- Idempotent: safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. EVENTS — per-event options
-- ---------------------------------------------------------------------
-- Paid internal events use events.price (single fixed amount).
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS collect_paper_info      boolean NOT NULL DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS paper_submission_email  text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS paper_deadline          date;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS paper_signature         text;

-- ---------------------------------------------------------------------
-- 2. TICKETS — paper details captured on public registration/purchase
-- ---------------------------------------------------------------------
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS affiliation      text;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS presenting_paper boolean;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS paper_title      text;

CREATE INDEX IF NOT EXISTS tickets_event_presenting_idx
  ON public.tickets (event_id, presenting_paper);

-- ---------------------------------------------------------------------
-- 3. INTERNAL REGISTRATIONS — payment record for paid internal events
-- ---------------------------------------------------------------------
ALTER TABLE public.internal_event_registrations ADD COLUMN IF NOT EXISTS amount_paid  numeric NOT NULL DEFAULT 0;
ALTER TABLE public.internal_event_registrations ADD COLUMN IF NOT EXISTS payment_ref  text;
ALTER TABLE public.internal_event_registrations ADD COLUMN IF NOT EXISTS coupon_code  text;

CREATE UNIQUE INDEX IF NOT EXISTS internal_event_registrations_payment_ref_key
  ON public.internal_event_registrations (payment_ref) WHERE payment_ref IS NOT NULL;

-- ---------------------------------------------------------------------
-- 4. SITE CONTENT — links used on the registration success screen
-- ---------------------------------------------------------------------
INSERT INTO public.site_content (key, value) VALUES ('links', '{"music_scores_url": ""}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------
-- 5. TICKET CONFIRMATION — regular vs presenter variant
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
  presenter    boolean;
  inner_html   text;
  full_html    text;
  sig_html     text;
BEGIN
  IF NEW.buyer_email IS NULL OR NEW.buyer_email = '' THEN
    RETURN NEW;
  END IF;

  SELECT title, slug, location, date, end_date,
         collect_paper_info, paper_submission_email, paper_deadline, paper_signature
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

  presenter := COALESCE(ev.collect_paper_info, false) AND COALESCE(NEW.presenting_paper, false);

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
    || CASE WHEN presenter AND NEW.paper_title IS NOT NULL AND NEW.paper_title <> ''
         THEN '<tr><td style="padding: 6px 0; color: #6b7280;">Paper</td><td style="padding: 6px 0; text-align: right;">' || html_escape(NEW.paper_title) || '</td></tr>'
         ELSE '' END
    || CASE WHEN presenter AND NEW.affiliation IS NOT NULL AND NEW.affiliation <> ''
         THEN '<tr><td style="padding: 6px 0; color: #6b7280;">Affiliation</td><td style="padding: 6px 0; text-align: right;">' || html_escape(NEW.affiliation) || '</td></tr>'
         ELSE '' END
    || '</table>';

  IF presenter THEN
    -- Presenter variant: how and when to submit the abstract.
    inner_html := inner_html
      || '<div style="background: #ffffff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 16px 18px; margin: 0 0 16px;">'
      || '<p style="color: #1a5632; font-size: 15px; font-weight: 600; margin: 0 0 8px;">Submitting your abstract</p>'
      || '<p style="color: #374151; font-size: 14px; line-height: 1.7; margin: 0;">'
      || 'Thank you for indicating that you will present a paper. Please send your abstract to '
      || '<a href="mailto:' || html_escape(COALESCE(ev.paper_submission_email, 'info@beninchoraleandphilharmonic.com')) || '" style="color: #1a5632; font-weight: 600;">'
      || html_escape(COALESCE(ev.paper_submission_email, 'info@beninchoraleandphilharmonic.com')) || '</a>'
      || CASE WHEN ev.paper_deadline IS NOT NULL
           THEN ' on or before <strong>' || to_char(ev.paper_deadline, 'FMDay, FMDD FMMonth YYYY') || '</strong>'
           ELSE '' END
      || '. Quote the reference above in your email.</p>'
      || '</div>';

    IF COALESCE(ev.paper_signature, '') <> '' THEN
      sig_html := replace(html_escape(ev.paper_signature), E'\n', '<br/>');
      inner_html := inner_html
        || '<p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 16px 0 0;">Warm regards,<br/>' || sig_html || '</p>';
    END IF;
  ELSE
    inner_html := inner_html
      || '<p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">'
      || 'Please keep this email — your name and reference will be checked at the entrance.</p>';
  END IF;

  inner_html := inner_html
    || '<div style="text-align: center; margin-top: 24px;">'
    || '<a href="' || site_url || '/events/' || COALESCE(ev.slug, '') || '" style="display: inline-block; background: #1a5632; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 15px; font-weight: 600;">View Event Details</a>'
    || '</div></div>';

  full_html := build_email_html(inner_html);

  PERFORM send_email(
    CASE WHEN presenter THEN 'ticket_confirmation_presenter' ELSE 'ticket_confirmation' END,
    NEW.buyer_email,
    CASE WHEN COALESCE(NEW.amount_paid, 0) > 0 THEN 'Your ticket — ' ELSE 'Registration confirmed — ' END || ev.title,
    full_html,
    'The Benin Chorale & Philharmonic <noreply@beninchoraleandphilharmonic.com>',
    CASE WHEN presenter THEN ev.paper_submission_email ELSE NULL END,
    NULL, NULL,
    jsonb_build_object('event_id', NEW.event_id, 'presenting', presenter)
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
-- 6. INTERNAL REGISTRATION CONFIRMATION — now via send_email(), with
--    the payment line for paid internal events
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.send_internal_registration_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  site_url     text := COALESCE(get_secret('site_url'), 'https://beninchoraleandphilharmonic.com');
  event_title  text;
  event_date   text;
  event_end    text;
  event_slug   text;
  date_display text;
  inner_html   text;
  full_html    text;
BEGIN
  SELECT title, slug,
    TO_CHAR(date, 'DD Mon YYYY'),
    CASE WHEN end_date IS NOT NULL THEN TO_CHAR(end_date, 'DD Mon YYYY') ELSE NULL END
  INTO event_title, event_slug, event_date, event_end
  FROM public.events WHERE id = NEW.event_id;

  IF event_end IS NOT NULL AND event_end <> event_date THEN
    date_display := event_date || ' — ' || event_end;
  ELSE
    date_display := event_date;
  END IF;

  inner_html := '<div style="background: #f9f9f7; border-radius: 12px; padding: 32px; border: 1px solid #e5e5e5;">'
    || '<h2 style="color: #1a5632; font-size: 20px; margin: 0 0 16px;">Registration Confirmed!</h2>'
    || '<p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">'
    || 'Dear <strong>' || html_escape(COALESCE(NEW.first_name, 'Member')) || '</strong>, you have successfully registered for:</p>'
    || '<div style="background: #ffffff; border: 2px solid #1a5632; border-radius: 8px; padding: 20px; margin: 16px 0; text-align: center;">'
    || '<p style="color: #1a5632; font-size: 20px; font-weight: bold; margin: 0 0 8px;">' || html_escape(event_title) || '</p>'
    || '<p style="color: #6b7280; font-size: 14px; margin: 0;">' || date_display || '</p>'
    || '</div>';

  IF NEW.membership_id IS NOT NULL THEN
    inner_html := inner_html
      || '<div style="background: #ffffff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 12px; margin: 0 0 16px; text-align: center;">'
      || '<p style="color: #6b7280; font-size: 11px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 1px;">Your Membership ID</p>'
      || '<p style="color: #1a5632; font-size: 18px; font-weight: bold; margin: 0; font-family: monospace;">' || html_escape(NEW.membership_id) || '</p>'
      || '</div>';
  END IF;

  IF COALESCE(NEW.amount_paid, 0) > 0 THEN
    inner_html := inner_html
      || '<table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #374151; margin: 0 0 16px;">'
      || '<tr><td style="padding: 6px 0; color: #6b7280;">Amount paid</td><td style="padding: 6px 0; text-align: right;">₦' || to_char(NEW.amount_paid, 'FM999,999,999') || '</td></tr>'
      || '<tr><td style="padding: 6px 0; color: #6b7280;">Reference</td><td style="padding: 6px 0; text-align: right; font-family: monospace;">' || html_escape(COALESCE(NEW.payment_ref, '')) || '</td></tr>'
      || '</table>';
  END IF;

  inner_html := inner_html
    || '<p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">'
    || 'Please check the event page for the timetable and further details.</p>'
    || '<div style="text-align: center;">'
    || '<a href="' || site_url || '/dashboard/events/' || event_slug || '" style="display: inline-block; background: #1a5632; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 15px; font-weight: 600;">View Event Details</a>'
    || '</div></div>';

  full_html := build_email_html(inner_html);

  PERFORM send_email(
    'internal_registration',
    NEW.email,
    'Registration Confirmed — ' || event_title,
    full_html,
    'The Benin Chorale & Philharmonic <noreply@beninchoraleandphilharmonic.com>',
    NULL, NULL, NULL,
    jsonb_build_object('event_id', NEW.event_id)
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Registration email failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_internal_registration ON public.internal_event_registrations;
CREATE TRIGGER on_internal_registration
  AFTER INSERT ON public.internal_event_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.send_internal_registration_email();
