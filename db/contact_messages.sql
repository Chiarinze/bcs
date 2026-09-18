-- =====================================================================
-- CONTACT FORM — stored messages, admin replies, email triggers
-- Run in: Supabase Dashboard → SQL Editor
-- Idempotent: safe to re-run.
--
-- Flow:
--   visitor submits form → INSERT contact_messages → on_contact_message
--     → short notification to every admin (points at the admin inbox;
--       the body stays in the DB so the mailbox does not fill up)
--   admin replies        → INSERT contact_replies  → on_contact_reply
--     → reply emailed to the visitor from info@, message marked 'replied'
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TABLES
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  email       text NOT NULL,
  phone       text,
  subject     text NOT NULL,
  message     text NOT NULL,
  ip_address  text,
  status      text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied')),
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contact_messages_created_idx
  ON public.contact_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS contact_messages_status_idx
  ON public.contact_messages (status);

CREATE TABLE IF NOT EXISTS public.contact_replies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id  uuid NOT NULL REFERENCES public.contact_messages(id) ON DELETE CASCADE,
  body        text NOT NULL,
  sent_by     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contact_replies_message_idx
  ON public.contact_replies (message_id, created_at);

-- No policies on purpose: only the service role (admin API routes) touches
-- these tables. The public form inserts through the API after captcha.
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_replies  ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 2. HELPER — escape user-supplied text before it goes into email HTML
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.html_escape(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT replace(replace(replace(replace(replace(COALESCE(input, ''),
    '&', '&amp;'),
    '<', '&lt;'),
    '>', '&gt;'),
    '"', '&quot;'),
    '''', '&#39;');
$$;

-- ---------------------------------------------------------------------
-- 3. EMAIL: new message → notify admins
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.send_contact_message_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  site_url     text := COALESCE(get_secret('site_url'), 'https://beninchoraleandphilharmonic.com');
  admin_record record;
  snippet      text;
  inner_html   text;
  full_html    text;
BEGIN

  snippet := left(regexp_replace(NEW.message, '\s+', ' ', 'g'), 200);
  IF length(NEW.message) > 200 THEN
    snippet := snippet || '…';
  END IF;

  inner_html :=
       '<div style="background: #f9f9f7; border-radius: 12px; padding: 32px; border: 1px solid #e5e5e5;">'
    || '<h2 style="color: #1a5632; font-size: 20px; margin: 0 0 16px;">New message from the website</h2>'
    || '<p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 4px;">'
    || '<strong>' || html_escape(NEW.name) || '</strong> &lt;' || html_escape(NEW.email) || '&gt;</p>'
    || '<p style="color: #6b7280; font-size: 14px; margin: 0 0 16px;">Subject: ' || html_escape(NEW.subject) || '</p>'
    || '<div style="background: #ffffff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 14px 18px; margin: 0 0 16px;">'
    || '<p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0;">' || html_escape(snippet) || '</p>'
    || '</div>'
    || '<p style="color: #6b7280; font-size: 13px; margin: 0 0 16px;">Read the full message and reply from the admin inbox.</p>'
    || '<p style="margin: 24px 0 0;">'
    || '<a href="' || site_url || '/admin/contact?m=' || NEW.id || '" style="background: #1a5632; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 500; display: inline-block;">Open inbox</a>'
    || '</p></div>';

  full_html := build_email_html(inner_html);

  FOR admin_record IN
    SELECT COALESCE(p.email, u.email) AS email
    FROM public.profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    WHERE p.role = 'admin'
      AND COALESCE(p.email, u.email) IS NOT NULL
      AND COALESCE(p.email, u.email) <> ''
  LOOP
    PERFORM send_email(
    'contact_message',
    admin_record.email,
    'Contact form: ' || NEW.subject,
    full_html,
    'The Benin Chorale & Philharmonic <noreply@beninchoraleandphilharmonic.com>',
    NEW.email
  );
  END LOOP;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Contact notification email failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_contact_message ON public.contact_messages;
CREATE TRIGGER on_contact_message
  AFTER INSERT ON public.contact_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.send_contact_message_email();

-- ---------------------------------------------------------------------
-- 4. EMAIL: admin reply → send to the visitor from info@
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.send_contact_reply_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  msg        public.contact_messages%ROWTYPE;
  reply_html text;
  inner_html text;
  full_html  text;
BEGIN
  SELECT * INTO msg FROM public.contact_messages WHERE id = NEW.message_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Mark as replied regardless of whether the email can be sent.
  UPDATE public.contact_messages
  SET status = 'replied', read_at = COALESCE(read_at, now())
  WHERE id = msg.id;

  -- Preserve the admin's line breaks.
  reply_html := replace(html_escape(NEW.body), E'\n', '<br/>');

  inner_html :=
       '<div style="background: #f9f9f7; border-radius: 12px; padding: 32px; border: 1px solid #e5e5e5;">'
    || '<p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">'
    || 'Hi ' || html_escape(split_part(msg.name, ' ', 1)) || ',</p>'
    || '<p style="color: #374151; font-size: 15px; line-height: 1.7; margin: 0 0 24px;">' || reply_html || '</p>'
    || '<div style="border-left: 3px solid #d1d5db; padding: 8px 16px; margin: 0; color: #6b7280; font-size: 13px; line-height: 1.6;">'
    || '<p style="margin: 0 0 6px;"><strong>Your message</strong> (' || to_char(msg.created_at, 'DD Mon YYYY') || '):</p>'
    || '<p style="margin: 0; white-space: pre-wrap;">' || html_escape(msg.message) || '</p>'
    || '</div>'
    || '</div>';

  full_html := build_email_html(inner_html);

  PERFORM send_email(
    'contact_reply',
    msg.email,
    'Re: ' || msg.subject,
    full_html,
    'The Benin Chorale & Philharmonic <info@beninchoraleandphilharmonic.com>',
    'info@beninchoraleandphilharmonic.com'
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Contact reply email failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_contact_reply ON public.contact_replies;
CREATE TRIGGER on_contact_reply
  AFTER INSERT ON public.contact_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.send_contact_reply_email();
