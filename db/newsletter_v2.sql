-- =====================================================================
-- NEWSLETTER v2
--   1. Stuck-status fix: deliveries no longer wait on the 15-minute cron
--      to settle, and a campaign can be reconciled on demand.
--   2. Send to selected subscribers instead of the whole list.
--   3. Personalisation: {{first_name}} / {{name}} merge tags.
-- Run AFTER newsletter.sql and email_log.sql. Idempotent.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. AUDIENCE
-- ---------------------------------------------------------------------
ALTER TABLE public.newsletters ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'all'
  CHECK (audience IN ('all', 'selected'));

CREATE TABLE IF NOT EXISTS public.newsletter_recipients (
  newsletter_id uuid NOT NULL REFERENCES public.newsletters(id) ON DELETE CASCADE,
  subscriber_id uuid NOT NULL REFERENCES public.subscribers(id) ON DELETE CASCADE,
  PRIMARY KEY (newsletter_id, subscriber_id)
);
ALTER TABLE public.newsletter_recipients ENABLE ROW LEVEL SECURITY;  -- service role only

-- ---------------------------------------------------------------------
-- 2. PERSONALISATION
--    {{first_name}} → first word of the stored name
--    {{name}}       → the full stored name
--    Both fall back to the given text when we have no name, e.g.
--    "Hi {{first_name|there}}," → "Hi there,"
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.personalize(p_text text, p_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  full_name  text := NULLIF(trim(COALESCE(p_name, '')), '');
  first_name text := split_part(COALESCE(full_name, ''), ' ', 1);
  out_text   text := COALESCE(p_text, '');
  m          text[];
BEGIN
  -- Tags with an explicit fallback: {{first_name|there}}
  FOR m IN SELECT regexp_matches(out_text, '\{\{\s*(first_name|name)\s*\|\s*([^}]*)\}\}', 'g') LOOP
    out_text := replace(
      out_text,
      (SELECT substring(out_text from '\{\{\s*' || m[1] || '\s*\|\s*' || regexp_replace(m[2], '([.^$*+?()\[\]{}|\\])', '\\\1', 'g') || '\s*\}\}')),
      COALESCE(NULLIF(CASE WHEN m[1] = 'name' THEN full_name ELSE NULLIF(first_name, '') END, ''), m[2])
    );
  END LOOP;

  -- Bare tags fall back to a neutral greeting word.
  out_text := regexp_replace(out_text, '\{\{\s*first_name\s*\}\}', COALESCE(NULLIF(first_name, ''), 'there'), 'gi');
  out_text := regexp_replace(out_text, '\{\{\s*name\s*\}\}',       COALESCE(full_name, 'there'), 'gi');

  RETURN out_text;
END;
$$;

-- ---------------------------------------------------------------------
-- 3. ENQUEUE — honours the selected audience
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enqueue_newsletter(p_newsletter_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  nl public.newsletters%ROWTYPE;
  n  int;
BEGIN
  SELECT * INTO nl FROM public.newsletters WHERE id = p_newsletter_id AND status = 'draft';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Newsletter is not a draft';
  END IF;

  INSERT INTO public.newsletter_deliveries (newsletter_id, subscriber_id, email)
  SELECT p_newsletter_id, s.id, s.email
  FROM public.subscribers s
  WHERE s.status = 'subscribed'
    AND (
      nl.audience = 'all'
      OR EXISTS (
        SELECT 1 FROM public.newsletter_recipients r
        WHERE r.newsletter_id = p_newsletter_id AND r.subscriber_id = s.id
      )
    )
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
-- 4. SETTLE — resolve in-flight deliveries and roll the counts up.
--    Called at the start of every queue run AND on demand by the admin
--    page, so a campaign never looks stuck waiting for the next cron.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.settle_newsletter_deliveries()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Pull in any pg_net responses that have arrived since the last run.
  PERFORM reconcile_email_log();

  UPDATE public.newsletter_deliveries nd
  SET status = 'failed', last_error = l.error
  FROM public.email_log l
  WHERE nd.email_log_id = l.id AND nd.status = 'sending' AND l.status = 'failed';

  UPDATE public.newsletter_deliveries nd
  SET status = 'sent', sent_at = COALESCE(nd.sent_at, l.resolved_at, now())
  FROM public.email_log l
  WHERE nd.email_log_id = l.id AND nd.status = 'sending' AND l.status IN ('sent', 'unknown');

  -- Safety net: a send handed to Resend that never resolved either way
  -- (e.g. the response aged out before reconcile ran) is counted as sent
  -- after an hour rather than hanging in 'sending' forever.
  UPDATE public.newsletter_deliveries
  SET status = 'sent', sent_at = COALESCE(sent_at, now())
  WHERE status = 'sending'
    AND created_at < now() - interval '1 hour';

  -- Retry genuine failures up to 3 attempts.
  UPDATE public.newsletter_deliveries
  SET status = 'pending'
  WHERE status = 'failed' AND attempts < 3;

  -- Roll up counts and close finished campaigns. Correlated subqueries (not
  -- a join) so a campaign whose deliveries have all been removed — e.g. the
  -- subscribers were deleted, which cascades — still gets closed instead of
  -- sitting in 'sending' forever.
  UPDATE public.newsletters n
  SET sent_count   = (SELECT count(*) FROM public.newsletter_deliveries d
                      WHERE d.newsletter_id = n.id AND d.status = 'sent'),
      failed_count = (SELECT count(*) FROM public.newsletter_deliveries d
                      WHERE d.newsletter_id = n.id AND d.status = 'failed'),
      status       = CASE WHEN (SELECT count(*) FROM public.newsletter_deliveries d
                                WHERE d.newsletter_id = n.id AND d.status IN ('pending', 'sending')) = 0
                          THEN 'sent' ELSE n.status END,
      completed_at = CASE WHEN (SELECT count(*) FROM public.newsletter_deliveries d
                                WHERE d.newsletter_id = n.id AND d.status IN ('pending', 'sending')) = 0
                          THEN COALESCE(n.completed_at, now()) ELSE n.completed_at END,
      updated_at   = now()
  WHERE n.status IN ('queued', 'sending');
END;
$$;

-- ---------------------------------------------------------------------
-- 5. PROCESS QUEUE — settles first, then sends a personalised batch
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
  body       text;
  html       text;
  log_id     uuid;
  sent_now   int := 0;
BEGIN
  PERFORM settle_newsletter_deliveries();

  SELECT * INTO cfg FROM public.newsletter_settings WHERE id = 1;

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
    body := personalize(nl.body_html, d.name);
    html := build_email_html(render_newsletter_html(body, personalize(nl.preheader, d.name), unsub_url));

    log_id := send_email(
      'newsletter',
      d.email,
      personalize(nl.subject, d.name),
      html,
      'The Benin Chorale & Philharmonic <noreply@beninchoraleandphilharmonic.com>',
      'info@beninchoraleandphilharmonic.com',
      jsonb_build_object(
        'List-Unsubscribe',      '<' || unsub_url || '>',
        'List-Unsubscribe-Post', 'List-Unsubscribe=One-Click'
      ),
      html_to_text(body) || E'\n\n—\nUnsubscribe: ' || unsub_url,
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

  DELETE FROM public.newsletter_deliveries nd
  USING public.subscribers s
  WHERE nd.subscriber_id = s.id AND nd.status = 'pending' AND s.status = 'unsubscribed';

  PERFORM settle_newsletter_deliveries();

  RETURN sent_now;
END;
$$;

-- ---------------------------------------------------------------------
-- 6. TEST SEND — personalised with the admin's own name
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
  who      text;
  body     text;
BEGIN
  SELECT subject, preheader, body_html INTO nl FROM public.newsletters WHERE id = p_newsletter_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Newsletter not found';
  END IF;

  SELECT trim(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
  INTO who
  FROM public.profiles WHERE lower(email) = lower(p_to) LIMIT 1;

  body := personalize(nl.body_html, who);

  RETURN send_email(
    'newsletter_test',
    p_to,
    '[TEST] ' || personalize(nl.subject, who),
    build_email_html(render_newsletter_html(body, personalize(nl.preheader, who), site_url || '/unsubscribe/test')),
    'The Benin Chorale & Philharmonic <noreply@beninchoraleandphilharmonic.com>',
    NULL, NULL,
    html_to_text(body),
    jsonb_build_object('newsletter_id', p_newsletter_id)
  );
END;
$$;

-- ---------------------------------------------------------------------
-- 7. ONE-OFF: settle anything left hanging by the previous version
-- ---------------------------------------------------------------------
SELECT public.settle_newsletter_deliveries();

-- ---------------------------------------------------------------------
-- 8. DIAGNOSTICS — run these if a campaign still looks stuck
-- ---------------------------------------------------------------------
-- Are the cron jobs actually running (and succeeding)?
--   SELECT j.jobname, r.status, r.return_message, r.start_time
--   FROM cron.job_run_details r JOIN cron.job j ON j.jobid = r.jobid
--   ORDER BY r.start_time DESC LIMIT 20;
--
-- What state are this campaign's deliveries in?
--   SELECT nd.status, l.status AS log_status, l.status_code, l.error, count(*)
--   FROM newsletter_deliveries nd LEFT JOIN email_log l ON l.id = nd.email_log_id
--   GROUP BY 1,2,3,4 ORDER BY 1;
