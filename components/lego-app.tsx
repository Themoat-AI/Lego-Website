'use client';

import { useMemo, useState } from 'react';
import { currentUser as initialCurrentUser, organizations as initialOrganizations, users as initialUsers } from '@/lib/mock-data';

type ChatDraft = {
  [key: string]: string;
};

export default function LegoApp() {
  const [currentUser, setCurrentUser] = useState(initialCurrentUser);
  const [users, setUsers] = useState(initialUsers);
  const [organizations, setOrganizations] = useState(initialOrganizations);
  const [username, setUsername] = useState('');
  const [orgName, setOrgName] = useState('');
  const [focus, setFocus] = useState('City scenes');
  const [description, setDescription] = useState('');
  const [selectedOrg, setSelectedOrg] = useState(initialOrganizations[0]?.id ?? '');
  const [chatDrafts, setChatDrafts] = useState<ChatDraft>({});
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'chat' | 'signups'>('overview');

  const selectedOrganization = useMemo(
    () => organizations.find((org) => org.id === selectedOrg) || organizations[0],
    [organizations, selectedOrg]
  );

  const todayKey = new Date().toISOString().slice(0, 10);
  const todaysSignupCount = selectedOrganization?.signups.find((entry) => entry.date === todayKey)?.attendees.length ?? 0;
  const signupSpaceLeft = Math.max((selectedOrganization?.dailySignupCap ?? 0) - todaysSignupCount, 0);

  const handleCreateUsername = () => {
    const cleaned = username.trim();
    if (!cleaned) return;

    setCurrentUser((prev) => ({ ...prev, username: cleaned }));
    setUsers((prev) => prev.map((user) => (user.id === currentUser.id ? { ...user, username: cleaned } : user)));
    setUsername('');
  };

  const handleCreateOrg = () => {
    if (!orgName.trim()) return;

    const newOrganization = {
      id: `org-${Date.now()}`,
      name: orgName.trim(),
      focus,
      description: description.trim() || 'A friendly team building amazing LEGO adventures together.',
      members: [currentUser.id],
      dailySignupCap: 15,
      signups: [],
      projects: [],
      chat: []
    };

    setOrganizations((prev) => [newOrganization, ...prev]);
    setCurrentUser((prev) => ({
      ...prev,
      organizationIds: prev.organizationIds.includes(newOrganization.id)
        ? prev.organizationIds
        : [...prev.organizationIds, newOrganization.id]
    }));
    setSelectedOrg(newOrganization.id);
    setOrgName('');
    setDescription('');
  };

  const handleSignUpForDay = () => {
    if (!selectedOrganization) return;
    if (signupSpaceLeft <= 0) {
      alert('This organization is full for today. Maximum is 15 signups per day.');
      return;
    }

    setOrganizations((prev) => prev.map((org) => {
      if (org.id !== selectedOrganization.id) return org;

      const existingEntry = org.signups.find((entry) => entry.date === todayKey);
      const nextAttendees = existingEntry ? [...existingEntry.attendees] : [];

      if (!nextAttendees.includes(currentUser.id)) {
        nextAttendees.push(currentUser.id);
      }

      const nextSignups = existingEntry
        ? org.signups.map((entry) => (entry.date === todayKey ? { ...entry, attendees: nextAttendees } : entry))
        : [{ date: todayKey, attendees: nextAttendees }, ...org.signups];

      return { ...org, signups: nextSignups };
    }));
  };

  const handleSendMessage = () => {
    const message = (chatDrafts[selectedOrganization?.id || ''] || '').trim();
    if (!message || !selectedOrganization) return;

    const newMessage = {
      id: `m-${Date.now()}`,
      sender: currentUser.username,
      text: message,
      timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    };

    setOrganizations((prev) => prev.map((org) => {
      if (org.id !== selectedOrganization.id) return org;

      const nextChat = [...org.chat];
      if (nextChat.length === 0) {
        nextChat.push({
          id: `c-${Date.now()}`,
          title: `${org.name} General`,
          messages: [newMessage]
        });
      } else {
        nextChat[0] = {
          ...nextChat[0],
          messages: [...nextChat[0].messages, newMessage]
        };
      }

      return { ...org, chat: nextChat };
    }));

    setChatDrafts((prev) => ({ ...prev, [selectedOrganization.id]: '' }));
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'projects', label: 'Projects' },
    { id: 'chat', label: 'Chat' },
    { id: 'signups', label: 'Signups' }
  ] as const;

  return (
    <main className="min-h-screen px-4 py-10 text-slate-800 md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[2rem] border border-sky-200 bg-white/80 p-6 shadow-lego backdrop-blur-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="mb-2 inline-flex rounded-full bg-yellow-200 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-sky-900">
                BrickBuddy League
              </p>
              <h1 className="text-4xl font-black tracking-tight text-sky-900 md:text-5xl">
                Build teamwork, one LEGO brick at a time.
              </h1>
            </div>
            <div className="flex gap-3">
              <span className="rounded-full bg-green-100 px-3 py-2 text-sm font-semibold text-green-700">
                Demo data enabled
              </span>
              <span className="rounded-full bg-orange-100 px-3 py-2 text-sm font-semibold text-orange-700">
                Live app ready
              </span>
            </div>
          </div>
        </header>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-[2rem] bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-700 p-6 text-white shadow-lego">
            <p className="mb-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em]">
              Kid friendly platform
            </p>
            <h2 className="text-3xl font-black md:text-4xl">Make a username. Start an organization. Build epic LEGO adventures.</h2>
            <p className="mt-4 max-w-xl text-base text-sky-100">
              Kids can create profiles, join LEGO clubs, manage projects, request missing pieces, and sign up for event days with a strict 15-person cap.
            </p>
            <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold">
              <span className="rounded-full bg-white/10 px-4 py-2">Username creation</span>
              <span className="rounded-full bg-white/10 px-4 py-2">Org management</span>
              <span className="rounded-full bg-white/10 px-4 py-2">Daily scheduling</span>
            </div>
          </div>

          <div className="rounded-[2rem] border border-sky-200 bg-white p-6 shadow-lego">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-sky-700">Signed in as</p>
            <div className="rounded-2xl bg-sky-50 p-4">
              <p className="text-2xl font-black text-sky-900">@{currentUser.username}</p>
              <p className="mt-1 text-sm text-slate-600">{currentUser.displayName} • {currentUser.ageGroup}</p>
            </div>
            <div className="mt-5 grid gap-3 text-sm text-slate-600">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <span>Organizations</span>
                <span className="font-black text-slate-900">{currentUser.organizationIds.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <span>Projects in progress</span>
                <span className="font-black text-slate-900">{organizations.reduce((sum, org) => sum + org.projects.length, 0)}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <span>Daily signup cap</span>
                <span className="font-black text-slate-900">15</span>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-sky-200 bg-white p-6 shadow-lego">
            <h3 className="text-2xl font-black text-sky-900">Create username</h3>
            <div className="mt-4 flex gap-3">
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Choose a username"
                className="w-full rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 outline-none ring-0 transition focus:border-sky-400"
              />
              <button onClick={handleCreateUsername} className="rounded-xl bg-sky-600 px-5 py-3 font-bold text-white transition hover:bg-sky-700">
                Save
              </button>
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              Username examples: <span className="font-bold text-slate-800">brickwizard</span>, <span className="font-bold text-slate-800">castlehero</span>, <span className="font-bold text-slate-800">tinyengineer</span>
            </div>
          </div>

          <div className="rounded-[2rem] border border-sky-200 bg-white p-6 shadow-lego">
            <h3 className="text-2xl font-black text-sky-900">Create organization</h3>
            <div className="mt-4 space-y-3">
              <input
                value={orgName}
                onChange={(event) => setOrgName(event.target.value)}
                placeholder="Organization name"
                className="w-full rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 outline-none focus:border-sky-400"
              />
              <select
                value={focus}
                onChange={(event) => setFocus(event.target.value)}
                className="w-full rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 outline-none focus:border-sky-400"
              >
                <option>City scenes</option>
                <option>Castle builds</option>
                <option>Space adventures</option>
                <option>Vehicle builds</option>
              </select>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe your Lego team goals"
                rows={3}
                className="w-full rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 outline-none focus:border-sky-400"
              />
              <button onClick={handleCreateOrg} className="w-full rounded-xl bg-yellow-400 px-5 py-3 font-black text-sky-900 transition hover:bg-yellow-300">
                Start organization
              </button>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-sky-200 bg-white p-6 shadow-lego">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">Organization dashboard</p>
              <h3 className="text-3xl font-black text-sky-900">Choose a team</h3>
            </div>
            <select
              value={selectedOrg}
              onChange={(event) => setSelectedOrg(event.target.value)}
              className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-sky-400"
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${activeTab === tab.id ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && selectedOrganization && (
            <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-3xl bg-sky-50 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">{selectedOrganization.focus}</p>
                <h4 className="mt-2 text-3xl font-black text-sky-900">{selectedOrganization.name}</h4>
                <p className="mt-3 text-slate-700">{selectedOrganization.description}</p>
                <div className="mt-5 flex flex-wrap gap-2 text-sm text-slate-700">
                  {selectedOrganization.members.map((memberId) => {
                    const member = users.find((user) => user.id === memberId);
                    return member ? (
                      <span key={member.id} className="rounded-full bg-white px-3 py-1 font-semibold shadow-sm">
                        @{member.username}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>

              <div className="rounded-3xl bg-gradient-to-br from-yellow-100 to-orange-100 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-700">Daily signups</p>
                <div className="mt-3 flex items-end justify-between">
                  <span className="text-4xl font-black text-slate-900">{todaysSignupCount}</span>
                  <span className="text-sm font-bold text-slate-700">/ {selectedOrganization.dailySignupCap}</span>
                </div>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/80">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 to-yellow-400"
                    style={{ width: `${Math.min((todaysSignupCount / selectedOrganization.dailySignupCap) * 100, 100)}%` }}
                  />
                </div>
                <p className="mt-4 text-sm text-slate-700">{signupSpaceLeft} spots left today</p>
              </div>
            </div>
          )}

          {activeTab === 'projects' && selectedOrganization && (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {selectedOrganization.projects.map((project) => (
                <div key={project.id} className="rounded-3xl border border-sky-200 bg-sky-50 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-xl font-black text-sky-900">{project.title}</h4>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold uppercase tracking-[0.12em] text-sky-700">
                      {project.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">Owner: <span className="font-bold text-slate-800">{project.owner}</span></p>
                  <p className="mt-1 text-sm text-slate-600">Due: {project.dueDate}</p>
                  <div className="mt-4">
                    <p className="mb-2 text-sm font-bold uppercase tracking-[0.16em] text-slate-600">Needed pieces</p>
                    <div className="flex flex-wrap gap-2">
                      {project.neededPieces.map((piece) => (
                        <span key={piece} className="rounded-full bg-yellow-200 px-3 py-1 text-xs font-bold text-sky-900">
                          {piece}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl bg-white p-3 text-sm text-slate-600">
                    {project.updates.map((update) => (
                      <p key={update} className="mb-2 last:mb-0">• {update}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'chat' && selectedOrganization && (
            <div className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-3xl bg-slate-50 p-5">
                {selectedOrganization.chat.map((thread) => (
                  <div key={thread.id} className="rounded-2xl bg-white p-4 shadow-sm">
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-sky-700">{thread.title}</p>
                    <div className="mt-3 space-y-3">
                      {thread.messages.map((message) => (
                        <div key={message.id} className="rounded-xl bg-sky-50 p-3">
                          <div className="flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                            <span>{message.sender}</span>
                            <span>{message.timestamp}</span>
                          </div>
                          <p className="mt-2 text-sm text-slate-700">{message.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-3xl bg-sky-50 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Send new message</p>
                <textarea
                  value={chatDrafts[selectedOrganization.id] || ''}
                  onChange={(event) =>
                    setChatDrafts((prev) => ({ ...prev, [selectedOrganization.id]: event.target.value }))
                  }
                  rows={6}
                  placeholder="Type a message to your organization..."
                  className="mt-3 w-full rounded-2xl border border-sky-200 bg-white p-4 text-slate-700 outline-none focus:border-sky-400"
                />
                <button onClick={handleSendMessage} className="mt-4 w-full rounded-xl bg-sky-600 px-5 py-3 font-bold text-white transition hover:bg-sky-700">
                  Send to chat
                </button>
              </div>
            </div>
          )}

          {activeTab === 'signups' && selectedOrganization && (
            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">Today</p>
                <h4 className="mt-2 text-3xl font-black text-sky-900">{todaysSignupCount} / {selectedOrganization.dailySignupCap} signups</h4>
                <div className="mt-4 h-4 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-green-400 via-yellow-400 to-orange-400"
                    style={{ width: `${Math.min((todaysSignupCount / selectedOrganization.dailySignupCap) * 100, 100)}%` }}
                  />
                </div>
                <button onClick={handleSignUpForDay} className="mt-6 w-full rounded-xl bg-yellow-400 px-5 py-3 font-black text-sky-900 transition hover:bg-yellow-300">
                  {signupSpaceLeft > 0 ? 'Sign up for this day' : 'At daily limit'}
                </button>
              </div>

              <div className="rounded-3xl bg-sky-50 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">Recent booking history</p>
                <div className="mt-4 space-y-3">
                  {selectedOrganization.signups.map((signup) => (
                    <div key={signup.date} className="rounded-2xl bg-white p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-bold text-slate-800">{signup.date}</span>
                        <span className="text-sm text-slate-600">{signup.attendees.length} people</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
