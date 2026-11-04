# Live accounts and signup data

The app has no seeded or fallback users, organizations, or signups. It requires Supabase Auth and database tables before users can interact.

1. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your Supabase project.
2. Apply **all** SQL migrations in `supabase/migrations/` to the Supabase project, in filename order. With the Supabase CLI linked to the project, run `supabase db push` from the repository root. Do not apply only `202611030001_live_accounts_and_signups.sql`: the projects, chat, join RPC, and later repair migration are separate migrations.
3. Enable email confirmation in Supabase Auth for verified email accounts. Configure CAPTCHA/rate limiting in Supabase before opening public registration to reduce automated signups.

The `join_organization` RPC used by the app is defined in `202611030002_projects_chat_join.sql` and re-created with its execute permission in `202611040001_ensure_join_organization_rpc.sql`. The latter also notifies PostgREST to reload its schema cache. If the `Could not find the function public.join_organization(p_organization_id) in the schema cache` error persists after migration, verify that all migrations succeeded against the same Supabase project URL configured in `.env.local`, then use **Project Settings → API → Reload schema cache** (or run `NOTIFY pgrst, 'reload schema';` in the SQL editor) and reload the app.

Without the Supabase credentials the app fails closed and displays a setup notice. Signup counts are queried from actual `daily_signups` records; the database function enforces one signup per authenticated user per organization/date and the 15-person cap transactionally.
