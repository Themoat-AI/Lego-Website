import type { Organization, User } from '@/lib/types';

// Intentionally empty: the app must use authenticated Supabase records, never demo data.
export const currentUser: User | null = null;
export const users: User[] = [];
export const organizations: Organization[] = [];
