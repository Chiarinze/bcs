-- =====================================================================
-- SITE CONTENT — admin-managed About/Contact copy, performances,
-- leadership bios and ordering.
-- Run in: Supabase Dashboard → SQL Editor
-- Idempotent: safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. SITE CONTENT — one JSON document per page section
--    Keys used by the app: 'about', 'contact'
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_content (
  key         text PRIMARY KEY,
  value       jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- Public pages read it; all writes go through the admin API (service role).
DROP POLICY IF EXISTS "public reads site content" ON public.site_content;
CREATE POLICY "public reads site content"
  ON public.site_content FOR SELECT
  TO anon, authenticated
  USING (true);

-- ---------------------------------------------------------------------
-- 2. PERFORMANCES — past performances gallery
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.performances (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title            text NOT NULL,
  performed_on     date NOT NULL,
  location         text,
  image_url        text NOT NULL,
  image_blur_data  text,
  link             text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS performances_performed_on_idx
  ON public.performances (performed_on DESC);

ALTER TABLE public.performances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public reads performances" ON public.performances;
CREATE POLICY "public reads performances"
  ON public.performances FOR SELECT
  TO anon, authenticated
  USING (true);

-- Storage bucket for performance images (public read; uploads only via
-- the admin API using the service role).
INSERT INTO storage.buckets (id, name, public)
VALUES ('performance-images', 'performance-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "public reads performance images" ON storage.objects;
CREATE POLICY "public reads performance images"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'performance-images');

-- ---------------------------------------------------------------------
-- 3. PROFILES — bio + public slug (used by leadership and directory pages)
-- ---------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio  text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS slug text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_slug_key
  ON public.profiles (slug) WHERE slug IS NOT NULL;

-- Generates a URL-safe slug from the member's name, suffixing -2, -3 …
-- when another profile already owns it.
CREATE OR REPLACE FUNCTION public.set_profile_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_slug text;
  candidate text;
  n         int := 1;
BEGIN
  -- Only (re)generate when there is no slug yet and we have a name.
  IF NEW.slug IS NOT NULL AND NEW.slug <> '' THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.first_name, '') = '' AND COALESCE(NEW.last_name, '') = '' THEN
    RETURN NEW;
  END IF;

  base_slug := lower(trim(both '-' FROM regexp_replace(
    COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.other_name, '') || ' ' || COALESCE(NEW.last_name, ''),
    '[^a-zA-Z0-9]+', '-', 'g')));

  IF base_slug = '' THEN
    RETURN NEW;
  END IF;

  candidate := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE slug = candidate AND id <> NEW.id) LOOP
    n := n + 1;
    candidate := base_slug || '-' || n;
  END LOOP;

  NEW.slug := candidate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_set_slug ON public.profiles;
CREATE TRIGGER on_profile_set_slug
  BEFORE INSERT OR UPDATE OF first_name, last_name, other_name, slug ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_profile_slug();

-- Backfill existing members (the trigger fills in the slug on update).
UPDATE public.profiles SET slug = NULL WHERE slug IS NULL;

-- ---------------------------------------------------------------------
-- 4. MEMBER ROLES — display order on the About page
-- ---------------------------------------------------------------------
ALTER TABLE public.member_roles ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0;

-- Public pages need to read roles + the assignee's public fields.
ALTER TABLE public.member_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public reads member roles" ON public.member_roles;
CREATE POLICY "public reads member roles"
  ON public.member_roles FOR SELECT
  TO anon, authenticated
  USING (true);

-- ---------------------------------------------------------------------
-- 5. SEED — current hard-coded copy, so nothing changes visually
--    until an admin edits it. Skipped if the key already exists.
-- ---------------------------------------------------------------------
INSERT INTO public.site_content (key, value) VALUES ('about', $json$
{
  "tagline": "The Benin Chorale and Philharmonic Nigeria — promoting musical excellence, education, and cultural preservation through choral and orchestral performances.",
  "home_intro": "The Benin Chorale and Philharmonic Nigeria is a premier musical ensemble in Benin City dedicated to advancing choral and orchestral music while preserving and innovating within Nigeria's traditions. Comprised of over 70 professionals from diverse fields, the group works to inspire and empower young musicians, elevating them globally and discouraging them from social vices.",
  "intro": [
    "The Benin Chorale and Philharmonic Nigeria is a premier musical ensemble dedicated to the promotion, performance, and advancement of choral and orchestral music in Nigeria. Based in Benin City, we provide a platform for talented musicians to showcase their artistry while preserving and innovating within Nigeria’s rich musical traditions.",
    "A group of artists from various musical and cultural backgrounds form the Benin Chorale & Philharmonic with the goal of inspiring and empowering young musicians — both established and aspiring — by elevating them to a global audience and steering them away from social vices. Our 70+ members come from diverse professional backgrounds, including medicine, education, engineering, technology, finance, law, and the arts.",
    "Since our inception in 2012, we have presented over 16 concerts — both free and ticketed — to audiences of more than 2,000 people in person and online."
  ],
  "mission": "We cultivate a vibrant musical culture through performances, education, and community engagement — inspiring audiences, nurturing talent, and contributing to the global appreciation of African music.",
  "vision": "To be a leading choral and orchestral ensemble in Nigeria and beyond — recognized for artistic excellence, musical innovation, and cultural preservation.",
  "what_we_do": [
    { "title": "Choral & Orchestral Performances", "description": "We present diverse programs including classical masterpieces, African art music, contemporary works, and indigenous Nigerian pieces." },
    { "title": "Music Education & Training", "description": "We offer training for singers, instrumentalists, and conductors, fostering the next generation of skilled musicians." },
    { "title": "Community Engagement", "description": "We reach diverse audiences through outreach programs, workshops, and cultural collaborations." },
    { "title": "Annual Retreat & Special Events", "description": "We host annual retreats and special concerts for musical development and artistic growth." },
    { "title": "Cultural Exchange & Diversity", "description": "We foster cross-cultural harmony by presenting works from diverse traditions, with a focus on African music." }
  ],
  "repertoire_intro": "We perform a range of music — both sacred and secular — including:",
  "repertoire": ["Classical", "Pop", "Jazz", "Soul", "Folk", "African Traditional"],
  "services": "We improve the quality of music in our community, create opportunities for collaboration, and contribute positively to society. We’re always open to partnering with like-minded organizations to advance our goals.",
  "join_us": "We welcome singers, instrumentalists, and music enthusiasts who share our passion. Whether you’re a seasoned musician or an aspiring artist, there’s a place for you here.",
  "arms": ["The Chorale", "The Orchestra", "The Band"],
  "management_units": ["The Directorate of Training and Research", "The Directorate of Investment", "Digital Consult", "Part Leaders"]
}
$json$::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.site_content (key, value) VALUES ('contact', $json$
{
  "tagline": "We’d love to hear from you. Whether for bookings, collaborations, or general inquiries — reach out and let’s make music together.",
  "phone": "+2348078742682",
  "email": "info@beninchoraleandphilharmonic.com",
  "facebook": "https://web.facebook.com/BcsNig/",
  "instagram": "https://www.instagram.com/the_benin_chorale_society/",
  "description": "We perform as a chorale, orchestra, band, and theatre group at various events throughout the year. For bookings or more information on our performances and services, contact us via any of the platforms above.",
  "digital_services_intro": "In addition to music, we offer creative digital services through our in-house BCS Digital Consult team:",
  "digital_services": ["Social Media Management", "Graphics Design", "Video Editing", "Software / Website Development"]
}
$json$::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Performances are seeded by `node scripts/seed-performances.mjs`, which
-- also uploads the images from assets/images to the bucket.
