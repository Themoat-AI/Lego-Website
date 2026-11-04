'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type Organization = {
  id: string;
  owner_id: string;
  name: string;
  focus: string;
  description: string;
};

type Project = {
  id: string;
  organization_id: string;
  created_by: string;
  title: string;
  status: 'Planning' | 'Building' | 'Ready to Share';
  owner_name: string;
  due_date: string | null;
  needed_pieces: string[];
  updates: string[];
};

type ChatMessage = {
  id: string;
  organization_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

type Membership = { organization_id: string; user_id: string };
type Signup = { organization_id: string; event_date: string; user_id: string };

const card = 'rounded-3xl border border-sky-200 bg-white p-6 shadow-lego';
const field = 'w-full rounded-xl border border-sky-200 bg-sky-50 px-4 py-3';
const button = 'rounded-xl bg-sky-600 px-4 py-3 font-bold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60';
const projectStatuses: Project['status'][] = ['Planning', 'Building', 'Ready to Share'];

function todayLocal() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function friendlyError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error('BrickBuddy action failed:', message);
  if (/duplicate key|unique constraint|already exists/i.test(message)) return 'That name is already being used. Try a different one.';
  if (/schema cache|could not find the function|does not exist|relation .* does not exist|pgrst/i.test(message)) {
    return 'The site database needs an update. Please ask an adult to apply the latest database migrations.';
  }
  if (/row-level security|permission denied|not allowed|violates.*policy/i.test(message)) {
    return 'You do not have permission to do that yet. Check that you have joined this group, or ask an adult to check the site setup.';
  }
  if (/already signed up|full for that day|past date/i.test(message)) return message;
  return 'That did not work just now. Please try again, or ask an adult for help if it keeps happening.';
}

export default function LegoApp() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [signups, setSignups] = useState<Signup[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupFocus, setGroupFocus] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [projectGroup, setProjectGroup] = useState('');
  const [projectPieces, setProjectPieces] = useState('');
  const [projectDueDate, setProjectDueDate] = useState('');
  const [chatText, setChatText] = useState<Record<string, string>>({});
  const [signupDate, setSignupDate] = useState(todayLocal());

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }
    let alive = true;
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!alive) return;
      if (sessionError) setError(friendlyError(sessionError));
      setUser(data.session?.user ?? null);
      setAuthLoading(false);
    }).catch((sessionError: unknown) => {
      if (!alive) return;
      setError(friendlyError(sessionError));
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadData = useCallback(async () => {
    if (!supabase || !user) return;
    setLoading(true);
    setError('');
    try {
      const [orgResult, memberResult] = await Promise.all([
        supabase.from('organizations').select('id, owner_id, name, focus, description').order('created_at', { ascending: false }),
        supabase.from('organization_members').select('organization_id, user_id').eq('user_id', user.id)
      ]);
      if (orgResult.error) throw orgResult.error;
      if (memberResult.error) throw memberResult.error;
      const orgRows = (orgResult.data ?? []) as Organization[];
      const memberRows = (memberResult.data ?? []) as Membership[];
      const joinedIds = memberRows.map((membership) => membership.organization_id);
      let projectRows: Project[] = [];
      let messageRows: ChatMessage[] = [];
      let signupRows: Signup[] = [];
      if (joinedIds.length) {
        const [projectResult, messageResult, signupResult] = await Promise.all([
          supabase.from('projects').select('id, organization_id, created_by, title, status, owner_name, due_date, needed_pieces, updates').in('organization_id', joinedIds).order('created_at', { ascending: false }),
          supabase.from('chat_messages').select('id, organization_id, sender_id, body, created_at').in('organization_id', joinedIds).order('created_at', { ascending: true }).limit(200),
          supabase.from('daily_signups').select('organization_id, event_date, user_id').in('organization_id', joinedIds).gte('event_date', todayLocal())
        ]);
        if (projectResult.error) throw projectResult.error;
        if (messageResult.error) throw messageResult.error;
        if (signupResult.error) throw signupResult.error;
        projectRows = (projectResult.data ?? []) as Project[];
        messageRows = (messageResult.data ?? []) as ChatMessage[];
        signupRows = (signupResult.data ?? []) as Signup[];
      }
      setOrganizations(orgRows);
      setMemberships(memberRows);
      setProjects(projectRows);
      setMessages(messageRows);
      setSignups(signupRows);
      setProjectGroup((current) => current || joinedIds[0] || '');
    } catch (loadError) {
      setError(friendlyError(loadError));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) void loadData();
    else {
      setOrganizations([]);
      setMemberships([]);
      setProjects([]);
      setMessages([]);
      setSignups([]);
    }
  }, [user, loadData]);

  const joinedIds = useMemo(() => new Set(memberships.map((membership) => membership.organization_id)), [memberships]);
  const username = typeof user?.user_metadata?.username === 'string' ? user.user_metadata.username : 'Builder';
  const myGroups = organizations.filter((organization) => joinedIds.has(organization.id));

  async function handleContinue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const cleanUsername = document.getElementById('username') instanceof HTMLInputElement
      ? (document.getElementById('username') as HTMLInputElement).value.trim()
      : '';
    if (cleanUsername.length < 3 || cleanUsername.length > 24) {
      setError('Pick a username that is between 3 and 24 characters.');
      return;
    }
    setWorking(true);
    setError('');
    try {
      const { error: signInError } = await supabase.auth.signInAnonymously({ options: { data: { username: cleanUsername } } });
      if (signInError) throw signInError;
    } catch (signInError) {
      const message = signInError instanceof Error ? signInError.message : String(signInError);
      setError(/anonymous.*disabled|anonymous provider/i.test(message)
        ? 'Username sign-in is not turned on yet. Please ask an adult to enable it in the site settings.'
        : friendlyError(signInError));
    } finally {
      setWorking(false);
    }
  }

  async function runAction(action: () => Promise<void>, successMessage?: string) {
    setWorking(true);
    setError('');
    setNotice('');
    try {
      await action();
      if (successMessage) setNotice(successMessage);
      await loadData();
    } catch (actionError) {
      setError(friendlyError(actionError));
    } finally {
      setWorking(false);
    }
  }

  async function createGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !user) return;
    const name = groupName.trim();
    const focus = groupFocus.trim();
    if (name.length < 3 || name.length > 80 || focus.length < 3) {
      setError('Give your group a name (3–80 letters) and a short focus.');
      return;
    }
    await runAction(async () => {
      const { error: insertError } = await supabase.from('organizations').insert({
        owner_id: user.id, name, focus, description: groupDescription.trim().slice(0, 500)
      });
      if (insertError) throw insertError;
      setGroupName(''); setGroupFocus(''); setGroupDescription('');
    }, 'Your group is ready! You are its first member.');
  }

  async function joinGroup(organizationId: string) {
    if (!supabase) return;
    await runAction(async () => {
      const { error: joinError } = await supabase.rpc('join_organization', { p_organization_id: organizationId });
      if (joinError) throw joinError;
    }, 'You joined the group!');
  }

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !user) return;
    const title = projectTitle.trim();
    if (!projectGroup || title.length < 3 || title.length > 100) {
      setError('Choose a group and give your project a name (3–100 letters).');
      return;
    }
    await runAction(async () => {
      const { error: insertError } = await supabase.from('projects').insert({
        organization_id: projectGroup,
        created_by: user.id,
        title,
        status: 'Planning',
        owner_name: username,
        due_date: projectDueDate || null,
        needed_pieces: projectPieces.split(',').map((piece) => piece.trim()).filter(Boolean).slice(0, 20)
      });
      if (insertError) throw insertError;
      setProjectTitle(''); setProjectPieces(''); setProjectDueDate('');
    }, 'Your project was added to the group!');
  }

  async function updateProjectStatus(project: Project, status: Project['status']) {
    if (!supabase || !user || project.created_by !== user.id) return;
    await runAction(async () => {
      const { error: updateError } = await supabase.from('projects').update({ status }).eq('id', project.id).eq('created_by', user.id);
      if (updateError) throw updateError;
    }, 'Project status updated.');
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>, organizationId: string) {
    event.preventDefault();
    if (!supabase || !user) return;
    const body = (chatText[organizationId] ?? '').trim();
    if (!body || body.length > 500) {
      setError('Write a message up to 500 characters long.');
      return;
    }
    await runAction(async () => {
      const { error: insertError } = await supabase.from('chat_messages').insert({
        organization_id: organizationId, sender_id: user.id, body
      });
      if (insertError) throw insertError;
      setChatText((current) => ({ ...current, [organizationId]: '' }));
    }, 'Message sent to your group.');
  }

  async function signUpForEvent(organizationId: string) {
    if (!supabase) return;
    await runAction(async () => {
      const { error: signupError } = await supabase.rpc('signup_for_event', {
        p_organization_id: organizationId, p_event_date: signupDate
      });
      if (signupError) throw signupError;
    }, 'You are signed up for that day!');
  }

  async function logOut() {
    if (!supabase) return;
    setWorking(true);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      setUser(null);
    } catch (signOutError) {
      setError(friendlyError(signOutError));
    } finally {
      setWorking(false);
    }
  }

  if (authLoading) return <main className="min-h-screen bg-sky-50 px-6 py-12 text-slate-800"><div className={`${card} mx-auto max-w-3xl`} role="status">Getting BrickBuddy ready…</div></main>;

  if (!user) return (
    <main className="min-h-screen bg-sky-50 px-6 py-12 text-slate-800">
      <div className="mx-auto max-w-4xl">
        <section className={`${card} text-center`}>
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-sky-700">BrickBuddy League</p>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Build something awesome together.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">Find a crew, plan a build, and share ideas with your team.</p>
        </section>
        <section id="get-started" className={`${card} mx-auto mt-8 max-w-xl`}>
          <h2 className="text-2xl font-bold">Get started with a username</h2>
          <p className="mt-2 text-slate-600">No email or password needed.</p>
          {!supabase && <p className="mt-4 rounded-xl bg-amber-50 p-4 text-amber-900" role="status">The site database is not configured yet. Please ask an adult to add the Supabase site settings.</p>}
          {error && <p className="mt-4 text-sm font-medium text-red-700" role="alert">{error}</p>}
          <form className="mt-5 space-y-4" onSubmit={handleContinue}>
            <label className="block font-semibold" htmlFor="username">Username</label>
            <input autoComplete="username" className={field} id="username" maxLength={24} minLength={3} placeholder="Choose a username" required />
            <button className={`${button} w-full`} disabled={working || !supabase} type="submit">{working ? 'Getting you in…' : 'Let’s build!'}</button>
          </form>
          <p className="mt-4 text-xs text-slate-500">Ask a parent or guardian before sharing personal information. A username account is saved on this browser.</p>
        </section>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-sky-50 px-4 py-8 text-slate-800 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-sky-200 bg-white p-5 shadow-lego">
          <div><p className="text-sm font-bold uppercase tracking-widest text-sky-700">BrickBuddy League</p><h1 className="text-2xl font-extrabold">Hi, {username}! Ready to build?</h1></div>
          <div className="flex gap-2"><button className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 font-semibold text-sky-700 hover:bg-sky-100" disabled={loading || working} onClick={() => void loadData()} type="button">Refresh</button><button className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 font-semibold text-sky-700 hover:bg-sky-100" disabled={working} onClick={() => void logOut()} type="button">Log out</button></div>
        </header>

        {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 font-medium text-red-800" role="alert">{error}</p>}
        {notice && <p className="rounded-xl border border-green-200 bg-green-50 p-4 font-medium text-green-800" role="status">{notice}</p>}
        {loading && <p className="text-slate-600" role="status">Loading your groups and projects…</p>}

        <section className="grid gap-6 md:grid-cols-2">
          <div className={card}>
            <h2 className="text-xl font-bold">Find your crew</h2>
            <p className="mt-1 text-slate-600">Join a group or start one with your friends.</p>
            <div className="mt-4 space-y-3">
              {organizations.map((organization) => {
                const members = memberships.filter((item) => item.organization_id === organization.id).length;
                const joined = joinedIds.has(organization.id);
                return <article className="rounded-2xl border border-sky-100 bg-sky-50 p-4" key={organization.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-bold">{organization.name}</h3><p className="text-sm text-sky-800">{organization.focus}</p></div><span className="text-sm text-slate-600">{members} builders</span></div>
                  <p className="mt-2 text-sm text-slate-600">{organization.description}</p>
                  {!joined && <button className={`${button} mt-3`} disabled={working} onClick={() => void joinGroup(organization.id)} type="button">Join this group</button>}
                  {joined && <p className="mt-3 font-semibold text-green-800">You’re in this group!</p>}
                </article>;
              })}
              {!organizations.length && !loading && <p className="rounded-xl bg-sky-50 p-4 text-slate-600">No groups yet. Start the first one below!</p>}
            </div>
          </div>

          <form className={card} onSubmit={createGroup}>
            <h2 className="text-xl font-bold">Start a group</h2>
            <p className="mt-1 text-slate-600">Make a friendly team for your next big build.</p>
            <label className="mt-4 block font-semibold" htmlFor="group-name">Group name</label>
            <input className={field} id="group-name" maxLength={80} minLength={3} onChange={(event) => setGroupName(event.target.value)} placeholder="e.g. Space Station Builders" required value={groupName} />
            <label className="mt-3 block font-semibold" htmlFor="group-focus">What will you build?</label>
            <input className={field} id="group-focus" maxLength={100} onChange={(event) => setGroupFocus(event.target.value)} placeholder="e.g. Space adventures" required value={groupFocus} />
            <label className="mt-3 block font-semibold" htmlFor="group-description">Group description <span className="font-normal text-slate-500">(optional)</span></label>
            <textarea className={field} id="group-description" maxLength={500} onChange={(event) => setGroupDescription(event.target.value)} placeholder="Tell builders what makes your group fun." rows={3} value={groupDescription} />
            <button className={`${button} mt-4 w-full`} disabled={working} type="submit">Create group</button>
          </form>
        </section>

        <section className={card}>
          <h2 className="text-xl font-bold">Plan a project</h2>
          <p className="mt-1 text-slate-600">Add a build idea for one of your groups.</p>
          {!myGroups.length ? <p className="mt-4 rounded-xl bg-sky-50 p-4">Join or create a group first to start a project.</p> : <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={createProject}>
            <label className="font-semibold">Project name<input className={`${field} mt-1`} maxLength={100} minLength={3} onChange={(event) => setProjectTitle(event.target.value)} placeholder="e.g. A dragon’s mountain home" required value={projectTitle} /></label>
            <label className="font-semibold">Group<select className={`${field} mt-1`} onChange={(event) => setProjectGroup(event.target.value)} required value={projectGroup}><option value="">Choose a group</option>{myGroups.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></label>
            <label className="font-semibold">Pieces to find <span className="font-normal text-slate-500">(separate with commas)</span><input className={`${field} mt-1`} maxLength={500} onChange={(event) => setProjectPieces(event.target.value)} placeholder="Blue bricks, wheels…" value={projectPieces} /></label>
            <label className="font-semibold">Target date <span className="font-normal text-slate-500">(optional)</span><input className={`${field} mt-1`} min={todayLocal()} onChange={(event) => setProjectDueDate(event.target.value)} type="date" value={projectDueDate} /></label>
            <button className={`${button} md:col-span-2`} disabled={working} type="submit">Add project</button>
          </form>}
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">Your group projects</h2>
          {!myGroups.length && <p className={`${card} text-slate-600`}>Join a group to see what everyone is building.</p>}
          {myGroups.map((organization) => <article className={card} key={organization.id}>
            <h3 className="text-lg font-bold">{organization.name}</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {projects.filter((project) => project.organization_id === organization.id).map((project) => <div className="rounded-2xl bg-sky-50 p-4" key={project.id}>
                <div className="flex flex-wrap items-start justify-between gap-2"><h4 className="font-bold">{project.title}</h4><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">{project.status}</span></div>
                <p className="mt-2 text-sm text-slate-600">Started by {project.owner_name}{project.due_date ? ` · Target ${project.due_date}` : ''}</p>
                {!!project.needed_pieces.length && <p className="mt-2 text-sm">Pieces to find: {project.needed_pieces.join(', ')}</p>}
                {project.created_by === user.id && <label className="mt-3 block text-sm font-semibold">Update project status<select className={`${field} mt-1`} onChange={(event) => void updateProjectStatus(project, event.target.value as Project['status'])} value={project.status}>{projectStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>}
              </div>)}
              {!projects.some((project) => project.organization_id === organization.id) && <p className="rounded-xl bg-sky-50 p-4 text-slate-600">No projects yet. Add the first idea!</p>}
            </div>
          </article>)}
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">Team chat</h2>
          <p className="text-sm text-slate-600">Keep it kind. Never share your full name, address, school, phone number, password, or other private information.</p>
          {!myGroups.length && <p className={`${card} text-slate-600`}>Join a group to chat with your team.</p>}
          {myGroups.map((organization) => <article className={card} key={organization.id}>
            <h3 className="text-lg font-bold">{organization.name}</h3>
            <div aria-live="polite" className="mt-3 max-h-80 space-y-2 overflow-y-auto">
              {messages.filter((message) => message.organization_id === organization.id).map((message) => <div className="rounded-xl bg-sky-50 p-3" key={message.id}><p className="text-xs font-bold text-sky-800">{message.sender_id === user.id ? username : 'Team builder'} · {new Date(message.created_at).toLocaleString()}</p><p className="break-words">{message.body}</p></div>)}
              {!messages.some((message) => message.organization_id === organization.id) && <p className="text-sm text-slate-500">No messages yet. Say hello and share a build idea!</p>}
            </div>
            <form className="mt-3 space-y-2" onSubmit={(event) => void sendMessage(event, organization.id)}>
              <label className="block font-semibold" htmlFor={`chat-${organization.id}`}>Write a group message</label>
              <textarea className={field} id={`chat-${organization.id}`} maxLength={500} onChange={(event) => setChatText((current) => ({ ...current, [organization.id]: event.target.value }))} placeholder="Share a build idea…" required rows={2} value={chatText[organization.id] ?? ''} />
              <button className={button} disabled={working} type="submit">Send message</button>
            </form>
          </article>)}
        </section>

        <section className={card}>
          <h2 className="text-xl font-bold">Plan a build day</h2>
          <p className="mt-1 text-slate-600">Pick a day and let your group know you want to build together.</p>
          {!myGroups.length ? <p className="mt-4 rounded-xl bg-sky-50 p-4">Join a group first to sign up for a build day.</p> : <div className="mt-4 space-y-3">
            <label className="block font-semibold" htmlFor="signup-date">Build day date</label>
            <input className={`${field} max-w-sm`} id="signup-date" min={todayLocal()} onChange={(event) => setSignupDate(event.target.value)} type="date" value={signupDate} />
            {myGroups.map((organization) => {
              const attendees = signups.filter((signup) => signup.organization_id === organization.id && signup.event_date === signupDate);
              const alreadyJoined = attendees.some((signup) => signup.user_id === user.id);
              const full = attendees.length >= 15;
              return <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-sky-50 p-4" key={organization.id}>
                <div><p className="font-bold">{organization.name}</p><p className="text-sm text-slate-600">{attendees.length} of 15 builders signed up</p></div>
                <button className={button} disabled={working || alreadyJoined || full || !signupDate} onClick={() => void signUpForEvent(organization.id)} type="button">{alreadyJoined ? 'You’re signed up!' : full ? 'Day is full' : 'Sign me up'}</button>
              </div>;
            })}
          </div>}
        </section>
        <footer className="pb-4 text-center text-xs text-slate-500">Build safely: be kind, keep personal details private, and ask a trusted adult if something online feels wrong.</footer>
      </div>
    </main>
  );
}
