-- =====================================================================
-- NEWSLETTER — subscribers, campaigns, delivery queue, drip cron
-- Run AFTER email_log.sql (uses send_email) and contact_messages.sql
-- (uses html_escape).
-- Idempotent: safe to re-run.
--
-- Flow:
--   admin clicks Send → enqueue_newsletter(id) inserts one delivery row per
--   subscribed contact and marks the campaign 'queued'.
--   Every 15 min, process_newsletter_queue() sends a batch, staying under
--   the daily cap (Resend free tier = 100/day for ALL email; default cap
--   here is 80 to leave room for transactional mail). Sends are logged
--   through send_email(), and reconcile_email_log() marks them sent/failed.
--   Failed deliveries are retried up to 3 times.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. SETTINGS — single row
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.newsletter_settings (
  id          smallint PRIMARY KEY DEFAULT 1,
  daily_cap   int NOT NULL DEFAULT 80  CHECK (daily_cap BETWEEN 1 AND 10000),
  batch_size  int NOT NULL DEFAULT 20  CHECK (batch_size BETWEEN 1 AND 500),
  CONSTRAINT newsletter_settings_singleton CHECK (id = 1)
);
INSERT INTO public.newsletter_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.newsletter_settings ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 2. SUBSCRIBERS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscribers (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email              text NOT NULL,
  name               text,
  source             text NOT NULL DEFAULT 'manual',   -- ticket | registration | import | manual
  status             text NOT NULL DEFAULT 'subscribed' CHECK (status IN ('subscribed', 'unsubscribed')),
  unsubscribe_token  uuid NOT NULL DEFAULT gen_random_uuid(),
  consent_at         timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at    timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS subscribers_email_key ON public.subscribers (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS subscribers_token_key ON public.subscribers (unsubscribe_token);
CREATE INDEX IF NOT EXISTS subscribers_status_idx ON public.subscribers (status);

ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;  -- service role only

-- Upsert used by ticket/registration flows and the CSV importer.
-- Never re-subscribes someone who unsubscribed (they must opt back in via
-- the unsubscribe page).
CREATE OR REPLACE FUNCTION public.upsert_subscriber(p_email text, p_name text, p_source text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_email IS NULL OR p_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.subscribers (email, name, source)
  VALUES (lower(trim(p_email)), NULLIF(trim(p_name), ''), COALESCE(p_source, 'manual'))
  ON CONFLICT (lower(email)) DO UPDATE
    SET name       = COALESCE(public.subscribers.name, EXCLUDED.name),
        updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------
-- 3. NEWSLETTERS (campaigns)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.newsletters (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject           text NOT NULL,
  preheader         text,
  body_html         text NOT NULL DEFAULT '',
  kind              text NOT NULL DEFAULT 'newsletter' CHECK (kind IN ('newsletter', 'promotional')),
  status            text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'queued', 'sending', 'paused', 'sent', 'cancelled')),
  total_recipients  int NOT NULL DEFAULT 0,
  sent_count        int NOT NULL DEFAULT 0,
  failed_count      int NOT NULL DEFAULT 0,
  created_by        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  queued_at         timestamptz,
  completed_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS newsletters_status_idx ON public.newsletters (status, queued_at);
ALTER TABLE public.newsletters ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.newsletter_deliveries (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id  uuid NOT NULL REFERENCES public.newsletters(id) ON DELETE CASCADE,
  subscriber_id  uuid NOT NULL REFERENCES public.subscribers(id) ON DELETE CASCADE,
  email          text NOT NULL,
  status         text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  attempts       int  NOT NULL DEFAULT 0,
  email_log_id   uuid REFERENCES public.email_log(id) ON DELETE SET NULL,
  last_error     text,
  sent_at        timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (newsletter_id, subscriber_id)
);

CREATE INDEX IF NOT EXISTS newsletter_deliveries_pending_idx
  ON public.newsletter_deliveries (newsletter_id, created_at)
  WHERE status = 'pending';

ALTER TABLE public.newsletter_deliveries ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 4. ENQUEUE — snapshot the current subscriber list for a campaign
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enqueue_newsletter(p_newsletter_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.newsletters WHERE id = p_newsletter_id AND status = 'draft') THEN
    RAISE EXCEPTION 'Newsletter is not a draft';
  END IF;

  INSERT INTO public.newsletter_deliveries (newsletter_id, subscriber_id, email)
  SELECT p_newsletter_id, s.id, s.email
  FROM public.subscribers s
  WHERE s.status = 'subscribed'
  ON CONFLICT (newsletter_id, subscriber_id) DO NOTHING;

  SELECT count(*) INTO n FROM public.newsletter_deliveries WHERE newsletter_id = p_newsletter_id;

  UPDATE public.newsletters
  SET status = CASE WHEN n = 0 THEN 'sent' ELSE 'queued' END,
      total_recipients = n,
      queued_at = now(),
      completed_at = CASE WHEN n = 0 THEN now() ELSE NULL END,
      updated_at = now()
  WHERE id = p_newsletter_id;

  RETURN n;
END;
$$;

-- ---------------------------------------------------------------------
-- 5. RENDER — the campaign body inside the standard template, with the
--    unsubscribe footer. Also a plain-text version for spam filters.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.render_newsletter_html(p_body_html text, p_preheader text, p_unsub_url text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    -- Hidden preview text some clients show next to the subject.
    CASE WHEN COALESCE(p_preheader, '') <> ''
      THEN '<div style="display:none; max-height:0; overflow:hidden; opacity:0;">' || html_escape(p_preheader) || '</div>'
      ELSE '' END
    || '<div style="color: #374151; font-size: 15px; line-height: 1.7;">'
    -- Give images a sane width in mail clients; the editor emits bare <img>.
    || regexp_replace(p_body_html, '<img ', '<img style="max-width:100%; height:auto; border-radius:8px;" ', 'g')
    || '</div>'
    || '<hr style="border: 0; border-top: 1px solid #e5e5e5; margin: 32px 0 16px;" />'
    || '<p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">'
    || 'You are receiving this because you registered for one of our events or subscribed to our updates. '
    || '<a href="' || p_unsub_url || '" style="color: #6b7280;">Unsubscribe</a>'
    || '</p>';
$$;

CREATE OR REPLACE FUNCTION public.html_to_text(p_html text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(COALESCE(p_html, ''), '<br\s*/?>|</p>|</h[1-6]>|</li>|</div>', E'\n', 'gi'),
        '<[^>]+>', '', 'g'),
      '&nbsp;', ' ', 'g'),
    E'\n{3,}', E'\n\n', 'g'));
$$;

-- ---------------------------------------------------------------------
-- 6. PROCESS QUEUE — called by cron every 15 minutes
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_newsletter_queue()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg        public.newsletter_settings%ROWTYPE;
  site_url   text := COALESCE(get_secret('site_url'), 'https://beninchoraleandphilharmonic.com');
  sent_today int;
  budget     int;
  d          record;
  nl         record;
  unsub_url  text;
  html       text;
  log_id     uuid;
  sent_now   int := 0;
BEGIN
  SELECT * INTO cfg FROM public.newsletter_settings WHERE id = 1;

  -- Retry deliveries whose send was recorded as failed by the log (max 3 attempts).
  UPDATE public.newsletter_deliveries nd
  SET status = 'failed', last_error = l.error
  FROM public.email_log l
  WHERE nd.email_log_id = l.id
    AND nd.status = 'sending'
    AND l.status = 'failed';

  UPDATE public.newsletter_deliveries nd
  SET status = 'sent', sent_at = COALESCE(nd.sent_at, l.resolved_at, now())
  FROM public.email_log l
  WHERE nd.email_log_id = l.id
    AND nd.status = 'sending'
    AND l.status IN ('sent', 'unknown');

  UPDATE public.newsletter_deliveries
  SET status = 'pending'
  WHERE status = 'failed' AND attempts < 3;

  -- Everything sent today (all kinds) counts against the provider's cap.
  SELECT count(*) INTO sent_today
  FROM public.email_log
  WHERE created_at >= date_trunc('day', now())
    AND status <> 'failed';

  budget := LEAST(cfg.batch_size, cfg.daily_cap - sent_today);
  IF budget <= 0 THEN
    RETURN 0;
  END IF;

  FOR d IN
    SELECT nd.id, nd.newsletter_id, nd.email, s.name, s.unsubscribe_token
    FROM public.newsletter_deliveries nd
    JOIN public.newsletters n ON n.id = nd.newsletter_id
    JOIN public.subscribers s ON s.id = nd.subscriber_id
    WHERE nd.status = 'pending'
      AND n.status IN ('queued', 'sending')
      AND s.status = 'subscribed'
    ORDER BY n.queued_at, nd.created_at
    LIMIT budget
    FOR UPDATE OF nd SKIP LOCKED
  LOOP
    SELECT subject, preheader, body_html, kind INTO nl
    FROM public.newsletters WHERE id = d.newsletter_id;

    unsub_url := site_url || '/unsubscribe/' || d.unsubscribe_token;
    html := build_email_html(render_newsletter_html(nl.body_html, nl.preheader, unsub_url));

    log_id := send_email(
      'newsletter',
      d.email,
      nl.subject,
      html,
      'The Benin Chorale & Philharmonic <noreply@beninchoraleandphilharmonic.com>',
      'info@beninchoraleandphilharmonic.com',
      jsonb_build_object(
        'List-Unsubscribe',      '<' || unsub_url || '>',
        'List-Unsubscribe-Post', 'List-Unsubscribe=One-Click'
      ),
      html_to_text(nl.body_html) || E'\n\n—\nUnsubscribe: ' || unsub_url,
      jsonb_build_object('newsletter_id', d.newsletter_id, 'kind', nl.kind)
    );

    UPDATE public.newsletter_deliveries
    SET status = 'sending', attempts = attempts + 1, email_log_id = log_id
    WHERE id = d.id;

    UPDATE public.newsletters
    SET status = 'sending', updated_at = now()
    WHERE id = d.newsletter_id AND status = 'queued';

    sent_now := sent_now + 1;
  END LOOP;

  -- Unsubscribed since enqueue: drop their pending rows.
  DELETE FROM public.newsletter_deliveries nd
  USING public.subscribers s
  WHERE nd.subscriber_id = s.id AND nd.status = 'pending' AND s.status = 'unsubscribed';

  -- Roll up counts and close finished campaigns.
  UPDATE public.newsletters n
  SET sent_count   = c.sent,
      failed_count = c.failed,
      status       = CASE WHEN c.open = 0 AND n.status IN ('queued', 'sending') THEN 'sent' ELSE n.status END,
      completed_at = CASE WHEN c.open = 0 AND n.status IN ('queued', 'sending') THEN now() ELSE n.completed_at END,
      updated_at   = now()
  FROM (
    SELECT newsletter_id,
           count(*) FILTER (WHERE status = 'sent')                 AS sent,
           count(*) FILTER (WHERE status = 'failed')               AS failed,
           count(*) FILTER (WHERE status IN ('pending', 'sending')) AS open
    FROM public.newsletter_deliveries
    GROUP BY newsletter_id
  ) c
  WHERE c.newsletter_id = n.id AND n.status IN ('queued', 'sending');

  RETURN sent_now;
END;
$$;

-- ---------------------------------------------------------------------
-- 7. TEST SEND — one copy to an admin, outside the queue (still logged)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.send_newsletter_test(p_newsletter_id uuid, p_to text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  site_url text := COALESCE(get_secret('site_url'), 'https://beninchoraleandphilharmonic.com');
  nl       record;
BEGIN
  SELECT subject, preheader, body_html INTO nl FROM public.newsletters WHERE id = p_newsletter_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Newsletter not found';
  END IF;

  RETURN send_email(
    'newsletter_test',
    p_to,
    '[TEST] ' || nl.subject,
    build_email_html(render_newsletter_html(nl.body_html, nl.preheader, site_url || '/unsubscribe/test')),
    'The Benin Chorale & Philharmonic <noreply@beninchoraleandphilharmonic.com>',
    NULL, NULL,
    html_to_text(nl.body_html),
    jsonb_build_object('newsletter_id', p_newsletter_id)
  );
END;
$$;

-- ---------------------------------------------------------------------
-- 8. CRON — every 15 minutes
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-newsletter-queue') THEN
    PERFORM cron.unschedule('process-newsletter-queue');
  END IF;
END$$;

SELECT cron.schedule('process-newsletter-queue', '*/15 * * * *', $$SELECT public.process_newsletter_queue();$$);
