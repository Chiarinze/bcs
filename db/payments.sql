-- =====================================================================
-- PAYMENTS — every Paystack charge is recorded here BEFORE the customer
-- pays, then fulfilled by whichever arrives first: the Paystack webhook,
-- the customer's browser returning, or the 15-minute reconcile job.
--
-- Run in: Supabase Dashboard → SQL Editor, AFTER email_log.sql and
-- newsletter.sql (send_email, build_email_html, html_escape,
-- upsert_subscriber). Run it BEFORE deploying the matching code.
-- Idempotent: safe to re-run.
--
-- One-off setup for the reconcile job: add a vault secret named
-- 'cron_secret' holding the same value as the CRON_SECRET env var, and
-- make sure the 'site_url' secret is the final production host (pg_net
-- does not follow redirects).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TABLE
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference      text NOT NULL UNIQUE,
  kind           text NOT NULL CHECK (kind IN ('ticket', 'internal', 'donation', 'unknown')),
  status         text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'fulfilled', 'needs_review', 'failed', 'refunded', 'dismissed')),
  review_reason  text,
  amount_kobo    bigint NOT NULL CHECK (amount_kobo >= 0),
  currency       text NOT NULL DEFAULT 'NGN',
  event_id       uuid REFERENCES public.events(id) ON DELETE SET NULL,
  user_id        uuid,
  email          text NOT NULL,
  name           text,
  -- { row: <columns for the record to create>, coupon_code, subscribe }
  details        jsonb NOT NULL DEFAULT '{}'::jsonb,
  paid_kobo      bigint,
  paid_currency  text,
  paid_at        timestamptz,
  paystack_id    bigint,
  gateway_status text,
  checked_at     timestamptz,
  fulfilled_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- True while this payment accounts for one use in coupon_codes.usage_count:
-- held from the start of checkout, kept once paid, released if abandoned.
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS coupon_held boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS payments_status_created_idx ON public.payments (status, created_at DESC);
CREATE INDEX IF NOT EXISTS payments_event_user_idx     ON public.payments (event_id, user_id, status);
CREATE INDEX IF NOT EXISTS payments_event_email_idx    ON public.payments (event_id, email, status);
CREATE INDEX IF NOT EXISTS payments_paystack_id_idx    ON public.payments (paystack_id);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can read payments" ON public.payments;
CREATE POLICY "Admin can read payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- ---------------------------------------------------------------------
-- 2. COUPON LIMITS — the column the admin form has always asked for
-- ---------------------------------------------------------------------
ALTER TABLE public.coupon_codes ADD COLUMN IF NOT EXISTS usage_limit integer;

-- ---------------------------------------------------------------------
-- 3. ONE RECORD PER REFERENCE — existing duplicates would stop the index
--    being created, so report them instead of aborting the whole script.
--    Fulfilment does not depend on these (it locks the payments row).
-- ---------------------------------------------------------------------
DO $$
BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS tickets_payment_ref_key ON public.tickets (payment_ref);
EXCEPTION WHEN unique_violation THEN
  RAISE WARNING 'tickets has duplicate payment_ref values; unique index skipped. Remove them and re-run.';
END $$;

DO $$
BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS donations_payment_reference_key ON public.donations (payment_reference);
EXCEPTION WHEN unique_violation THEN
  RAISE WARNING 'donations has duplicate payment_reference values; unique index skipped. Remove them and re-run.';
END $$;

-- ---------------------------------------------------------------------
-- 4. ADMIN ALERT — a payment needs a human. Never blocks the caller.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.alert_payment_review(p_reference text, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  site_url text := COALESCE(get_secret('site_url'), 'https://beninchoraleandphilharmonic.com');
BEGIN
  PERFORM send_email(
    'payment_review',
    COALESCE(NULLIF(get_secret('admin_email'), ''), 'info@beninchoraleandphilharmonic.com'),
    'A payment needs review — ' || p_reference,
    build_email_html(
      '<p style="color: #374151; font-size: 15px; line-height: 1.6;">A payment could not be completed automatically.</p>'
      || '<p style="color: #374151; font-size: 14px;">Reference: <code>' || html_escape(p_reference) || '</code><br/>'
      || 'Reason: ' || html_escape(p_reason) || '</p>'
      || '<p><a href="' || site_url || '/admin/payments">Open payments</a></p>'
    )
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Payment review alert failed: %', SQLERRM;
END;
$$;

-- ---------------------------------------------------------------------
-- 5. FULFIL — call with what Paystack reported. Safe to call any number
--    of times and from several places at once: the row lock makes every
--    caller after the first see the finished result.
--
--    Money received is always honoured. Closing registration, editing a
--    price or disabling a coupon after checkout started changes nothing.
--    Anything that cannot complete becomes needs_review, never an error.
--
--    p_force (admin "Complete registration") skips the amount check only.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fulfill_payment(
  p_reference   text,
  p_paid_kobo   bigint,
  p_currency    text,
  p_paid_at     timestamptz DEFAULT NULL,
  p_paystack_id bigint      DEFAULT NULL,
  p_email       text        DEFAULT NULL,
  p_force       boolean     DEFAULT false
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p        public.payments%ROWTYPE;
  v_reason text;
  v_coupon text;
  v_naira  numeric;
BEGIN
  SELECT * INTO p FROM public.payments WHERE reference = p_reference FOR UPDATE;

  -- Paid, but we never created this reference (for example a checkout
  -- opened before this system was deployed). Keep it visible.
  IF NOT FOUND THEN
    INSERT INTO public.payments (reference, kind, status, review_reason, amount_kobo, currency, email,
                                 paid_kobo, paid_currency, paid_at, paystack_id, gateway_status)
    VALUES (p_reference, 'unknown', 'needs_review', 'Paid, but no matching order on this site',
            COALESCE(p_paid_kobo, 0), COALESCE(p_currency, 'NGN'), COALESCE(p_email, 'unknown'),
            p_paid_kobo, p_currency, COALESCE(p_paid_at, now()), p_paystack_id, 'success')
    ON CONFLICT (reference) DO NOTHING;
    PERFORM alert_payment_review(p_reference, 'Paid, but no matching order on this site');
    RETURN 'needs_review';
  END IF;

  IF p.status IN ('fulfilled', 'refunded', 'dismissed') THEN
    RETURN p.status;
  END IF;

  IF p.status = 'needs_review' AND NOT p_force THEN
    RETURN p.status;
  END IF;

  UPDATE public.payments
  SET paid_kobo = p_paid_kobo, paid_currency = p_currency,
      paid_at = COALESCE(p_paid_at, paid_at, now()),
      paystack_id = COALESCE(p_paystack_id, paystack_id),
      gateway_status = 'success', updated_at = now()
  WHERE id = p.id;

  v_naira  := p.amount_kobo / 100.0;
  v_coupon := NULLIF(p.details->>'coupon_code', '');

  IF NOT p_force AND (p_paid_kobo IS DISTINCT FROM p.amount_kobo OR p_currency IS DISTINCT FROM p.currency) THEN
    v_reason := format('Paid %s %s, expected %s %s',
                       COALESCE(p_currency, '?'), COALESCE(p_paid_kobo / 100.0, 0), p.currency, v_naira);
  ELSIF p.kind = 'unknown' THEN
    v_reason := 'No order details to complete this payment with';
  ELSIF p.kind IN ('ticket', 'internal') AND p.event_id IS NULL THEN
    v_reason := 'The event no longer exists';
  ELSIF p.kind = 'internal' AND EXISTS (
    SELECT 1 FROM public.internal_event_registrations r
    WHERE r.event_id = p.event_id AND r.user_id = p.user_id
      AND r.payment_ref IS DISTINCT FROM p.reference
  ) THEN
    v_reason := 'Member was already registered: this is a second payment, refund it';
  END IF;

  IF v_reason IS NULL THEN
    BEGIN
      IF p.kind = 'ticket' AND NOT EXISTS (SELECT 1 FROM public.tickets WHERE payment_ref = p.reference) THEN
        INSERT INTO public.tickets
          (event_id, buyer_name, buyer_email, category, amount_paid, payment_ref, coupon_code,
           affiliation, presenting_paper, paper_title)
        SELECT p.event_id, r.buyer_name, r.buyer_email, r.category, v_naira, p.reference, v_coupon,
               r.affiliation, r.presenting_paper, r.paper_title
        FROM jsonb_populate_record(NULL::public.tickets, p.details->'row') r;

      ELSIF p.kind = 'internal' AND NOT EXISTS (
        SELECT 1 FROM public.internal_event_registrations WHERE payment_ref = p.reference
      ) THEN
        INSERT INTO public.internal_event_registrations
          (event_id, user_id, first_name, last_name, other_name, email, physical_address,
           ensemble_arm, choir_part, orchestra_instrument, join_year, has_medical_condition,
           medical_condition_details, membership_status, passport_url, membership_id,
           amount_paid, payment_ref, coupon_code)
        SELECT p.event_id, p.user_id, r.first_name, r.last_name, r.other_name, r.email, r.physical_address,
               r.ensemble_arm, r.choir_part, r.orchestra_instrument, r.join_year, false,
               NULL, r.membership_status, r.passport_url, r.membership_id,
               v_naira, p.reference, v_coupon
        FROM jsonb_populate_record(NULL::public.internal_event_registrations, p.details->'row') r;

      ELSIF p.kind = 'donation' AND NOT EXISTS (
        SELECT 1 FROM public.donations WHERE payment_reference = p.reference
      ) THEN
        INSERT INTO public.donations (donor_name, donor_email, amount, message, payment_reference)
        SELECT r.donor_name, r.donor_email, v_naira, r.message, p.reference
        FROM jsonb_populate_record(NULL::public.donations, p.details->'row') r;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_reason := 'Could not save the record: ' || SQLERRM;
    END;
  END IF;

  IF v_reason IS NOT NULL THEN
    UPDATE public.payments
    SET status = 'needs_review', review_reason = v_reason, updated_at = now()
    WHERE id = p.id;
    PERFORM alert_payment_review(p.reference, v_reason);
    RETURN 'needs_review';
  END IF;

  -- Normally the use was held when checkout started. If that hold had been
  -- released (the customer took over 30 minutes), count it now: they have
  -- already paid this price, so it is honoured even past the limit.
  IF v_coupon IS NOT NULL AND NOT p.coupon_held THEN
    UPDATE public.coupon_codes
    SET usage_count = COALESCE(usage_count, 0) + 1
    WHERE event_id = p.event_id AND code = v_coupon;
  END IF;

  IF (p.details->>'subscribe')::boolean IS TRUE THEN
    BEGIN
      PERFORM upsert_subscriber(p.email, p.name, 'ticket');
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to add subscriber: %', SQLERRM;
    END;
  END IF;

  UPDATE public.payments
  SET status = 'fulfilled', review_reason = NULL, fulfilled_at = now(), updated_at = now(),
      coupon_held = (v_coupon IS NOT NULL)
  WHERE id = p.id;

  RETURN 'fulfilled';
END;
$$;

-- ---------------------------------------------------------------------
-- 6. REFUND — a full refund removes the ticket/registration/donation made
--    by THIS reference only (the payments row keeps the full history).
--    A partial refund leaves everything in place and asks for a decision.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refund_payment(p_reference text, p_refund_kobo bigint DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p        public.payments%ROWTYPE;
  v_coupon text;
  v_reason text;
BEGIN
  SELECT * INTO p FROM public.payments WHERE reference = p_reference FOR UPDATE;

  IF NOT FOUND THEN
    v_reason := 'Refund received for a payment made before this system';
    INSERT INTO public.payments (reference, kind, status, review_reason, amount_kobo, email, gateway_status)
    VALUES (p_reference, 'unknown', 'needs_review', v_reason, COALESCE(p_refund_kobo, 0), 'unknown', 'reversed')
    ON CONFLICT (reference) DO NOTHING;
    PERFORM alert_payment_review(p_reference, v_reason);
    RETURN 'needs_review';
  END IF;

  IF p.status = 'refunded' THEN
    RETURN 'refunded';
  END IF;

  IF p_refund_kobo IS NOT NULL AND p_refund_kobo < COALESCE(p.paid_kobo, p.amount_kobo) THEN
    v_reason := format('Partial refund of NGN %s: decide whether this booking stands', p_refund_kobo / 100.0);
    UPDATE public.payments
    SET status = 'needs_review', review_reason = v_reason, updated_at = now()
    WHERE id = p.id;
    PERFORM alert_payment_review(p.reference, v_reason);
    RETURN 'needs_review';
  END IF;

  v_coupon := NULLIF(p.details->>'coupon_code', '');
  IF p.coupon_held AND v_coupon IS NOT NULL THEN
    UPDATE public.coupon_codes
    SET usage_count = GREATEST(COALESCE(usage_count, 0) - 1, 0)
    WHERE event_id = p.event_id AND code = v_coupon;
  END IF;

  DELETE FROM public.tickets WHERE payment_ref = p.reference;
  DELETE FROM public.internal_event_registrations WHERE payment_ref = p.reference;
  DELETE FROM public.donations WHERE payment_reference = p.reference;

  UPDATE public.payments
  SET status = 'refunded', gateway_status = 'reversed', review_reason = NULL, updated_at = now(),
      coupon_held = false
  WHERE id = p.id;

  RETURN 'refunded';
END;
$$;

-- ---------------------------------------------------------------------
-- 7. COUPONS FOR FREE REGISTRATIONS — atomic, so the last use of a
--    100%-off code cannot be taken twice.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.redeem_coupon(p_event_id uuid, p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.coupon_codes
  SET usage_count = COALESCE(usage_count, 0) + 1
  WHERE event_id = p_event_id AND code = p_code AND is_active
    AND (usage_limit IS NULL OR COALESCE(usage_count, 0) < usage_limit);
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_coupon(p_event_id uuid, p_code text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.coupon_codes
  SET usage_count = GREATEST(COALESCE(usage_count, 0) - 1, 0)
  WHERE event_id = p_event_id AND code = p_code;
$$;

-- ---------------------------------------------------------------------
-- 7b. COUPON HOLDS FOR PAID CHECKOUTS — a use is taken when checkout
--     starts, so a limit of 10 means at most 10 people can be paying with
--     the code. Abandoned checkouts give the use back.
-- ---------------------------------------------------------------------

-- Takes one use for this payment. False when the code is used up or off.
CREATE OR REPLACE FUNCTION public.hold_payment_coupon(p_reference text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.payments%ROWTYPE;
BEGIN
  SELECT * INTO p FROM public.payments WHERE reference = p_reference FOR UPDATE;
  IF NOT FOUND OR p.coupon_held OR NULLIF(p.details->>'coupon_code', '') IS NULL THEN
    RETURN FOUND;
  END IF;

  IF NOT redeem_coupon(p.event_id, p.details->>'coupon_code') THEN
    RETURN false;
  END IF;

  UPDATE public.payments SET coupon_held = true, updated_at = now() WHERE id = p.id;
  RETURN true;
END;
$$;

-- Gives a held use back. Never touches a payment that has been fulfilled.
CREATE OR REPLACE FUNCTION public.release_payment_coupon(p_reference text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.payments
  SET coupon_held = false, updated_at = now()
  WHERE reference = p_reference AND coupon_held AND status <> 'fulfilled';
END;
$$;

-- The count follows coupon_held, whatever changed it: release above, a
-- payment failing, or an admin dismissing it.
CREATE OR REPLACE FUNCTION public.payments_coupon_hold_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('failed', 'dismissed') THEN
    NEW.coupon_held := false;
  END IF;

  IF OLD.coupon_held AND NOT NEW.coupon_held AND NEW.status <> 'refunded'
     AND NULLIF(OLD.details->>'coupon_code', '') IS NOT NULL THEN
    UPDATE public.coupon_codes
    SET usage_count = GREATEST(COALESCE(usage_count, 0) - 1, 0)
    WHERE event_id = OLD.event_id AND code = OLD.details->>'coupon_code';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payments_coupon_hold_sync ON public.payments;
CREATE TRIGGER payments_coupon_hold_sync
  BEFORE UPDATE OF status, coupon_held ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.payments_coupon_hold_sync();

-- Checkouts not paid within 30 minutes give their use back. If one is paid
-- later anyway, fulfill_payment counts the use again.
CREATE OR REPLACE FUNCTION public.release_stale_coupon_holds()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  UPDATE public.payments
  SET coupon_held = false, updated_at = now()
  WHERE coupon_held AND status = 'pending' AND created_at < now() - interval '30 minutes';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- ---------------------------------------------------------------------
-- 8. RECONCILE — safety net for a missed webhook. The database cannot
--    hold the Paystack key's logic, so it just wakes the app every 15
--    minutes (Vercel Hobby cron is daily only; pg_cron is free).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reconcile_payments_tick()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  site_url text := COALESCE(get_secret('site_url'), 'https://beninchoraleandphilharmonic.com');
  secret   text := get_secret('cron_secret');
BEGIN
  -- Needs no Paystack call, so it runs even if the app cannot be reached.
  PERFORM release_stale_coupon_holds();

  IF secret IS NULL OR secret = '' THEN
    RAISE WARNING 'cron_secret not set in vault; payments not reconciled';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.payments
    WHERE status = 'pending' AND created_at < now() - interval '5 minutes'
  ) THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     := rtrim(site_url, '/') || '/api/cron/reconcile-payments',
    headers := jsonb_build_object('Authorization', 'Bearer ' || secret, 'Content-Type', 'application/json'),
    body    := '{}'::jsonb
  );
END;
$$;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'reconcile-payments';
SELECT cron.schedule('reconcile-payments', '*/15 * * * *', $cron$ SELECT public.reconcile_payments_tick(); $cron$);

-- ---------------------------------------------------------------------
-- 9. ACCESS — these are only ever called with the service role.
-- ---------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.alert_payment_review(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fulfill_payment(text, bigint, text, timestamptz, bigint, text, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_payment(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.redeem_coupon(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_coupon(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reconcile_payments_tick() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.hold_payment_coupon(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_payment_coupon(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_stale_coupon_holds() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.payments_coupon_hold_sync() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.hold_payment_coupon(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_payment_coupon(text) TO service_role;

GRANT EXECUTE ON FUNCTION public.alert_payment_review(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.fulfill_payment(text, bigint, text, timestamptz, bigint, text, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_payment(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.redeem_coupon(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_coupon(uuid, text) TO service_role;
