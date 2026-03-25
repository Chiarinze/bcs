# Email System Documentation

## Overview

All emails in this application are sent **directly from Supabase's database infrastructure** using PostgreSQL triggers and the `pg_net` extension. The application code (Next.js) does **not** send any emails — it only updates the database, and the database triggers handle email delivery automatically.

## Why We Changed

Previously, emails were sent from the Next.js API routes using the `resend` npm package. This approach had a critical reliability problem:

- When the server (local or deployed) had a slow or unstable internet connection, the HTTP call to Resend's API would time out and the email would silently fail.
- Even with retry logic (3 attempts with exponential backoff), emails still failed on unreliable connections.
- The email sending was "fire-and-forget" — if it failed, there was no recovery mechanism.

**The solution:** Move email sending to Supabase's infrastructure. Supabase servers have fast, reliable internet connections. By using PostgreSQL triggers with `pg_net`, the database itself makes the HTTP call to Resend's API whenever a relevant row is inserted or updated. This means:

1. Your local/server internet speed doesn't matter.
2. Emails are guaranteed to be attempted whenever the database change occurs.
3. No email-related code needs to exist in the Next.js codebase.

## Architecture

```
User Action (e.g., Admin approves member)
    ↓
Next.js API Route updates the `profiles` table
    ↓
PostgreSQL AFTER UPDATE trigger fires
    ↓
Trigger function reads Resend API key from Supabase Vault
    ↓
pg_net makes HTTP POST to https://api.resend.com/emails
    ↓
Member receives email
```

## Components

### 1. Supabase Vault (Secret Storage)

API keys and configuration are stored in Supabase Vault — not in `.env.local` or application code.

| Secret Name      | Purpose                                    |
|------------------|--------------------------------------------|
| `resend_api_key` | Resend API key for sending emails           |
| `site_url`       | Base URL of the website (used in email links) |
| `admin_email`    | Admin email address (for grant notifications) |

**To view or update secrets:** Go to Supabase Dashboard → SQL Editor and run:

```sql
-- View all secrets (names only, not values)
SELECT name FROM vault.decrypted_secrets;

-- Update a secret (e.g., rotating the Resend API key)
-- First delete the old one, then create a new one:
DELETE FROM vault.secrets WHERE name = 'resend_api_key';
SELECT vault.create_secret('new_api_key_here', 'resend_api_key');
```

### 2. Helper Functions

#### `get_secret(secret_name text)`
Reads a decrypted secret from Supabase Vault. Used by all trigger functions to retrieve API keys and configuration.

#### `build_email_html(inner_content text)`
Wraps email body content with the standard BCS email template (logo, header, footer, copyright). All email trigger functions use this to maintain consistent branding.

### 3. Database Triggers

#### Trigger: `on_member_verified`
- **Table:** `profiles`
- **Event:** `AFTER UPDATE`
- **Function:** `send_approval_email()`
- **Fires when:** `is_verified` changes from `false` to `true`
- **Email content:** Welcome message, membership status (Full Member or Probationary), membership ID (if full member), login link
- **Recipient:** The member's email address

#### Trigger: `on_member_promoted`
- **Table:** `profiles`
- **Event:** `AFTER UPDATE`
- **Function:** `send_promotion_email()`
- **Fires when:** `membership_status` changes from `probationary` to `full_member` AND `is_verified` is already `true` (so it doesn't conflict with the approval trigger)
- **Email content:** Congratulations message, membership ID, dashboard link
- **Recipient:** The member's email address

#### Trigger: `on_grant_created`
- **Table:** `grant_opportunities`
- **Event:** `AFTER INSERT`
- **Function:** `send_grant_notification_email()`
- **Fires when:** A new grant opportunity is inserted
- **Email content:** Grant title, link to admin grants page
- **Recipient:** Admin email (from vault)

## How to Add a New Email

If you need to send a new type of email, follow this pattern:

### Step 1: Create the trigger function

```sql
CREATE OR REPLACE FUNCTION send_your_new_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  resend_key text := get_secret('resend_api_key');
  site_url text := COALESCE(get_secret('site_url'), 'https://beninchoraleandphilharmonic.com');
  inner_html text;
  full_html text;
BEGIN
  -- Add your conditions here (when should this email fire?)
  -- Example: only fire when a specific column changes
  IF OLD.some_column = NEW.some_column THEN
    RETURN NEW;  -- No change, skip email
  END IF;

  IF resend_key IS NULL OR resend_key = '' THEN
    RAISE WARNING 'RESEND_API_KEY not set in vault';
    RETURN NEW;
  END IF;

  -- Build your email body
  inner_html := '<div style="background: #f9f9f7; border-radius: 12px; padding: 32px; border: 1px solid #e5e5e5;">'
    || '<h2 style="color: #1a5632; font-size: 20px; margin: 0 0 16px;">Your heading here</h2>'
    || '<p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">'
    || 'Your message here. You can use ' || NEW.some_column || ' to include data from the row.</p>'
    || '</div>';

  -- Wrap with standard BCS template (logo, footer)
  full_html := build_email_html(inner_html);

  -- Send via Resend API
  PERFORM net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || resend_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'from', 'The Benin Chorale & Philharmonic <noreply@beninchoraleandphilharmonic.com>',
      'to', NEW.email,  -- or get_secret('admin_email') for admin notifications
      'subject', 'Your Email Subject',
      'html', full_html
    )
  );

  RETURN NEW;
END;
$$;
```

### Step 2: Create the trigger

```sql
CREATE TRIGGER on_your_event
  AFTER INSERT OR UPDATE ON public.your_table
  FOR EACH ROW
  EXECUTE FUNCTION send_your_new_email();
```

### Step 3: Test

Update or insert a row in the relevant table and check that the email arrives.

## Important Notes

- **No email code in Next.js:** The `resend` npm package has been removed. The `lib/email.ts` file no longer exists. Do not add email sending logic to API routes.
- **Sender address:** All emails are sent from `noreply@beninchoraleandphilharmonic.com`. This domain is verified in Resend.
- **Trigger conditions matter:** Always add guards at the top of trigger functions to prevent sending duplicate or unnecessary emails. Check that the relevant columns actually changed (compare `OLD` vs `NEW`).
- **Non-blocking:** If the Resend API call fails (e.g., invalid email address), the database operation still succeeds. The trigger does not block the transaction.
- **Debugging:** Check Supabase Dashboard → Logs → Postgres Logs for any `RAISE WARNING` messages from trigger functions. You can also check Resend's dashboard for delivery status.
- **pg_net extension:** This is enabled via `CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;`. It allows PostgreSQL to make outbound HTTP requests.

## Email Styling Reference

All emails use this consistent styling:
- **Font:** Georgia, Times New Roman (serif)
- **Primary color:** `#1a5632` (BCS green)
- **Background:** `#f9f9f7`
- **Border:** `1px solid #e5e5e5`
- **Button style:** Green background (`#1a5632`), white text, 8px border radius
- **Logo:** Loaded from `{site_url}/icon.jpeg`, displayed as 80x80 circle
