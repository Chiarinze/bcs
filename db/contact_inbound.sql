-- =====================================================================
-- CONTACT INBOX — inbound replies from visitors
-- Run AFTER contact_messages.sql and email_log.sql.
-- Idempotent: safe to re-run.
--
-- Outgoing replies now carry Reply-To: reply+<message_id>@<domain>.
-- Cloudflare Email Routing hands mail to that address to a Worker, which
-- POSTs it to /api/webhooks/inbound; that route inserts a contact_replies
-- row with direction = 'inbound'. The trigger below then re-opens the
-- message and notifies the admins instead of emailing the visitor.
-- =====================================================================

ALTER TABLE public.contact_replies
  ADD COLUMN IF NOT EXISTS direction  text NOT NULL DEFAULT 'outbound'
    CHECK (direction IN ('outbound', 'inbound'));
ALTER TABLE public.contact_replies ADD COLUMN IF NOT EXISTS from_email text;
ALTER TABLE public.contact_replies ADD COLUMN IF NOT EXISTS email_message_id text;

-- Dedupe safety: the same inbound email must not be stored twice.
CREATE UNIQUE INDEX IF NOT EXISTS contact_replies_email_message_id_key
  ON public.contact_replies (email_message_id) WHERE email_message_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.send_contact_reply_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  site_url     text := COALESCE(get_secret('site_url'), 'https://beninchoraleandphilharmonic.com');
  msg          public.contact_messages%ROWTYPE;
  admin_record record;
  reply_html   text;
  snippet      text;
  inner_html   text;
  full_html    text;
BEGIN
  SELECT * INTO msg FROM public.contact_messages WHERE id = NEW.message_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- ================= INBOUND: visitor replied =================
  IF NEW.direction = 'inbound' THEN
    UPDATE public.contact_messages
    SET status = 'new', read_at = NULL
    WHERE id = msg.id;

    snippet := left(regexp_replace(NEW.body, '\s+', ' ', 'g'), 200);
    IF length(NEW.body) > 200 THEN snippet := snippet || '…'; END IF;

    inner_html :=
         '<div style="background: #f9f9f7; border-radius: 12px; padding: 32px; border: 1px solid #e5e5e5;">'
      || '<h2 style="color: #1a5632; font-size: 20px; margin: 0 0 16px;">' || html_escape(msg.name) || ' replied</h2>'
      || '<p style="color: #6b7280; font-size: 14px; margin: 0 0 16px;">Re: ' || html_escape(msg.subject) || '</p>'
      || '<div style="background: #ffffff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 14px 18px; margin: 0 0 16px;">'
      || '<p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0;">' || html_escape(snippet) || '</p>'
      || '</div>'
      || '<p style="margin: 24px 0 0;">'
      || '<a href="' || site_url || '/admin/contact?m=' || msg.id || '" style="background: #1a5632; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 500; display: inline-block;">Open conversation</a>'
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
        'contact_inbound',
        admin_record.email,
        'Reply from ' || msg.name || ': ' || msg.subject,
        full_html,
        'The Benin Chorale & Philharmonic <noreply@beninchoraleandphilharmonic.com>',
        NULL, NULL, NULL,
        jsonb_build_object('message_id', msg.id)
      );
    END LOOP;

    RETURN NEW;
  END IF;

  -- ================= OUTBOUND: admin replied =================
  UPDATE public.contact_messages
  SET status = 'replied', read_at = COALESCE(read_at, now())
  WHERE id = msg.id;

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
    || '<p style="color: #9ca3af; font-size: 12px; margin: 16px 0 0;">You can reply to this email directly and it will reach us.</p>'
    || '</div>';

  full_html := build_email_html(inner_html);

  -- Reply-To routes the visitor's answer back into this thread.
  PERFORM send_email(
    'contact_reply',
    msg.email,
    'Re: ' || msg.subject,
    full_html,
    'The Benin Chorale & Philharmonic <info@beninchoraleandphilharmonic.com>',
    'reply+' || msg.id || '@beninchoraleandphilharmonic.com',
    NULL, NULL,
    jsonb_build_object('message_id', msg.id)
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
