-- =====================================================================
-- RLS HARDENING — close policies that let the browser (anon key) read
-- or write data the app only ever touches through API routes using the
-- service role (which bypasses RLS, so nothing here affects the app).
-- Run in: Supabase Dashboard → SQL Editor
-- Idempotent: safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TICKETS — anon could SELECT every buyer's name/email/reference and
--    INSERT rows with any amount_paid, bypassing Paystack.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can read tickets"      ON public.tickets;
DROP POLICY IF EXISTS "Public can purchase tickets"  ON public.tickets;

-- ---------------------------------------------------------------------
-- 2. REGISTRATIONS + DONATIONS — same pattern: inserts go through
--    /api/auditions, /api/events/[slug]/register, /api/donations/verify.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can register for auditions"        ON public.audition_registrations;
DROP POLICY IF EXISTS "Public can register for internal events"  ON public.internal_event_registrations;
DROP POLICY IF EXISTS "Anyone can insert donations"              ON public.donations;

-- Any logged-in member could list all donors. Admin only.
DROP POLICY IF EXISTS "Authenticated users can read donations" ON public.donations;
DROP POLICY IF EXISTS "Admin can read donations"               ON public.donations;
CREATE POLICY "Admin can read donations"
  ON public.donations FOR SELECT
  TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- ---------------------------------------------------------------------
-- 3. COUPON CODES — every code was readable. Validation happens in
--    /api/coupons/validate with the service role.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can read coupons" ON public.coupon_codes;
DROP POLICY IF EXISTS "Admin can read coupons"  ON public.coupon_codes;
CREATE POLICY "Admin can read coupons"
  ON public.coupon_codes FOR SELECT
  TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- ---------------------------------------------------------------------
-- 4. ARTICLES — "Authors can update own drafts" had WITH CHECK (true),
--    so an author could set status = 'published' with their own session.
--    Authors may only touch drafts/rejected pieces and may only move them
--    to pending_review; publishing stays with the admin API.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Authors can update own drafts" ON public.articles;
CREATE POLICY "Authors can update own drafts"
  ON public.articles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = author_id
    AND status IN ('draft', 'rejected')
  )
  WITH CHECK (
    auth.uid() = author_id
    AND status IN ('draft', 'rejected', 'pending_review')
  );

-- ---------------------------------------------------------------------
-- 5. EVENTS.access_code — unused by the app, but exposed by the public
--    read policy. Column-level revoke: SELECT * as anon now fails, which
--    is why the public event pages were switched to the server client.
-- ---------------------------------------------------------------------
REVOKE SELECT (access_code) ON public.events FROM anon, authenticated;

-- ---------------------------------------------------------------------
-- 6. SANITY CHECK — list what is left. Expect no 'public'/'anon' INSERT
--    policies and no SELECT ... USING (true) on tickets/coupons/donations.
-- ---------------------------------------------------------------------
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('tickets', 'coupon_codes', 'donations', 'articles',
                    'audition_registrations', 'internal_event_registrations')
ORDER BY tablename, cmd, policyname;
