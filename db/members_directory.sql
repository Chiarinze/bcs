-- =====================================================================
-- PUBLIC MEMBERS DIRECTORY — visibility flags, opt-out requests, emails
-- Run AFTER site_content.sql (needs profiles.bio / profiles.slug).
-- Idempotent: safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. COLUMNS
--    directory_hidden      → member is excluded from /members
--    directory_request     → 'hide' | 'show' while a request awaits admin
-- ---------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS directory_hidden       boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS directory_request      text CHECK (directory_request IN ('hide', 'show'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS directory_request_at   timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS directory_request_note text;

CREATE INDEX IF NOT EXISTS profiles_directory_request_idx
  ON public.profiles (directory_request_at)
  WHERE directory_request IS NOT NULL;

-- ---------------------------------------------------------------------
-- 2. EMAIL: member submits a request → notify every admin
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.send_directory_request_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  site_url     text := COALESCE(get_secret('site_url'), 'https://beninchoraleandphilharmonic.com');
  admin_record record;
  member_name  text;
  action_label text;
  inner_html   text;
  full_html    text;
BEGIN
  -- Only when a new request is raised (null → 'hide'/'show').
  IF NEW.directory_request IS NULL OR OLD.directory_request IS NOT DISTINCT FROM NEW.directory_request THEN
    RETURN NEW;
  END IF;

  member_name  := COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '');
  action_label := CASE WHEN NEW.directory_request = 'hide'
                       THEN 'be removed from' ELSE 'be shown again in' END;

  inner_html :=
       '<div style="background: #f9f9f7; border-radius: 12px; padding: 32px; border: 1px solid #e5e5e5;">'
    || '<h2 style="color: #1a5632; font-size: 20px; margin: 0 0 16px;">Directory visibility request</h2>'
    || '<p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">'
    || '<strong>' || member_name || '</strong> has asked to ' || action_label || ' the public members directory.</p>'
    || CASE WHEN COALESCE(NEW.directory_request_note, '') <> ''
         THEN '<div style="background: #ffffff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 14px 18px; margin: 0 0 16px;">'
           || '<p style="color: #6b7280; font-size: 12px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 1px;">Reason given</p>'
           || '<p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0;">' || NEW.directory_request_note || '</p>'
           || '</div>'
         ELSE '' END
    || '<p style="margin: 24px 0 0;">'
    || '<a href="' || site_url || '/admin/members" style="background: #1a5632; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 500; display: inline-block;">Review in admin</a>'
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
    'directory_request',
    admin_record.email,
    'Directory request from ' || member_name,
    full_html,
    'The Benin Chorale & Philharmonic <noreply@beninchoraleandphilharmonic.com>'
  );
  END LOOP;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Directory request email failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_directory_request ON public.profiles;
CREATE TRIGGER on_directory_request
  AFTER UPDATE OF directory_request ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.send_directory_request_email();

-- ---------------------------------------------------------------------
-- 3. EMAIL: admin resolves the request → tell the member
--    Fires when directory_request goes from non-null → null.
--    Approved = directory_hidden now matches what was requested.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.send_directory_decision_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  site_url   text := COALESCE(get_secret('site_url'), 'https://beninchoraleandphilharmonic.com');
  recipient  text;
  approved   boolean;
  wanted     text;
  inner_html text;
  full_html  text;
BEGIN
  IF OLD.directory_request IS NULL OR NEW.directory_request IS NOT NULL THEN
    RETURN NEW;
  END IF;

  recipient := COALESCE(NEW.email, (SELECT email FROM auth.users WHERE id = NEW.id));
  IF recipient IS NULL OR recipient = '' THEN
    RETURN NEW;
  END IF;

  wanted   := OLD.directory_request;
  approved := (wanted = 'hide' AND NEW.directory_hidden) OR (wanted = 'show' AND NOT NEW.directory_hidden);

  inner_html :=
       '<div style="background: #f9f9f7; border-radius: 12px; padding: 32px; border: 1px solid #e5e5e5;">'
    || '<h2 style="color: ' || CASE WHEN approved THEN '#1a5632' ELSE '#b91c1c' END || '; font-size: 20px; margin: 0 0 16px;">'
    || CASE WHEN approved THEN 'Your directory request was approved' ELSE 'Your directory request was declined' END
    || '</h2>'
    || '<p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">'
    || 'Hi ' || COALESCE(NEW.first_name, 'there') || ',</p>'
    || '<p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">'
    || CASE
         WHEN approved AND wanted = 'hide' THEN 'Your profile is no longer shown in the public members directory.'
         WHEN approved AND wanted = 'show' THEN 'Your profile is now visible again in the public members directory.'
         WHEN wanted = 'hide' THEN 'Your request to be removed from the public members directory was not approved. Your profile remains visible. Please speak to an administrator if you have concerns.'
         ELSE 'Your request to be shown in the public members directory was not approved.'
       END
    || '</p>'
    || '<p style="margin: 24px 0 0;">'
    || '<a href="' || site_url || '/dashboard/profile" style="background: #1a5632; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 500; display: inline-block;">View your profile</a>'
    || '</p></div>';

  full_html := build_email_html(inner_html);

  PERFORM send_email(
    'directory_decision',
    recipient,
    CASE WHEN approved THEN 'Directory request approved' ELSE 'Directory request declined' END,
    full_html,
    'The Benin Chorale & Philharmonic <noreply@beninchoraleandphilharmonic.com>'
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Directory decision email failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_directory_decision ON public.profiles;
CREATE TRIGGER on_directory_decision
  AFTER UPDATE OF directory_request ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.send_directory_decision_email();
