-- =====================================================================
-- COMPULSORY RECITAL — email triggers
-- Run AFTER recital.sql.
-- Uses get_secret() and build_email_html() already in the project.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Query issued → email the member
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.send_recital_query_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resend_key  text := get_secret('resend_api_key');
  site_url    text := COALESCE(get_secret('site_url'), 'https://beninchoraleandphilharmonic.com');
  cfg         public.recital_config%ROWTYPE;
  member      record;
  inner_html  text;
  full_html   text;
BEGIN
  IF resend_key IS NULL OR resend_key = '' THEN
    RAISE WARNING 'RESEND_API_KEY not set in vault';
    RETURN NEW;
  END IF;

  SELECT first_name, last_name, email
  INTO member
  FROM public.profiles
  WHERE id = NEW.profile_id;

  IF member.email IS NULL OR member.email = '' THEN
    RAISE WARNING 'No email for profile %', NEW.profile_id;
    RETURN NEW;
  END IF;

  SELECT * INTO cfg FROM public.recital_config WHERE id = 1;

  inner_html :=
       '<div style="background: #f9f9f7; border-radius: 12px; padding: 32px; border: 1px solid #e5e5e5;">'
    || '<h2 style="color: #b91c1c; font-size: 20px; margin: 0 0 16px;">You have been queried — Compulsory Recital</h2>'
    || '<p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">'
    || 'Hi ' || COALESCE(member.first_name, 'there') || ',</p>'
    || '<p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">'
    || 'In line with the BCS May–August Compulsory Recital Exercise, a <strong>query</strong> has been issued '
    || 'against you. To clear this query, you must <strong>perform and pass</strong> your assigned recital '
    || 'piece before <strong>' || to_char(cfg.cutoff_date, 'FMDay, FMDD FMMonth YYYY') || '</strong> '
    || '(the last Friday in August).</p>'
    || '<p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">'
    || '<strong>What to do next:</strong></p>'
    || '<ol style="color: #374151; font-size: 15px; line-height: 1.7; margin: 0 0 16px 20px; padding: 0;">'
    || '<li>Download the recital repertoire PDF and find your assigned Option A or B piece.</li>'
    || '<li>Log in to your dashboard, open the Recital page, and book a Friday slot (max 6 per Friday).</li>'
    || '<li>Show up and perform on your chosen date. Admin will record your score.</li>'
    || '<li>A score of <strong>' || cfg.pass_mark || '/100</strong> or higher clears your query.</li>'
    || '</ol>'
    || '<div style="background: #fffbeb; border: 1px solid #f59e0b; border-radius: 8px; padding: 14px 18px; margin: 16px 0;">'
    || '<p style="color: #92400e; font-size: 14px; line-height: 1.6; margin: 0;">'
    || 'Failure to secure clearance will be treated as insubordination and will attract sanctions, per the official notice.</p></div>'
    || '<div style="text-align: center; margin-top: 24px;">'
    || '<a href="' || site_url || '/dashboard/recital" style="display: inline-block; background: #1a5632; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 15px; font-weight: 600;">Open My Recital Page</a>'
    || '</div>'
    || '<p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 20px 0 0; text-align: center;">'
    || '<a href="' || site_url || '/recital-repertoire.pdf" style="color: #1a5632;">Download the recital repertoire PDF</a></p>'
    || '</div>';

  full_html := build_email_html(inner_html);

  PERFORM net.http_post(
    url     := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || resend_key,
      'Content-Type',  'application/json'
    ),
    body    := jsonb_build_object(
      'from',    'The Benin Chorale & Philharmonic <noreply@beninchoraleandphilharmonic.com>',
      'to',       member.email,
      'subject', 'Compulsory Recital — You have been queried',
      'html',     full_html
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_recital_query_issued ON public.recital_queries;
CREATE TRIGGER on_recital_query_issued
  AFTER INSERT ON public.recital_queries
  FOR EACH ROW EXECUTE FUNCTION public.send_recital_query_email();

-- ---------------------------------------------------------------------
-- 2. Booking created → email member (confirmation) + admin (notification)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.send_recital_booking_emails()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resend_key   text := get_secret('resend_api_key');
  site_url     text := COALESCE(get_secret('site_url'), 'https://beninchoraleandphilharmonic.com');
  admin_email  text := get_secret('admin_email');
  member       record;
  date_label   text;
  inner_html   text;
  full_html    text;
  admin_inner  text;
  admin_full   text;
BEGIN
  IF resend_key IS NULL OR resend_key = '' THEN
    RAISE WARNING 'RESEND_API_KEY not set in vault';
    RETURN NEW;
  END IF;

  SELECT first_name, last_name, email
  INTO member
  FROM public.profiles
  WHERE id = NEW.profile_id;

  date_label := to_char(NEW.recital_date, 'FMDay, FMDD FMMonth YYYY');

  -- Member confirmation
  IF member.email IS NOT NULL AND member.email <> '' THEN
    inner_html :=
         '<div style="background: #f9f9f7; border-radius: 12px; padding: 32px; border: 1px solid #e5e5e5;">'
      || '<h2 style="color: #1a5632; font-size: 20px; margin: 0 0 16px;">Recital booking confirmed</h2>'
      || '<p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">'
      || 'Hi ' || COALESCE(member.first_name, 'there') || ', your compulsory recital is booked.</p>'
      || '<div style="background: #ffffff; border: 2px solid #1a5632; border-radius: 8px; padding: 16px; margin: 16px 0;">'
      || '<p style="margin: 0 0 6px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Date</p>'
      || '<p style="margin: 0 0 12px; color: #1a5632; font-size: 18px; font-weight: bold;">' || date_label || '</p>'
      || '<p style="margin: 0 0 6px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Slot</p>'
      || '<p style="margin: 0 0 12px; color: #1a5632; font-size: 18px; font-weight: bold;">#' || NEW.slot_number || ' of 6</p>'
      || '<p style="margin: 0 0 6px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Piece</p>'
      || '<p style="margin: 0; color: #1a5632; font-size: 16px; font-weight: 600;">' || NEW.chosen_piece || '</p>'
      || '</div>'
      || '<p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">'
      || 'Please prepare diligently — study the score, work with your accompanist, and arrive early on the day.</p>'
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
        'to',       member.email,
        'subject', 'Recital booking confirmed — ' || date_label,
        'html',     full_html
      )
    );
  END IF;

  -- Admin notification
  IF admin_email IS NOT NULL AND admin_email <> '' THEN
    admin_inner :=
         '<div style="background: #f9f9f7; border-radius: 12px; padding: 32px; border: 1px solid #e5e5e5;">'
      || '<h2 style="color: #1a5632; font-size: 20px; margin: 0 0 16px;">New recital booking</h2>'
      || '<p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 12px;">'
      || '<strong>' || COALESCE(member.first_name, '') || ' ' || COALESCE(member.last_name, '') || '</strong> just booked their recital.</p>'
      || '<ul style="color: #374151; font-size: 15px; line-height: 1.8; margin: 0 0 16px 20px; padding: 0;">'
      || '<li><strong>Date:</strong> ' || date_label || '</li>'
      || '<li><strong>Slot:</strong> #' || NEW.slot_number || '</li>'
      || '<li><strong>Piece:</strong> ' || NEW.chosen_piece || '</li>'
      || '</ul>'
      || '<div style="text-align: center; margin-top: 16px;">'
      || '<a href="' || site_url || '/admin/recital" style="display: inline-block; background: #1a5632; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;">Open Recital Admin</a>'
      || '</div></div>';
    admin_full := build_email_html(admin_inner);

    PERFORM net.http_post(
      url     := 'https://api.resend.com/emails',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || resend_key,
        'Content-Type',  'application/json'
      ),
      body    := jsonb_build_object(
        'from',    'The Benin Chorale & Philharmonic <noreply@beninchoraleandphilharmonic.com>',
        'to',       admin_email,
        'subject', 'New recital booking: ' || COALESCE(member.first_name, '') || ' ' || COALESCE(member.last_name, ''),
        'html',     admin_full
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_recital_booking_created ON public.recital_bookings;
CREATE TRIGGER on_recital_booking_created
  AFTER INSERT ON public.recital_bookings
  FOR EACH ROW EXECUTE FUNCTION public.send_recital_booking_emails();

-- ---------------------------------------------------------------------
-- 3. Booking scored → email member (pass = query cleared / fail = rebook)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.send_recital_score_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resend_key  text := get_secret('resend_api_key');
  site_url    text := COALESCE(get_secret('site_url'), 'https://beninchoraleandphilharmonic.com');
  cfg         public.recital_config%ROWTYPE;
  member      record;
  inner_html  text;
  full_html   text;
  subject     text;
BEGIN
  -- Only fire when status transitions from scheduled → passed/failed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  IF NEW.status NOT IN ('passed', 'failed') THEN
    RETURN NEW;
  END IF;

  IF resend_key IS NULL OR resend_key = '' THEN
    RAISE WARNING 'RESEND_API_KEY not set in vault';
    RETURN NEW;
  END IF;

  SELECT first_name, email
  INTO member
  FROM public.profiles
  WHERE id = NEW.profile_id;

  IF member.email IS NULL OR member.email = '' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO cfg FROM public.recital_config WHERE id = 1;

  IF NEW.status = 'passed' THEN
    subject := '🎉 Recital passed — your query has been cleared';
    inner_html :=
         '<div style="background: #f9f9f7; border-radius: 12px; padding: 32px; border: 1px solid #e5e5e5;">'
      || '<h2 style="color: #1a5632; font-size: 22px; margin: 0 0 16px;">Congratulations, ' || COALESCE(member.first_name, 'Member') || '!</h2>'
      || '<p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">'
      || 'You <strong>passed</strong> your compulsory recital with a score of '
      || '<strong>' || NEW.total_score || '/100</strong>. The query against you has been '
      || '<strong>cleared</strong>.</p>'
      || '<div style="background: #d1fae5; border: 1px solid #6ee7b7; border-radius: 8px; padding: 14px 18px; margin: 16px 0;">'
      || '<p style="color: #065f46; font-size: 14px; line-height: 1.6; margin: 0;">'
      || '<strong>Well done.</strong> Your discipline and artistry uphold the standards of The Benin Chorale &amp; Philharmonic.</p></div>'
      || '<div style="text-align: center; margin-top: 24px;">'
      || '<a href="' || site_url || '/dashboard/recital" style="display: inline-block; background: #1a5632; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600;">View My Result</a>'
      || '</div></div>';
  ELSE
    subject := 'Recital not yet passed — please rebook';
    inner_html :=
         '<div style="background: #f9f9f7; border-radius: 12px; padding: 32px; border: 1px solid #e5e5e5;">'
      || '<h2 style="color: #b91c1c; font-size: 20px; margin: 0 0 16px;">Recital not yet passed</h2>'
      || '<p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">'
      || 'Hi ' || COALESCE(member.first_name, 'there') || ', your recital was scored '
      || '<strong>' || NEW.total_score || '/100</strong>, which is below the pass mark of '
      || '<strong>' || cfg.pass_mark || '</strong>.</p>'
      || '<p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">'
      || 'Your query <strong>remains open</strong>. You can — and must — rebook a new Friday slot '
      || 'before <strong>' || to_char(cfg.cutoff_date, 'FMDay, FMDD FMMonth YYYY') || '</strong> '
      || 'and try again. Use the time to work closely with your vocal coach and accompanist.</p>'
      || '<div style="text-align: center; margin-top: 24px;">'
      || '<a href="' || site_url || '/dashboard/recital" style="display: inline-block; background: #1a5632; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600;">Rebook My Recital</a>'
      || '</div></div>';
  END IF;

  full_html := build_email_html(inner_html);

  PERFORM net.http_post(
    url     := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || resend_key,
      'Content-Type',  'application/json'
    ),
    body    := jsonb_build_object(
      'from',    'The Benin Chorale & Philharmonic <noreply@beninchoraleandphilharmonic.com>',
      'to',       member.email,
      'subject',  subject,
      'html',     full_html
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_recital_booking_scored ON public.recital_bookings;
CREATE TRIGGER on_recital_booking_scored
  AFTER UPDATE OF status ON public.recital_bookings
  FOR EACH ROW EXECUTE FUNCTION public.send_recital_score_email();
