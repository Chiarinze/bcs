# BCS: The Benin Chorale & Philharmonic Platform

The website and operating platform for [The Benin Chorale & Philharmonic](https://www.beninchoraleandphilharmonic.com), a choral and orchestral music society in Benin City, Nigeria. It handles event ticketing and payments, donations, auditions, membership, attendance, publishing and all of the society's email.

**Live:** [beninchoraleandphilharmonic.com](https://www.beninchoraleandphilharmonic.com) · **Case study:** [thearinze.com/projects/bcs](https://thearinze.com/projects/bcs)

Designed, built and maintained by [Chidera Arinze](https://thearinze.com) as the sole engineer.

## At a glance

- 1,000+ tickets sold and 5,000+ registrations processed.
- Used by 100+ members and an admin team of 3–5 people.
- Replaced WhatsApp coordination, Google Forms, paper attendance registers and manual bank-transfer matching.
- Runs entirely on free tiers. The only paid item is the domain.

## Stack

| Layer | Tools |
|---|---|
| Framework | Next.js 15.5 (App Router, Server Components, Route Handlers, Middleware), React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Data and auth | Supabase: PostgreSQL, Auth, Storage, row-level security, `pg_cron`, `pg_net`, Vault |
| Payments | Paystack (tickets and donations) |
| Email | Resend, called from Postgres triggers |
| Inbound email | Cloudflare Email Worker (`cloudflare/inbound-worker`) |
| Rich text | TipTap, server-side HTML sanitising |
| Hosting | Vercel |

## Features

- **Events and ticketing:** free and paid events, ticket categories, coupons, members-only events, Paystack checkout, and attendee lists as PDF and CSV.
- **Donations:** Paystack donations, including anonymous ones, with an admin dashboard.
- **Auditions and recitals:** registration with photo uploads and time slots; slot booking that can't double-book; scoring and reminders.
- **Membership:** sign-up, admin approval, tiers, roles and promotions. Leadership pages are generated from members' roles.
- **Publishing:** members write articles and poetry; posts are reviewed before they're published.
- **Attendance:** executives take the rehearsal register; members see their own history; admins get monthly and yearly reports.
- **Admin CMS:** structured forms for page content, so admins don't touch code.
- **Communications:** a contact inbox with two-way email threads, newsletters, and a log of every email sent.
- **Grants:** a scanner that collects arts-funding opportunities and emails them to admins.

## Architecture

```
app/
  (public)/     Public site: home, about, events, articles, members, donate, contact
  (members)/    Member portal: dashboard, profile, events, attendance, articles
  (admin)/      Admin console: events, tickets, coupons, donations, members, emails …
  api/          Route Handlers: tickets, donations, coupons, uploads, webhooks …
  sitemap.ts    Sitemap generated from the database
  robots.ts     Crawl rules
components/     UI by feature (events, articles, members, admin) plus shared ui/
lib/            Server utilities: Supabase clients, Paystack, auth guards, CSRF,
                rate limiting, sanitising, file-type detection, uploads
db/             SQL for tables, policies, triggers and functions
cloudflare/     Inbound email worker
middleware.ts   Session refresh, CSRF checks and rate limiting
```

### Rendering and caching

| Area | Strategy |
|---|---|
| Public pages | Server Components with ISR: event and article listings revalidate every 60 seconds; other public pages and the sitemap every hour |
| Member and admin pages | Rendered on every request (`dynamic = "force-dynamic"`), behind auth |
| Payments, uploads, webhooks | Route Handlers only; secret keys never reach the browser |
| Images | `next/image`, with blur placeholders on event and article covers |

### Technical SEO

- `generateMetadata` on every public page, each with its own canonical URL (`alternates.canonical`).
- JSON-LD structured data: `PerformingGroup` and `Place` on the home page, `Person` on member and board pages, and `Article` on articles.
- `app/sitemap.ts` builds the sitemap from the database (public events, published articles, member and board profiles) and revalidates hourly.
- `app/robots.ts` blocks admin, member, API, purchase, registration and success paths.
- `noindex` on internal events, purchase success pages and unsubscribe links.

## Payment verification

Ticket verification (`app/api/tickets/verify/route.ts`) never trusts the browser:

1. It looks up the ticket category's real price on the server.
2. It validates the coupon itself: active, within its usage limit, and with a sane discount.
3. It verifies the transaction with Paystack and compares the amount actually charged with the expected amount.
4. It rejects any payment reference that has already been used.
5. It rate-limits the endpoint.

Donations follow the same pattern in `app/api/donations/verify/route.ts`.

## Security

- Row-level security on every table. The anonymous key can't read buyer details, list coupons or insert tickets. Authors can't publish their own articles without review (`db/rls_hardening.sql`).
- CSRF validation on every state-changing API request, and rate limits on public POST endpoints and auth pages (`middleware.ts`).
- All uploads go through one server route. It checks who is uploading, enforces size limits, and verifies each file's type from its actual bytes (`lib/detectImageType.ts`, `lib/detectDocumentType.ts`).
- Admin routes check roles with Supabase Auth (`lib/requireAdmin.ts`); hCaptcha protects public forms.

## Email

The app writes rows; Postgres sends the email. Triggers call Resend through `pg_net`, with the API key stored in Supabase Vault. Every email is logged as queued, and a `pg_cron` job marks each one sent, failed or unknown. Newsletters are queued per subscriber and sent within the free tier's daily limit, leaving room for transactional email. See [EMAIL-SYSTEM.md](./EMAIL-SYSTEM.md).

## Running locally

Requirements: Node.js 18.18 or later, a Supabase project, and a Paystack test account.

```bash
npm install
# create .env.local with the variables below
npm run dev
```

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin access |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`, `PAYSTACK_SECRET_KEY` | Payments (use test keys locally) |
| `NEXT_PUBLIC_HCAPTCHA_SITE_KEY`, `HCAPTCHA_SECRET_KEY` | Form protection |
| `NEXT_PUBLIC_BASE_URL` | Absolute URLs in emails and metadata |
| `CRON_SECRET` | Protects scheduled endpoints |
| `INBOUND_WEBHOOK_SECRET` | Shared secret for the inbound email worker |

Apply the SQL in `db/` to your Supabase project to create the tables, policies, triggers and functions.

## What I'd do next

- Add automated tests: unit tests for payment and coupon logic, and Playwright tests for ticket purchase.
- Move the hand-run SQL scripts to a migration tool.
- Move the remaining older email triggers onto the logged path.
- Add `Event` structured data to event pages.
