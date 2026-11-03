# Live accounts and signup data

The app has no seeded or fallback users, organizations, or signups. It requires Supabase Auth and database tables before users can interact.

1. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your Supabase project.
2. Apply `supabase/migrations/202611030001_live_accounts_and_signups.sql` to that project (for example, with the Supabase CLI or SQL editor).
3. Enable email confirmation in Supabase Auth for verified email accounts. Configure CAPTCHA/rate limiting in Supabase before opening public registration to reduce automated signups.

Without the Supabase credentials the app fails closed and displays a setup notice. Signup counts are queried from actual `daily_signups` records; the database function enforces one signup per authenticated user per organization/date and the 15-person cap transactionally.
