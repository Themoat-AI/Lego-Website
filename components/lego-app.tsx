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
