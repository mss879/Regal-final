# Regal Victoria Lakeside

Website and admin for [regalvictorialakeside.com](https://regalvictorialakeside.com) — Next.js 16 (App Router),
React 19, Tailwind 4, GSAP, and Supabase for the backend.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

## Environment

Copy `.env.example` to `.env.local` and fill it in (and add the same variables in your host's settings):

| Variable | Where from |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (or the legacy anon key) |
| `SUPABASE_SECRET_KEY` | Secret key (or legacy service_role). **Server only.** |
| `ANALYTICS_SALT` | `openssl rand -hex 32` (secret) |
| `OPENAI_API_KEY` | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) — powers the AI assistant (secret) |
| `OPENAI_MODEL` | Optional — defaults to `gpt-6-luna` |
| `GOOGLE_SITE_VERIFICATION` | Optional — Search Console HTML-tag code |

With the variables empty the public site still builds and runs; `/admin` shows a setup checklist.

## Supabase setup (once)

1. Create a project (Singapore or Mumbai region is closest to Sri Lanka).
2. Apply the migrations in `supabase/migrations` — either `npx supabase link --project-ref <ref>` then
   `npx supabase db push`, or paste each file into the SQL Editor in order.
3. Create a staff account: **Authentication → Users → Add user** (tick *Auto Confirm User*), then in the SQL Editor:
   ```sql
   insert into public.admin_users (user_id, email)
   select id, email from auth.users where email = 'you@example.com';
   ```
4. **Authentication → Sign In / Providers**: turn off *Allow new users to sign up*.
   **Authentication → URL Configuration**: Site URL `https://regalvictorialakeside.com`.
5. Run **Advisors → Security** and check it's clean.
6. Before launch, clear test data: `delete from public.page_views; delete from public.chat_sessions;`

`npm run db:test` applies the migrations to a throwaway local Postgres (Homebrew `postgresql@16`, no Docker)
and runs the access-control and workflow assertions in `scripts/db-test/tests.sql`.

## Admin (`/admin`)

- **Dashboard** — overview cards for every feature, viewings calendar, latest activity, cookieless traffic.
- **Enquiries** — every contact-form submission; *Move to CRM* creates a lead in **New Leads**.
- **CRM** — kanban pipeline. Stages and leads can be added, edited, reordered and deleted; the built-in
  **New Leads** stage can't be renamed or deleted (enforced in the database).
- **Viewings** — month calendar. Visitors who choose “Arranging a site visit” can suggest a time; it shows as
  *Requested* until confirmed.
- **AI chats** — every conversation with the website's AI assistant, saved message by message. Open a chat to
  watch it live, switch **AI replies off** and answer the visitor yourself (replying switches the AI off
  automatically; switch it back on when you're done). Badges show *Live*, *AI off* and *Needs reply*.

## AI assistant (bottom-right chat)

Built like our other client agents: Vercel AI SDK v6 (`generateText`, `tool`, `stopWhen: stepCountIs(4)`) with
OpenAI `gpt-6-luna` (reasoning off for speed and tool calling), markdown replies, and every message logged to Supabase.

- `src/lib/chat/knowledge.ts` — the agent's instructions. Facts are built from `src/lib/site.ts`, `lots.ts` and
  `guides.ts`, so villa specs and availability always match the website. Edit the *Rules* / *Style* text to
  change behaviour.
- `src/app/api/chat/route.ts` — saves the visitor's message, calls the model, saves the reply. Its
  `saveEnquiry` tool stores name + email/phone, villa and an optional viewing time as an **enquiry** (and a
  *Requested* viewing) — the same inbox and calendar as the contact form. `GET` is polled by the widget for
  staff replies.
- `src/components/chat/` — the widget. Only the small launcher loads with the page; the panel is fetched on
  first hover/click.
- Limits (to protect the OpenAI bill): 20 messages per 10 minutes per visitor, 80 per chat per day, 6 saved
  enquiries per hour per visitor. With no `OPENAI_API_KEY` the chat politely gives the phone number and email.

New admin features: add a route under `src/app/admin/(dashboard)/` and an entry in `src/lib/admin/features.ts`
(that drives the sidebar and the dashboard cards). Every admin page and Server Action calls `requireAdmin()`.

## How data is protected

- Row-level security on every table; the anon key has **no** table access. The website writes only through
  server-side code using narrow database functions (`create_website_enquiry`, `check_rate_limit`).
- Staff sessions use httpOnly cookies scoped to `/admin`; the browser never talks to Supabase directly.
- Enquiry form: honeypot, time trap, per-visitor rate limit (5 per 15 min), idempotent submissions.
- Analytics: no cookies, no IP storage (daily-rotating salted hash), GPC/Do Not Track honoured,
  bots/localhost/staff browsers ignored. Retention is automatic via `pg_cron` (see the workflows migration).
- Security headers and CSP in `next.config.ts`; `/admin` and `/api` are `noindex` and disallowed in robots.

## SEO

- Per-page metadata via `pageMetadata()` (`src/lib/seo.ts`) — canonical, Open Graph, Twitter card.
- Branded share images: `opengraph-image.tsx` in each route folder, rendered by `src/lib/og/render.tsx`.
- JSON-LD (`src/lib/schema.ts`): Organization, WebSite, GatedResidenceCommunity, villa listings, articles, FAQs, breadcrumbs.
- `sitemap.xml` and `robots.txt` are generated from `src/lib/routes.ts`. Submit the sitemap in Google Search Console.
- Pillar guides live in `src/lib/guides.ts`; policies under `src/app/(site)/{privacy-policy,terms-of-use,cookie-policy}`.

**Before launch:** replace the placeholder Instagram/Facebook URLs in `src/lib/site.ts` (`SOCIAL`) and set
`placeholder: false`; have the privacy policy, terms and the buying guide's legal points reviewed by a lawyer.

## Assets

- `npm run icons` — favicons, app icons and share-image artwork from the brand emblem.
- `npm run assets` — web images from the original catalogues in `assets-source/` (kept out of `public/`, never deployed).
