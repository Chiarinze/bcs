-- =====================================================================
-- COMPULSORY RECITAL — schema, RLS, helper functions
-- Run in: Supabase Dashboard → SQL Editor
-- Idempotent: safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. ENUMS
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recital_query_status') THEN
    CREATE TYPE recital_query_status AS ENUM ('pending', 'booked', 'cleared');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recital_booking_status') THEN
    CREATE TYPE recital_booking_status AS ENUM ('scheduled', 'passed', 'failed');
  END IF;
END$$;

-- ---------------------------------------------------------------------
-- 2. CONFIG TABLE (cutoff date, pass mark, max slots) — single row
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recital_config (
  id              smallint PRIMARY KEY DEFAULT 1,
  cutoff_date     date     NOT NULL DEFAULT DATE '2026-08-28',
  pass_mark       smallint NOT NULL DEFAULT 65,
  max_per_day     smallint NOT NULL DEFAULT 6,
  CONSTRAINT recital_config_singleton CHECK (id = 1)
);

INSERT INTO public.recital_config (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 3. QUERIES TABLE — one row per (member, query issuance)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recital_queries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  issued_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  issued_at   timestamptz NOT NULL DEFAULT now(),
  status      recital_query_status NOT NULL DEFAULT 'pending',
  cleared_at  timestamptz
);

-- One open query per member at a time
CREATE UNIQUE INDEX IF NOT EXISTS recital_queries_one_open_per_member
  ON public.recital_queries (profile_id)
  WHERE status <> 'cleared';

CREATE INDEX IF NOT EXISTS recital_queries_status_idx
  ON public.recital_queries (status);

-- ---------------------------------------------------------------------
-- 4. BOOKINGS TABLE — one row per attempt
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recital_bookings (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id                 uuid NOT NULL REFERENCES public.recital_queries(id) ON DELETE CASCADE,
  profile_id               uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recital_date             date NOT NULL,
  slot_number              smallint NOT NULL CHECK (slot_number BETWEEN 1 AND 6),
  chosen_piece             text NOT NULL,
  status                   recital_booking_status NOT NULL DEFAULT 'scheduled',

  -- Rubric (each 0–20)
  score_diction            smallint CHECK (score_diction BETWEEN 0 AND 20),
  score_costume            smallint CHECK (score_costume BETWEEN 0 AND 20),
  score_vocal_production   smallint CHECK (score_vocal_production BETWEEN 0 AND 20),
  score_accompaniment      smallint CHECK (score_accompaniment BETWEEN 0 AND 20),
  score_expression         smallint CHECK (score_expression BETWEEN 0 AND 20),

  total_score smallint GENERATED ALWAYS AS (
    COALESCE(score_diction, 0)
    + COALESCE(score_costume, 0)
    + COALESCE(score_vocal_production, 0)
    + COALESCE(score_accompaniment, 0)
    + COALESCE(score_expression, 0)
  ) STORED,

  scored_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  scored_at    timestamptz,
  scorer_notes text,

  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Each slot on each Friday taken by at most one booking
CREATE UNIQUE INDEX IF NOT EXISTS recital_bookings_unique_slot
  ON public.recital_bookings (recital_date, slot_number);

-- A query can have at most one scheduled booking at a time (must be scored before rebooking)
CREATE UNIQUE INDEX IF NOT EXISTS recital_bookings_one_scheduled_per_query
  ON public.recital_bookings (query_id)
  WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS recital_bookings_profile_idx
  ON public.recital_bookings (profile_id);
CREATE INDEX IF NOT EXISTS recital_bookings_date_idx
  ON public.recital_bookings (recital_date);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.recital_bookings_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS recital_bookings_touch_updated_at ON public.recital_bookings;
CREATE TRIGGER recital_bookings_touch_updated_at
  BEFORE UPDATE ON public.recital_bookings
  FOR EACH ROW EXECUTE FUNCTION public.recital_bookings_touch_updated_at();

-- ---------------------------------------------------------------------
-- 5. HELPER FUNCTION: book_recital_slot
--     Picks smallest available slot 1..max_per_day for the given Friday,
--     in a SERIALIZABLE-safe way (advisory lock on the date),
--     and inserts the booking. Returns the new booking id.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.book_recital_slot(
  p_query_id   uuid,
  p_profile_id uuid,
  p_date       date,
  p_piece      text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfg       public.recital_config%ROWTYPE;
  v_query     public.recital_queries%ROWTYPE;
  v_slot      smallint;
  v_booking_id uuid;
BEGIN
  SELECT * INTO v_cfg FROM public.recital_config WHERE id = 1;

  -- Validate piece
  IF p_piece IS NULL OR length(trim(p_piece)) = 0 THEN
    RAISE EXCEPTION 'A chosen piece is required'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Validate date: must be a Friday, not in the past, not past cutoff
  IF EXTRACT(DOW FROM p_date) <> 5 THEN
    RAISE EXCEPTION 'Recital date must be a Friday'
      USING ERRCODE = 'check_violation';
  END IF;
  IF p_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Recital date cannot be in the past'
      USING ERRCODE = 'check_violation';
  END IF;
  IF p_date > v_cfg.cutoff_date THEN
    RAISE EXCEPTION 'Recital date is past the cutoff (%)' , v_cfg.cutoff_date
      USING ERRCODE = 'check_violation';
  END IF;

  -- Validate query belongs to the profile and is open
  SELECT * INTO v_query FROM public.recital_queries WHERE id = p_query_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recital query not found' USING ERRCODE = 'foreign_key_violation';
  END IF;
  IF v_query.profile_id <> p_profile_id THEN
    RAISE EXCEPTION 'Query does not belong to this member' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF v_query.status = 'cleared' THEN
    RAISE EXCEPTION 'Query is already cleared' USING ERRCODE = 'check_violation';
  END IF;

  -- Member cannot have a still-scheduled booking on this query
  IF EXISTS (
    SELECT 1 FROM public.recital_bookings
    WHERE query_id = p_query_id AND status = 'scheduled'
  ) THEN
    RAISE EXCEPTION 'You already have a scheduled booking; cancel or wait for scoring first'
      USING ERRCODE = 'unique_violation';
  END IF;

  -- Serialize all booking attempts for this date so slot assignment is race-safe
  PERFORM pg_advisory_xact_lock(hashtext('recital_booking_' || p_date::text));

  -- Find smallest free slot
  SELECT s INTO v_slot
  FROM generate_series(1, v_cfg.max_per_day) s
  WHERE NOT EXISTS (
    SELECT 1 FROM public.recital_bookings b
    WHERE b.recital_date = p_date AND b.slot_number = s
  )
  ORDER BY s
  LIMIT 1;

  IF v_slot IS NULL THEN
    RAISE EXCEPTION 'All % slots on % are full', v_cfg.max_per_day, p_date
      USING ERRCODE = 'unique_violation';
  END IF;

  INSERT INTO public.recital_bookings (
    query_id, profile_id, recital_date, slot_number, chosen_piece
  ) VALUES (
    p_query_id, p_profile_id, p_date, v_slot, trim(p_piece)
  )
  RETURNING id INTO v_booking_id;

  -- Move the query into the 'booked' state if it was pending
  UPDATE public.recital_queries
  SET status = 'booked'
  WHERE id = p_query_id AND status = 'pending';

  RETURN v_booking_id;
END;
$$;

REVOKE ALL ON FUNCTION public.book_recital_slot(uuid, uuid, date, text) FROM public;
GRANT EXECUTE ON FUNCTION public.book_recital_slot(uuid, uuid, date, text) TO service_role;

-- ---------------------------------------------------------------------
-- 6. HELPER FUNCTION: score_recital_booking
--     Admin records rubric scores; total_score is computed; status flips
--     to passed/failed; if passed, parent query is cleared.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.score_recital_booking(
  p_booking_id            uuid,
  p_scorer_id             uuid,
  p_score_diction         smallint,
  p_score_costume         smallint,
  p_score_vocal_production smallint,
  p_score_accompaniment   smallint,
  p_score_expression      smallint,
  p_notes                 text
)
RETURNS public.recital_bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfg     public.recital_config%ROWTYPE;
  v_total   smallint;
  v_status  recital_booking_status;
  v_row     public.recital_bookings%ROWTYPE;
BEGIN
  SELECT * INTO v_cfg FROM public.recital_config WHERE id = 1;

  v_total := COALESCE(p_score_diction,0)
           + COALESCE(p_score_costume,0)
           + COALESCE(p_score_vocal_production,0)
           + COALESCE(p_score_accompaniment,0)
           + COALESCE(p_score_expression,0);

  v_status := CASE WHEN v_total >= v_cfg.pass_mark THEN 'passed'::recital_booking_status
                   ELSE 'failed'::recital_booking_status END;

  UPDATE public.recital_bookings
  SET score_diction          = p_score_diction,
      score_costume          = p_score_costume,
      score_vocal_production = p_score_vocal_production,
      score_accompaniment    = p_score_accompaniment,
      score_expression       = p_score_expression,
      scorer_notes           = p_notes,
      scored_by              = p_scorer_id,
      scored_at              = now(),
      status                 = v_status
  WHERE id = p_booking_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF v_status = 'passed' THEN
    UPDATE public.recital_queries
    SET status = 'cleared', cleared_at = now()
    WHERE id = v_row.query_id;
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.score_recital_booking(uuid, uuid, smallint, smallint, smallint, smallint, smallint, text) FROM public;
GRANT EXECUTE ON FUNCTION public.score_recital_booking(uuid, uuid, smallint, smallint, smallint, smallint, smallint, text) TO service_role;

-- ---------------------------------------------------------------------
-- 7. ROW-LEVEL SECURITY
--     Triggers and API routes use the service role, which bypasses RLS.
--     We still enable RLS so that any direct client (e.g. supabase-js with
--     anon key) cannot poke around.
-- ---------------------------------------------------------------------
ALTER TABLE public.recital_config   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recital_queries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recital_bookings ENABLE ROW LEVEL SECURITY;

-- Members may read their own queries and bookings (in case any client-side
-- code wants to subscribe / select directly).
DROP POLICY IF EXISTS "members read own queries" ON public.recital_queries;
CREATE POLICY "members read own queries"
  ON public.recital_queries
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "members read own bookings" ON public.recital_bookings;
CREATE POLICY "members read own bookings"
  ON public.recital_bookings
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "everyone reads config" ON public.recital_config;
CREATE POLICY "everyone reads config"
  ON public.recital_config
  FOR SELECT TO authenticated
  USING (true);

-- Admins (role = 'admin' in profiles) may read everything.
DROP POLICY IF EXISTS "admins read queries" ON public.recital_queries;
CREATE POLICY "admins read queries"
  ON public.recital_queries
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "admins read bookings" ON public.recital_bookings;
CREATE POLICY "admins read bookings"
  ON public.recital_bookings
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- No INSERT/UPDATE/DELETE policies: all mutations go through the API
-- with the service-role key (which bypasses RLS).
