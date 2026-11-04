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
type ChatMessage = { id: string; body: string; created_at: string; sender_id: string; profiles?: { username: string }[] | null };
type Signup = { id: string; event_date: string; created_at: string; user_id: string };

const today = () => new Date().toISOString().slice(0, 10);
const card = 'rounded-3xl border border-sky-200 bg-white p-6 shadow-lego';
const field = 'w-full rounded-xl border border-sky-200 bg-sky-50 px-4 py-3';

export default function LegoApp() {
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
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              className="rounded-xl bg-sky-600 px-6 py-3 font-bold text-white transition hover:bg-sky-700"
              href="#get-started"
            >
              Get started
            </a>
            <a
              className="rounded-xl border border-sky-200 px-6 py-3 font-bold text-sky-800 transition hover:bg-sky-100"
              href="#how-it-works"
            >
              Learn more
            </a>
          </div>
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

        <p id="get-started" className="mt-8 text-center text-sm text-slate-500">
          BrickBuddy League — where every great build starts with an idea.
        </p>
      </div>
    </main>
  );
}
