'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type Organization = {
  id: string;
  name: string;
  focus: string;
  description: string;
};

type Profile = {
  id: string;
  username: string;
};

const today = () => new Date().toISOString().slice(0, 10);

export default function LegoApp() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [signupCounts, setSignupCounts] = useState<Record<string, number>>({});
  const [selectedOrg, setSelectedOrg] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [orgName, setOrgName] = useState('');
  const [focus, setFocus] = useState('City scenes');
  const [description, setDescription] = useState('');
  const [registering, setRegistering] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadOrganizations = useCallback(async () => {
    if (!supabase) return;
    const { data, error: loadError } = await supabase
      .from('organizations')
      .select('id, name, focus, description')
      .order('created_at', { ascending: false });
    if (loadError) {
      setError(loadError.message);
      return;
    }

    const liveOrganizations = data ?? [];
    setOrganizations(liveOrganizations);
    setSelectedOrg((current) => current || liveOrganizations[0]?.id || '');

    const counts = await Promise.all(
      liveOrganizations.map(async (organization) => {
        const { count, error: countError } = await supabase!
          .from('daily_signups')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organization.id)
          .eq('event_date', today());
        if (countError) throw countError;
        return [organization.id, count ?? 0] as const;
      })
    ).catch((countError: Error) => {
      setError(countError.message);
      return [] as readonly (readonly [string, number])[];
    });
    setSignupCounts(Object.fromEntries(counts));
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;
    const client = supabase;
    client.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) setError(sessionError.message);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setProfile(null);
      setOrganizations([]);
      setSignupCounts({});
      setSelectedOrg('');
      setError('');
      setNotice('');
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user || !supabase) return;
    let active = true;
    const client = supabase;
    client.from('profiles').select('id, username').eq('id', user.id).maybeSingle().then(({ data, error: profileError }) => {
      if (!active) return;
      if (profileError) setError(profileError.message);
      if (data) {
        setProfile(data);
        void loadOrganizations();
      }
    });
    return () => {
      active = false;
    };
  }, [user, loadOrganizations]);

  const handleAuthentication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError('');
    setNotice('');
    const result = registering
      ? await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { username: username.trim() } }
        })
      : await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }
    if (registering && !result.data.session) {
      setNotice('Check your email to confirm your account, then sign in.');
    }
  };

  const saveUsername = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !user) return;
    const cleaned = username.trim();
    if (!cleaned) return;
    setBusy(true);
    setError('');
    const { data, error: saveError } = await supabase
      .from('profiles')
      .upsert({ id: user.id, username: cleaned }, { onConflict: 'id' })
      .select('id, username')
      .single();
    setBusy(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    setProfile(data);
    await loadOrganizations();
  };

  const createOrganization = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !user) return;
    setBusy(true);
    setError('');
    const { error: createError } = await supabase.from('organizations').insert({
      owner_id: user.id,
      name: orgName.trim(),
      focus,
      description: description.trim()
    });
    setBusy(false);
    if (createError) {
      setError(createError.message);
      return;
    }
    setOrgName('');
    setDescription('');
    await loadOrganizations();
  };

  const signUpForEvent = async () => {
    if (!supabase || !selectedOrg) return;
    setBusy(true);
    setError('');
    setNotice('');
    const { error: signupError } = await supabase.rpc('signup_for_event', {
      p_organization_id: selectedOrg,
      p_event_date: today()
    });
    setBusy(false);
    if (signupError) {
      setError(signupError.message);
      return;
    }
    setNotice('Your signup is confirmed.');
    await loadOrganizations();
  };

  const signOut = async () => {
    if (!supabase) return;
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError(signOutError.message);
  };

  const selectedOrganization = organizations.find((organization) => organization.id === selectedOrg);
  const signupCount = selectedOrg ? signupCounts[selectedOrg] ?? 0 : 0;

  return (
    <main className="min-h-screen px-4 py-10 text-slate-800 md:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="rounded-[2rem] border border-sky-200 bg-white/90 p-6 shadow-lego">
          <p className="mb-2 inline-flex rounded-full bg-yellow-200 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-sky-900">BrickBuddy League</p>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-3xl font-black text-sky-900 md:text-5xl">Build together, one LEGO brick at a time.</h1>
            {user && <button onClick={signOut} className="rounded-xl bg-slate-100 px-4 py-2 font-bold hover:bg-slate-200">Sign out</button>}
          </div>
          <p className="mt-3 text-slate-600">Accounts, organizations, and event signups are saved to the connected database. No demo accounts or sample signups are shown.</p>
        </header>

        {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
        {notice && <p role="status" className="mt-5 rounded-xl bg-green-50 p-4 text-green-800">{notice}</p>}

        {!supabase ? (
          <section className="mt-8 rounded-3xl border border-orange-200 bg-orange-50 p-6">
            <h2 className="text-xl font-black text-orange-900">Authentication is not configured</h2>
            <p className="mt-2 text-orange-800">Set the Supabase URL and anon key in the deployment environment, then apply <code>supabase/migrations/202611030001_live_accounts_and_signups.sql</code>. The app stays locked until a real authentication service is configured.</p>
          </section>
        ) : loading ? (
          <p className="mt-8 rounded-2xl bg-white p-6">Loading account…</p>
        ) : !user ? (
          <section className="mt-8 max-w-xl rounded-3xl border border-sky-200 bg-white p-6 shadow-lego">
            <h2 className="text-2xl font-black text-sky-900">{registering ? 'Create your account' : 'Sign in'}</h2>
            <form onSubmit={handleAuthentication} className="mt-5 space-y-3">
              {registering && <input required minLength={3} maxLength={24} value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Choose a username" autoComplete="username" className="w-full rounded-xl border border-sky-200 bg-sky-50 px-4 py-3" />}
              <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" autoComplete="email" className="w-full rounded-xl border border-sky-200 bg-sky-50 px-4 py-3" />
              <input required type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password (at least 8 characters)" autoComplete={registering ? 'new-password' : 'current-password'} className="w-full rounded-xl border border-sky-200 bg-sky-50 px-4 py-3" />
              <button disabled={busy} className="w-full rounded-xl bg-sky-600 px-5 py-3 font-bold text-white disabled:opacity-60">{busy ? 'Please wait…' : registering ? 'Create account' : 'Sign in'}</button>
            </form>
            <button onClick={() => { setRegistering(!registering); setError(''); setNotice(''); }} className="mt-4 text-sm font-bold text-sky-700 underline">
              {registering ? 'Already have an account? Sign in' : 'New here? Create an account'}
            </button>
          </section>
        ) : !profile ? (
          <section className="mt-8 max-w-xl rounded-3xl border border-sky-200 bg-white p-6 shadow-lego">
            <h2 className="text-2xl font-black text-sky-900">Finish your profile</h2>
            <form onSubmit={saveUsername} className="mt-5 flex gap-3">
              <input required minLength={3} maxLength={24} value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Choose a username" autoComplete="username" className="min-w-0 flex-1 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3" />
              <button disabled={busy} className="rounded-xl bg-sky-600 px-5 py-3 font-bold text-white disabled:opacity-60">Save</button>
            </form>
          </section>
        ) : (
          <>
            <section className="mt-8 rounded-3xl border border-sky-200 bg-white p-6 shadow-lego">
              <p className="text-sm font-bold uppercase tracking-wider text-sky-700">Signed in as @{profile.username}</p>
              <h2 className="mt-2 text-2xl font-black text-sky-900">Organizations</h2>
              {organizations.length === 0 ? <p className="mt-3 text-slate-600">No organizations yet. Create one to get started.</p> : (
                <div className="mt-4 flex flex-wrap gap-2">
                  {organizations.map((organization) => <button key={organization.id} onClick={() => setSelectedOrg(organization.id)} className={`rounded-full px-4 py-2 font-bold ${selectedOrg === organization.id ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700'}`}>{organization.name}</button>)}
                </div>
              )}
              {selectedOrganization && (
                <div className="mt-6 rounded-2xl bg-sky-50 p-5">
                  <p className="text-sm font-bold uppercase tracking-wider text-sky-700">{selectedOrganization.focus}</p>
                  <h3 className="mt-1 text-2xl font-black text-sky-900">{selectedOrganization.name}</h3>
                  {selectedOrganization.description && <p className="mt-2 text-slate-700">{selectedOrganization.description}</p>}
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                    <p className="font-bold text-slate-700">Today: {signupCount} / 15 actual signups</p>
                    <button disabled={busy || signupCount >= 15} onClick={signUpForEvent} className="rounded-xl bg-yellow-400 px-5 py-3 font-black text-sky-900 disabled:cursor-not-allowed disabled:opacity-60">{signupCount >= 15 ? 'At daily limit' : 'Sign up for today'}</button>
                  </div>
                </div>
              )}
            </section>

            <section className="mt-8 rounded-3xl border border-sky-200 bg-white p-6 shadow-lego">
              <h2 className="text-2xl font-black text-sky-900">Create an organization</h2>
              <form onSubmit={createOrganization} className="mt-5 grid gap-3 md:grid-cols-2">
                <input required maxLength={80} value={orgName} onChange={(event) => setOrgName(event.target.value)} placeholder="Organization name" className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3" />
                <select value={focus} onChange={(event) => setFocus(event.target.value)} className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
                  <option>City scenes</option><option>Castle builds</option><option>Space adventures</option><option>Vehicle builds</option>
                </select>
                <textarea maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe your team" rows={3} className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 md:col-span-2" />
                <button disabled={busy} className="rounded-xl bg-sky-600 px-5 py-3 font-bold text-white disabled:opacity-60 md:col-span-2">{busy ? 'Saving…' : 'Create organization'}</button>
              </form>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
