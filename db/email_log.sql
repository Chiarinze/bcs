-- =====================================================================
-- EMAIL LOG — one helper every trigger sends through, plus a cron job
-- that reads pg_net's responses so the admin can see what happened.
-- Run in: Supabase Dashboard → SQL Editor (before newsletter.sql)
-- Idempotent: safe to re-run.
--
--   send_email(...)        → net.http_post + INSERT email_log (status 'queued')
--   reconcile_email_log()  → every 5 min: queued → sent / failed / unknown
--                            using net._http_response (kept ~6h by pg_net)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. EXTEND email_log (existing columns: id, kind, to_email, subject,
--    article_id, request_id, created_at)
-- ---------------------------------------------------------------------
ALTER TABLE public.email_log ADD COLUMN IF NOT EXISTS status       text NOT NULL DEFAULT 'queued'
  CHECK (status IN ('queued', 'sent', 'failed', 'unknown'));
ALTER TABLE public.email_log ADD COLUMN IF NOT EXISTS status_code  int;
ALTER TABLE public.email_log ADD COLUMN IF NOT EXISTS error        text;
ALTER TABLE public.email_log ADD COLUMN IF NOT EXISTS from_email   text;
ALTER TABLE public.email_log ADD COLUMN IF NOT EXISTS meta         jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.email_log ADD COLUMN IF NOT EXISTS resolved_at  timestamptz;

CREATE INDEX IF NOT EXISTS email_log_created_idx ON public.email_log (created_at DESC);
CREATE INDEX IF NOT EXISTS email_log_status_idx  ON public.email_log (status) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS email_log_kind_idx    ON public.email_log (kind);

ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;  -- admin API only (service role)

-- ---------------------------------------------------------------------
-- 2. send_email — the single path to Resend
--    Returns the email_log id. Never raises: a failure to enqueue is
--    recorded as 'failed' so the calling trigger still completes.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.send_email(
  p_kind      text,
  p_to        text,
  p_subject   text,
  p_html      text,
  p_from      text  DEFAULT 'The Benin Chorale & Philharmonic <noreply@beninchoraleandphilharmonic.com>',
  p_reply_to  text  DEFAULT NULL,
  p_headers   jsonb DEFAULT NULL,
  p_text      text  DEFAULT NULL,
  p_meta      jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resend_key text := get_secret('resend_api_key');
  payload    jsonb;
  req_id     bigint;
  log_id     uuid;
BEGIN
  INSERT INTO public.email_log (kind, to_email, subject, from_email, meta, article_id)
  VALUES (p_kind, p_to, p_subject, p_from, COALESCE(p_meta, '{}'::jsonb),
          NULLIF(p_meta->>'article_id', '')::uuid)
  RETURNING id INTO log_id;

  IF resend_key IS NULL OR resend_key = '' THEN
    UPDATE public.email_log
    SET status = 'failed', error = 'resend_api_key not set in vault', resolved_at = now()
    WHERE id = log_id;
    RETURN log_id;
  END IF;

  payload := jsonb_build_object(
    'from',    p_from,
    'to',      p_to,
    'subject', p_subject,
    'html',    p_html
  );
  IF p_reply_to IS NOT NULL THEN payload := payload || jsonb_build_object('reply_to', p_reply_to); END IF;
  IF p_headers  IS NOT NULL THEN payload := payload || jsonb_build_object('headers',  p_headers);  END IF;
  IF p_text     IS NOT NULL THEN payload := payload || jsonb_build_object('text',     p_text);     END IF;

  BEGIN
    SELECT net.http_post(
      url     := 'https://api.resend.com/emails',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || resend_key,
        'Content-Type',  'application/json'
      ),
      body    := payload
    ) INTO req_id;

    UPDATE public.email_log SET request_id = req_id WHERE id = log_id;
  EXCEPTION WHEN OTHERS THEN
    UPDATE public.email_log
    SET status = 'failed', error = SQLERRM, resolved_at = now()
    WHERE id = log_id;
  END;

  RETURN log_id;
END;
$$;

-- ---------------------------------------------------------------------
-- 3. reconcile_email_log — match queued rows with pg_net responses
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reconcile_email_log()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Responses that have arrived.
  UPDATE public.email_log l
  SET status      = CASE WHEN r.status_code BETWEEN 200 AND 299 THEN 'sent' ELSE 'failed' END,
      status_code = r.status_code,
      error       = CASE WHEN r.status_code BETWEEN 200 AND 299 THEN NULL
                         ELSE left(COALESCE(r.error_msg, r.content::text), 500) END,
      resolved_at = now()
  FROM net._http_response r
  WHERE l.status = 'queued'
    AND l.request_id IS NOT NULL
    AND r.id = l.request_id;

  -- Transport-level failures (timeout, DNS) come back with a null status code.
  UPDATE public.email_log l
  SET status = 'failed', error = left(r.error_msg, 500), resolved_at = now()
  FROM net._http_response r
  WHERE l.status = 'queued'
    AND l.request_id IS NOT NULL
    AND r.id = l.request_id
    AND r.status_code IS NULL
    AND r.error_msg IS NOT NULL;

  -- pg_net keeps responses ~6h; anything older we can no longer verify.
  UPDATE public.email_log
  SET status = 'unknown', resolved_at = now()
  WHERE status = 'queued'
    AND created_at < now() - interval '6 hours';
END;
$$;

-- ---------------------------------------------------------------------
-- 4. CRON — every 5 minutes
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reconcile-email-log') THEN
    PERFORM cron.unschedule('reconcile-email-log');
  END IF;
END$$;

SELECT cron.schedule('reconcile-email-log', '*/5 * * * *', $$SELECT public.reconcile_email_log();$$);
