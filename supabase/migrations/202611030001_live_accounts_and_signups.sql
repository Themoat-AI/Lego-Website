-- Live accounts, organizations, and event signups. Apply this migration in Supabase.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (char_length(username) between 3 and 24),
  created_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  focus text not null,
  description text not null default '' check (char_length(description) <= 500),
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists public.daily_signups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  event_date date not null,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id, event_date)
);

create index if not exists daily_signups_org_date_idx
  on public.daily_signups (organization_id, event_date);

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.daily_signups enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "Authenticated users can view organizations" on public.organizations;
create policy "Authenticated users can view organizations" on public.organizations
  for select to authenticated using (true);
drop policy if exists "Users can create organizations as themselves" on public.organizations;
create policy "Users can create organizations as themselves" on public.organizations
  for insert to authenticated with check (owner_id = (select auth.uid()));

drop policy if exists "Authenticated users can view memberships" on public.organization_members;
create policy "Authenticated users can view memberships" on public.organization_members
  for select to authenticated using (true);
drop policy if exists "Organization owners can add members" on public.organization_members;
create policy "Organization owners can add members" on public.organization_members
  for insert to authenticated with check (
    user_id = (select auth.uid()) and exists (
      select 1 from public.organizations
      where organizations.id = organization_id and organizations.owner_id = (select auth.uid())
    )
  );

-- Keep creator membership in sync even if an organization is created outside this UI.
create or replace function public.add_organization_owner_as_member()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.organization_members (organization_id, user_id)
  values (new.id, new.owner_id)
  on conflict do nothing;
  return new;
end;
$$;
drop trigger if exists organization_owner_membership on public.organizations;
create trigger organization_owner_membership
  after insert on public.organizations
  for each row execute function public.add_organization_owner_as_member();

drop policy if exists "Authenticated users can view signup records" on public.daily_signups;
create policy "Authenticated users can view signup records" on public.daily_signups
  for select to authenticated using (true);

-- The function serializes signup attempts per organization/date so concurrent requests
-- cannot exceed the 15-person daily limit. Authenticated users can only sign up as themselves.
create or replace function public.signup_for_event(p_organization_id uuid, p_event_date date)
returns void language plpgsql security definer set search_path = '' as $$
declare
  current_user_id uuid := auth.uid();
  signup_total integer;
begin
  if current_user_id is null then
    raise exception 'Sign in is required to sign up.';
  end if;
  if p_event_date < current_date then
    raise exception 'You cannot sign up for a past date.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text || ':' || p_event_date::text, 0));

  if not exists (select 1 from public.organizations where id = p_organization_id) then
    raise exception 'Organization not found.';
  end if;
  if exists (
    select 1 from public.daily_signups
    where organization_id = p_organization_id and user_id = current_user_id and event_date = p_event_date
  ) then
    raise exception 'You are already signed up for this day.';
  end if;

  select count(*) into signup_total from public.daily_signups
  where organization_id = p_organization_id and event_date = p_event_date;
  if signup_total >= 15 then
    raise exception 'This organization is full for that day.';
  end if;

  insert into public.daily_signups (organization_id, user_id, event_date)
  values (p_organization_id, current_user_id, p_event_date);
end;
$$;
revoke all on function public.signup_for_event(uuid, date) from public;
grant execute on function public.signup_for_event(uuid, date) to authenticated;

grant select, insert, update on public.profiles to authenticated;
grant select, insert on public.organizations to authenticated;
grant select, insert on public.organization_members to authenticated;
grant select on public.daily_signups to authenticated;

-- Create a profile for new email/password accounts using the chosen username.
create or replace function public.create_profile_for_new_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  chosen_username text;
begin
  chosen_username := nullif(trim(new.raw_user_meta_data ->> 'username'), '');
  if chosen_username is not null and char_length(chosen_username) between 3 and 24 then
    insert into public.profiles (id, username) values (new.id, chosen_username)
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists create_profile_after_auth_signup on auth.users;
create trigger create_profile_after_auth_signup
  after insert on auth.users
  for each row execute function public.create_profile_for_new_auth_user();
