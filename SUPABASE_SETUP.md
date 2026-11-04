# Supabase setup and database troubleshooting

The app uses Supabase Auth and Postgres for accounts, groups, projects, group chat, and build-day signups. The app does not silently substitute demo data: configure the real Supabase project before inviting users.

## First-time setup

1. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the same Supabase project.
2. In Supabase, enable **Authentication → Sign In / Providers → Anonymous Sign-Ins**. Username-only sign-in is a convenience, not identity verification; an anonymous account is tied to its browser.
3. Apply every SQL migration in `supabase/migrations/` in filename order. With the Supabase CLI linked to the correct project, run `supabase db push` from the repository root. This includes the new `202611040002_live_app_permissions_and_actions.sql` migration.
4. If a function is still reported missing after a successful migration, reload the project's PostgREST schema cache in **Project Settings → API**, or run `NOTIFY pgrst, 'reload schema';` in the SQL editor. Confirm that the migration target and `NEXT_PUBLIC_SUPABASE_URL` refer to the same project.
5. Restart/redeploy the Next.js app after changing environment variables.

## What kids can do

Signed-in builders can discover and join groups, create a group, add projects and track their own project status, send group messages, and sign up for a build day. All reads and writes go through Supabase with row-level security; project/chat actions are restricted to group members and signup capacity is enforced in a database function.

The chat is intentionally a small group feature. Remind children not to share personal information and to ask a trusted adult if anything online feels wrong. Configure appropriate parent/guardian supervision and Supabase abuse protections before public use.

## If sign-in or database actions fail

- Missing Supabase environment variables show a setup message on the sign-in page.
- Anonymous sign-in must be enabled in the Supabase dashboard.
- A `schema cache`, `function not found`, or missing relation error usually means migrations were not all applied, or were applied to a different project than the app uses. Apply migrations in order, then reload the schema cache.
- A row-level security or permission error indicates a migration did not complete or the user is not a member of that group.
- User-facing errors are kept simple for children; the underlying error is logged in the browser console to help an adult diagnose setup problems.
