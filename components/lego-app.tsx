'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type Organization = { id: string; name: string; focus: string; description: string };
type Profile = { id: string; username: string };
type Project = {
  id: string;
  organization_id: string;
  title: string;
  status: 'Planning' | 'Building' | 'Ready to Share';
  owner_name: string;
  due_date: string | null;
  needed_pieces: string[];
  updates: string[];
};
type ChatMessage = { id: string; body: string; created_at: string; sender_id: string; profiles?: { username: string } | null };
type Signup = { id: string; event_date: string; created_at: string; user_id: string };

const today = () => new Date().toISOString().slice(0, 10);
const card = 'rounded-3xl border border-sky-200 bg-white p-6 shadow-lego';
const field = 'w-full rounded-xl border border-sky-200 bg-sky-50 px-4 py-3';

export default function LegoApp() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [memberOrgIds, setMemberOrgIds] = useState<string[]>([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [signups, setSignups] = useState<Signup[]>([]);
  const [signupDate, setSignupDate] = useState(today());
  const [signupCount, setSignupCount] = useState(0);
  const [alreadySignedUp, setAlreadySignedUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [orgName, setOrgName] = useState('');
  const [focus, setFocus] = useState('City scenes');
  const [description, setDescription] = useState('');
  const [chatDraft, setChatDraft] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDueDate, setProjectDueDate] = useState('');
  const [projectPieces, setProjectPieces] = useState('');
  const [registering, setRegistering] = useState(false);
  const [tab, setTab] = useState<'overview' | 'projects' | 'chat' | 'signups'>('overview');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const selectedOrganization = useMemo(() => organizations.find((org) => org.id === selectedOrg), [organizations, selectedOrg]);
  const myOrganizations = organizations.filter((org) => memberOrgIds.includes(org.id));
  const availableOrganizations = organizations.filter((org) => !memberOrgIds.includes(org.id));

  const loadOrganizations = useCallback(async () => {
    if (!supabase || !user) return;
    const [{ data: orgs, error: orgError }, { data: memberships, error: memberError }] = await Promise.all([
      supabase.from('organizations').select('id, name, focus, description').order('created_at', { ascending: false }),
      supabase.from('organization_members').select('organization_id').eq('user_id', user.id)
    ]);
    if (orgError || memberError) { setError(orgError?.message || memberError?.message || 'Could not load organizations.'); return; }
    const ids = (memberships ?? []).map((item) => item.organization_id);
    setOrganizations(orgs ?? []);
    setMemberOrgIds(ids);
    setSelectedOrg((current) => ids.includes(current) ? current : ids[0] ?? '');
  }, [user]);

  const loadDashboard = useCallback(async () => {
    if (!supabase || !selectedOrg) return;
    const [{ data: projectRows, error: projectError }, { data: chatRows, error: chatError }, { data: signupRows, error: signupError }] = await Promise.all([
      supabase.from('projects').select('id, organization_id, title, status, owner_name, due_date, needed_pieces, updates').eq('organization_id', selectedOrg).order('created_at', { ascending: false }),
      supabase.from('chat_messages').select('id, body, created_at, sender_id, profiles(username)').eq('organization_id', selectedOrg).order('created_at', { ascending: true }).limit(200),
      supabase.from('daily_signups').select('id, event_date, created_at, user_id').eq('organization_id', selectedOrg).order('event_date', { ascending: false }).limit(100)
    ]);
    if (projectError || chatError || signupError) {
      setError(projectError?.message || chatError?.message || signupError?.message || 'Could not load organization data. Apply the latest Supabase migration.');
      return;
    }
    setProjects((projectRows ?? []) as Project[]);
    setMessages((chatRows ?? []) as ChatMessage[]);
    setSignups(signupRows ?? []);
  }, [selectedOrg]);

  const loadSignupCount = useCallback(async () => {
    if (!supabase || !selectedOrg) return;
    const [{ count, error: countError }, { data: mine, error: mineError }] = await Promise.all([
      supabase.from('daily_signups').select('id', { count: 'exact', head: true }).eq('organization_id', selectedOrg).eq('event_date', signupDate),
      supabase.from('daily_signups').select('id').eq('organization_id', selectedOrg).eq('event_date', signupDate).eq('user_id', user?.id ?? '').maybeSingle()
    ]);
    if (countError || mineError) { setError(countError?.message || mineError?.message || 'Could not check signups.'); return; }
    setSignupCount(count ?? 0);
    setAlreadySignedUp(Boolean(mine));
  }, [selectedOrg, signupDate, user]);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let active = true;
    const client = supabase;
    client.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) setError(sessionError.message);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null); setProfile(null); setOrganizations([]); setMemberOrgIds([]); setSelectedOrg('');
      setProjects([]); setMessages([]); setSignups([]); setError(''); setNotice('');
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!user || !supabase) return;
    let active = true;
    supabase.from('profiles').select('id, username').eq('id', user.id).maybeSingle().then(({ data, error: profileError }) => {
      if (!active) return;
      if (profileError) setError(profileError.message);
      if (data) { setProfile(data); void loadOrganizations(); }
    });
    return () => { active = false; };
  }, [user, loadOrganizations]);

  useEffect(() => { if (profile && memberOrgIds.length === 0) void loadOrganizations(); }, [profile, memberOrgIds.length, loadOrganizations]);
  useEffect(() => { if (selectedOrg) void loadDashboard(); }, [selectedOrg, loadDashboard]);
  useEffect(() => { if (selectedOrg) void loadSignupCount(); }, [selectedOrg, signupDate, loadSignupCount]);
  useEffect(() => {
    if (!selectedOrg || tab !== 'chat') return;
    const timer = window.setInterval(() => { void loadDashboard(); }, 5000);
    return () => window.clearInterval(timer);
  }, [selectedOrg, tab, loadDashboard]);

  const handleAuthentication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!supabase) return;
    setBusy(true); setError(''); setNotice('');
    const result = registering
      ? await supabase.auth.signUp({ email: email.trim(), password, options: { data: { username: username.trim() }, emailRedirectTo: `${window.location.origin}/` } })
      : await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (result.error) { setError(result.error.message); return; }
    if (registering && !result.data.session) setNotice('Account created. Check your inbox and spam folder for the confirmation link, then sign in.');
  };

  const saveUsername = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!supabase || !user) return;
    setBusy(true); setError('');
    const { data, error: saveError } = await supabase.from('profiles').upsert({ id: user.id, username: username.trim() }, { onConflict: 'id' }).select('id, username').single();
    setBusy(false); if (saveError) { setError(saveError.message); return; }
    setProfile(data); await loadOrganizations();
  };

  const createOrganization = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!supabase || !user) return;
    setBusy(true); setError('');
    const { error: createError } = await supabase.from('organizations').insert({ owner_id: user.id, name: orgName.trim(), focus, description: description.trim() });
    setBusy(false); if (createError) { setError(createError.message); return; }
    setOrgName(''); setDescription(''); setNotice('Organization created.'); await loadOrganizations();
  };

  const joinOrganization = async (organizationId: string) => {
    if (!supabase) return;
    setBusy(true); setError('');
    const { error: joinError } = await supabase.rpc('join_organization', { p_organization_id: organizationId });
    setBusy(false); if (joinError) { setError(joinError.message); return; }
    setSelectedOrg(organizationId); setNotice('You joined the organization.'); await loadOrganizations();
  };

  const createProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!supabase || !selectedOrg || !profile) return;
    setBusy(true); setError('');
    const { error: projectError } = await supabase.from('projects').insert({ organization_id: selectedOrg, created_by: user?.id, title: projectTitle.trim(), status: 'Planning', owner_name: profile.username, due_date: projectDueDate || null, needed_pieces: projectPieces.split(',').map((piece) => piece.trim()).filter(Boolean) });
    setBusy(false); if (projectError) { setError(projectError.message); return; }
    setProjectTitle(''); setProjectDueDate(''); setProjectPieces(''); await loadDashboard();
  };

  const updateProjectStatus = async (projectId: string, status: Project['status']) => {
    if (!supabase) return;
    const { error: updateError } = await supabase.from('projects').update({ status }).eq('id', projectId);
    if (updateError) { setError(updateError.message); return; }
    await loadDashboard();
  };

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!supabase || !user || !selectedOrg || !chatDraft.trim()) return;
    setBusy(true); setError('');
    const { error: sendError } = await supabase.from('chat_messages').insert({ organization_id: selectedOrg, sender_id: user.id, body: chatDraft.trim() });
    setBusy(false); if (sendError) { setError(sendError.message); return; }
    setChatDraft(''); await loadDashboard();
  };

  const signUpForEvent = async () => {
    if (!supabase || !selectedOrg) return;
    setBusy(true); setError(''); setNotice('');
    const { error: signupError } = await supabase.rpc('signup_for_event', { p_organization_id: selectedOrg, p_event_date: signupDate });
    setBusy(false); if (signupError) { setError(signupError.message); return; }
    setNotice('Your signup is confirmed.'); await Promise.all([loadDashboard(), loadSignupCount()]);
  };

  const signOut = async () => { if (supabase) { const { error: signOutError } = await supabase.auth.signOut(); if (signOutError) setError(signOutError.message); } };
  const tabs = [{ id: 'overview', label: 'Overview' }, { id: 'projects', label: 'Projects' }, { id: 'chat', label: 'Chat' }, { id: 'signups', label: 'Signups' }] as const;

  return (
    <main className="min-h-screen px-4 py-10 text-slate-800 md:px-8"><div className="mx-auto max-w-7xl">
      <header className={card}><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="mb-2 inline-flex rounded-full bg-yellow-200 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-sky-900">BrickBuddy League</p><h1 className="text-3xl font-black text-sky-900 md:text-5xl">Build together, one LEGO brick at a time.</h1></div>{user && <button onClick={signOut} className="rounded-xl bg-slate-100 px-4 py-2 font-bold">Sign out</button>}</div><p className="mt-3 text-slate-600">Build projects, chat with your club, and manage event signups.</p></header>
      {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}{notice && <p role="status" className="mt-5 rounded-xl bg-green-50 p-4 text-green-800">{notice}</p>}
      {!supabase ? <section className={`${card} mt-8`}><h2 className="text-xl font-black text-orange-900">Authentication is not configured</h2><p className="mt-2">Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to Vercel, then redeploy.</p></section>
      : loading ? <p className="mt-8 rounded-2xl bg-white p-6">Loading account…</p>
      : !user ? <section className={`${card} mt-8 max-w-xl`}><h2 className="text-2xl font-black text-sky-900">{registering ? 'Create your account' : 'Sign in'}</h2><form onSubmit={handleAuthentication} className="mt-5 space-y-3">{registering && <input required minLength={3} maxLength={24} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Choose a username" className={field} />}<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className={field} /><input required type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (at least 8 characters)" className={field} /><button disabled={busy} className="w-full rounded-xl bg-sky-600 px-5 py-3 font-bold text-white disabled:opacity-60">{busy ? 'Please wait…' : registering ? 'Create account' : 'Sign in'}</button></form><button onClick={() => { setRegistering(!registering); setError(''); setNotice(''); }} className="mt-4 text-sm font-bold text-sky-700 underline">{registering ? 'Already have an account? Sign in' : 'New here? Create an account'}</button></section>
      : !profile ? <section className={`${card} mt-8 max-w-xl`}><h2 className="text-2xl font-black text-sky-900">Finish your profile</h2><form onSubmit={saveUsername} className="mt-5 flex gap-3"><input required minLength={3} maxLength={24} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Choose a username" className={field} /><button disabled={busy} className="rounded-xl bg-sky-600 px-5 py-3 font-bold text-white">Save</button></form></section>
      : <>
        <section className={`${card} mt-8`}><p className="text-sm font-bold uppercase tracking-wider text-sky-700">Signed in as @{profile.username}</p><h2 className="mt-2 text-2xl font-black text-sky-900">Your organizations</h2>
          {myOrganizations.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{myOrganizations.map((org) => <button key={org.id} onClick={() => setSelectedOrg(org.id)} className={`rounded-full px-4 py-2 font-bold ${selectedOrg === org.id ? 'bg-sky-600 text-white' : 'bg-slate-100'}`}>{org.name}</button>)}</div>}
          {availableOrganizations.length > 0 && <div className="mt-5"><h3 className="font-bold">Discover clubs</h3><div className="mt-2 flex flex-wrap gap-2">{availableOrganizations.map((org) => <button key={org.id} disabled={busy} onClick={() => joinOrganization(org.id)} className="rounded-full bg-yellow-100 px-4 py-2 font-bold text-sky-900">Join {org.name}</button>)}</div></div>}
          <form onSubmit={createOrganization} className="mt-6 grid gap-3 md:grid-cols-2"><h3 className="text-xl font-black md:col-span-2">Create an organization</h3><input required maxLength={80} value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Organization name" className={field} /><select value={focus} onChange={(e) => setFocus(e.target.value)} className={field}><option>City scenes</option><option>Castle builds</option><option>Space adventures</option><option>Vehicle builds</option></select><textarea maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your team" rows={3} className={`${field} md:col-span-2`} /><button disabled={busy} className="rounded-xl bg-sky-600 px-5 py-3 font-bold text-white md:col-span-2">Create organization</button></form>
        </section>
        {selectedOrganization ? <section className={`${card} mt-8`}><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-wider text-sky-700">{selectedOrganization.focus}</p><h2 className="mt-1 text-3xl font-black text-sky-900">{selectedOrganization.name}</h2><p className="mt-2 text-slate-600">{selectedOrganization.description}</p></div><p className="rounded-full bg-yellow-100 px-4 py-2 font-bold">Today: {signupCount} / 15</p></div>
          <nav className="mt-6 flex flex-wrap gap-2">{tabs.map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={`rounded-full px-4 py-2 font-bold ${tab === item.id ? 'bg-sky-600 text-white' : 'bg-slate-100'}`}>{item.label}</button>)}</nav>
          {tab === 'overview' && <div className="mt-6 grid gap-4 md:grid-cols-3"><div className="rounded-2xl bg-sky-50 p-5"><p className="font-bold text-sky-800">Active projects</p><p className="mt-2 text-3xl font-black">{projects.length}</p></div><div className="rounded-2xl bg-yellow-50 p-5"><p className="font-bold text-yellow-900">Signups on selected date</p><p className="mt-2 text-3xl font-black">{signupCount} / 15</p></div><div className="rounded-2xl bg-indigo-50 p-5"><p className="font-bold text-indigo-900">Club chat</p><p className="mt-2 text-3xl font-black">{messages.length} messages</p></div></div>}
          {tab === 'projects' && <div className="mt-6"><form onSubmit={createProject} className="grid gap-3 rounded-2xl bg-sky-50 p-5 md:grid-cols-2"><h3 className="text-xl font-black md:col-span-2">Start a project</h3><input required maxLength={100} value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} placeholder="Project title" className={field} /><input type="date" value={projectDueDate} onChange={(e) => setProjectDueDate(e.target.value)} className={field} /><input value={projectPieces} onChange={(e) => setProjectPieces(e.target.value)} placeholder="Needed pieces, separated by commas" className={`${field} md:col-span-2`} /><button disabled={busy} className="rounded-xl bg-sky-600 px-5 py-3 font-bold text-white md:col-span-2">Add project</button></form><div className="mt-5 grid gap-4 md:grid-cols-2">{projects.map((project) => <article key={project.id} className="rounded-2xl border border-sky-200 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-xl font-black text-sky-900">{project.title}</h4><select aria-label={`Status for ${project.title}`} value={project.status} onChange={(e) => void updateProjectStatus(project.id, e.target.value as Project['status'])} className="rounded-lg border p-2"><option>Planning</option><option>Building</option><option>Ready to Share</option></select></div><p className="mt-2 text-sm text-slate-600">Owner: @{project.owner_name}{project.due_date ? ` · Due ${project.due_date}` : ''}</p><div className="mt-3 flex flex-wrap gap-2">{project.needed_pieces.map((piece) => <span key={piece} className="rounded-full bg-yellow-100 px-3 py-1 text-sm">{piece}</span>)}</div>{project.updates?.length > 0 && <ul className="mt-3 list-disc pl-5 text-sm text-slate-600">{project.updates.map((update, i) => <li key={`${i}-${update}`}>{update}</li>)}</ul>}</article>)}</div>{projects.length === 0 && <p className="mt-4 text-slate-600">No projects yet—create the first one above.</p>}</div>}
          {tab === 'chat' && <div className="mt-6"><div className="max-h-[28rem] space-y-3 overflow-y-auto rounded-2xl bg-slate-50 p-4" aria-live="polite">{messages.map((message) => <article key={message.id} className="rounded-xl bg-white p-4"><div className="flex justify-between gap-3 text-xs font-bold text-slate-500"><span>@{message.profiles?.username ?? 'Club member'}</span><time>{new Date(message.created_at).toLocaleString()}</time></div><p className="mt-2 whitespace-pre-wrap text-slate-800">{message.body}</p></article>)}{messages.length === 0 && <p className="text-slate-600">No messages yet. Say hello to your club!</p>}</div><form onSubmit={sendMessage} className="mt-4"><label htmlFor="chat-message" className="sr-only">Chat message</label><textarea id="chat-message" required maxLength={2000} rows={3} value={chatDraft} onChange={(e) => setChatDraft(e.target.value)} placeholder="Write a message to your club…" className={field} /><button disabled={busy} className="mt-2 rounded-xl bg-sky-600 px-5 py-3 font-bold text-white">Send message</button></form></div>}
          {tab === 'signups' && <div className="mt-6 grid gap-5 lg:grid-cols-2"><div className="rounded-2xl bg-yellow-50 p-5"><h3 className="text-xl font-black">Event signup</h3><label className="mt-3 block text-sm font-bold" htmlFor="signup-date">Choose a date</label><input id="signup-date" type="date" min={today()} value={signupDate} onChange={(e) => setSignupDate(e.target.value)} className={`${field} mt-2`} /><p className="mt-3 font-bold">{signupCount} / 15 spots filled</p><div className="mt-2 h-3 overflow-hidden rounded-full bg-white"><div className="h-full bg-sky-500" style={{ width: `${Math.min(signupCount / 15 * 100, 100)}%` }} /></div><button disabled={busy || signupCount >= 15 || alreadySignedUp || signupDate < today()} onClick={() => void signUpForEvent()} className="mt-4 w-full rounded-xl bg-yellow-400 px-5 py-3 font-black text-sky-900 disabled:opacity-50">{alreadySignedUp ? 'You are signed up' : signupCount >= 15 ? 'At daily limit' : 'Sign up for this date'}</button></div><div className="rounded-2xl bg-sky-50 p-5"><h3 className="text-xl font-black">Recent signup history</h3><div className="mt-3 space-y-2">{signups.map((signup) => <div key={signup.id} className="flex justify-between rounded-xl bg-white p-3"><span className="font-bold">{signup.event_date}</span><span className="text-sm text-slate-600">{signup.user_id === user.id ? 'You' : 'Member'}</span></div>)}{signups.length === 0 && <p className="text-slate-600">No signups yet.</p>}</div></div></div>}
        </section> : <section className={`${card} mt-8`}><h2 className="text-xl font-black text-sky-900">Join or create an organization to get started.</h2></section>}
      </>}
    </div></main>
  );
}
