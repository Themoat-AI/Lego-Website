# Username-only sign-in setup

The app lets a visitor start with only a username by creating a Supabase anonymous-auth account. Supabase keeps the resulting session in the browser, so returning in that same browser restores the session without asking for the username again.

Before using this sign-in option:

1. Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as described in `SUPABASE_SETUP.md`.
2. In the Supabase dashboard, open **Authentication → Sign In / Providers** and enable **Anonymous Sign-Ins**.
3. Apply all SQL migrations in `supabase/migrations/` in filename order. The profile trigger stores the chosen username and enforces the existing unique username constraint.

This is passwordless convenience access, not identity verification: a username alone cannot prove who owns an account. Existing accounts created with email/password cannot be recovered by username alone. Anonymous accounts are tied to the browser session; if the browser's saved data is cleared, access to that account may be lost. Configure Supabase rate limits/CAPTCHA before allowing public use.
