'use client';

import { FormEvent, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

const card = 'rounded-3xl border border-sky-200 bg-white p-6 shadow-lego';
const field = 'w-full rounded-xl border border-sky-200 bg-sky-50 px-4 py-3';

export default function LegoApp() {
  const [username, setUsername] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    void supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleContinue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanUsername = username.trim();
    if (cleanUsername.length < 3 || cleanUsername.length > 24) {
      setError('Your username must be between 3 and 24 characters.');
      return;
    }
    if (!supabase) {
      setError('Sign-in is not set up yet. Please ask the site administrator to configure Supabase.');
      return;
    }

    setSubmitting(true);
    setError('');
    const { data, error: signInError } = await supabase.auth.signInAnonymously({
      options: { data: { username: cleanUsername } }
    });
    setSubmitting(false);

    if (signInError) {
      if (/anonymous sign-ins are disabled|anonymous provider is disabled/i.test(signInError.message)) {
        setError('Username sign-in is not enabled yet. Please ask the site administrator to enable Anonymous Sign-Ins in Supabase.');
      } else if (/username|profiles_username_key|duplicate key/i.test(signInError.message)) {
        setError('That username is already taken. Try another one.');
      } else {
        setError(signInError.message);
      }
      return;
    }

    setUser(data.user);
  }

  const profileUsername = typeof user?.user_metadata?.username === 'string'
    ? user.user_metadata.username
    : username.trim();

  return (
    <main className="min-h-screen bg-sky-50 px-6 py-12 text-slate-800">
      <div className="mx-auto max-w-4xl">
        <section className={`${card} text-center`}>
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-sky-700">
            BrickBuddy League
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Build something awesome together.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
            A playful place for young builders to find a team, share project ideas,
            and bring their next creation to life.
          </p>
        </section>

        <section id="get-started" className={`${card} mx-auto mt-8 max-w-xl`}>
          {loading ? (
            <p className="text-center text-slate-600" role="status">Checking your sign-in…</p>
          ) : user ? (
            <div className="text-center" role="status">
              <h2 className="text-2xl font-bold">You’re in, {profileUsername}!</h2>
              <p className="mt-2 text-slate-600">Your sign-in is saved in this browser.</p>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold">Get started with a username</h2>
              <p className="mt-2 text-slate-600">No email or password needed.</p>
              <form className="mt-5 space-y-4" onSubmit={handleContinue}>
                <label className="block font-semibold" htmlFor="username">Username</label>
                <input
                  autoComplete="username"
                  className={field}
                  id="username"
                  maxLength={24}
                  minLength={3}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Choose a username"
                  required
                  value={username}
                />
                {error && <p className="text-sm font-medium text-red-700" role="alert">{error}</p>}
                <button
                  className="w-full rounded-xl bg-sky-600 px-6 py-3 font-bold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={submitting}
                  type="submit"
                >
                  {submitting ? 'Getting you in…' : 'Continue'}
                </button>
              </form>
              <p className="mt-4 text-xs text-slate-500">
                Username-only access is not identity-verified. Your account stays on this browser;
                clearing its saved data means you may lose access to it.
              </p>
            </>
          )}
        </section>

        <section id="how-it-works" className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            ['🧱', 'Find your crew', 'Meet builders who love the same things you do.'],
            ['💡', 'Share an idea', 'Turn a big idea into a project your team can build.'],
            ['🎉', 'Show it off', 'Celebrate your creation and inspire other builders.']
          ].map(([icon, title, description]) => (
            <article className={card} key={title}>
              <div className="text-3xl" aria-hidden="true">{icon}</div>
              <h2 className="mt-3 text-xl font-bold">{title}</h2>
              <p className="mt-2 text-slate-600">{description}</p>
            </article>
          ))}
        </section>

        <p className="mt-8 text-center text-sm text-slate-500">
          BrickBuddy League — where every great build starts with an idea.
        </p>
      </div>
    </main>
  );
}
