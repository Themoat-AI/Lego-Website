-- Add persistent projects and organization chat to the authenticated app.
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  status text not null default 'Planning' check (status in ('Planning', 'Building', 'Ready to Share')),
  owner_name text not null,
  due_date date,
  needed_pieces text[] not null default '{}',
  updates text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists projects_org_created_idx on public.projects(organization_id, created_at desc);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_org_created_idx on public.chat_messages(organization_id, created_at);

alter table public.projects enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "Members can view organization projects" on public.projects;
create policy "Members can view organization projects" on public.projects for select to authenticated
  using (exists (select 1 from public.organization_members m where m.organization_id = projects.organization_id and m.user_id = (select auth.uid())));
drop policy if exists "Members can create organization projects" on public.projects;
create policy "Members can create organization projects" on public.projects for insert to authenticated
  with check (created_by = (select auth.uid()) and exists (select 1 from public.organization_members m where m.organization_id = projects.organization_id and m.user_id = (select auth.uid())));
drop policy if exists "Members can update organization projects" on public.projects;
create policy "Members can update organization projects" on public.projects for update to authenticated
  using (exists (select 1 from public.organization_members m where m.organization_id = projects.organization_id and m.user_id = (select auth.uid())))
  with check (exists (select 1 from public.organization_members m where m.organization_id = projects.organization_id and m.user_id = (select auth.uid())));
drop policy if exists "Members can delete organization projects" on public.projects;
create policy "Members can delete organization projects" on public.projects for delete to authenticated
  using (exists (select 1 from public.organization_members m where m.organization_id = projects.organization_id and m.user_id = (select auth.uid())));

drop policy if exists "Members can view organization chat" on public.chat_messages;
create policy "Members can view organization chat" on public.chat_messages for select to authenticated
  using (exists (select 1 from public.organization_members m where m.organization_id = chat_messages.organization_id and m.user_id = (select auth.uid())));
drop policy if exists "Members can send organization chat" on public.chat_messages;
create policy "Members can send organization chat" on public.chat_messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and exists (select 1 from public.organization_members m where m.organization_id = chat_messages.organization_id and m.user_id = (select auth.uid())));
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert on public.chat_messages to authenticated;

-- Let authenticated users join a discoverable club. This inserts only their own membership.
create or replace function public.join_organization(p_organization_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'Sign in is required to join an organization.'; end if;
  if not exists (select 1 from public.organizations where id = p_organization_id) then raise exception 'Organization not found.'; end if;
  insert into public.organization_members(organization_id, user_id)
  values (p_organization_id, current_user_id) on conflict do nothing;
end;
$$;
revoke all on function public.join_organization(uuid) from public;
grant execute on function public.join_organization(uuid) to authenticated;

-- Require club membership and preserve the 15-person daily cap transactionally.
create or replace function public.signup_for_event(p_organization_id uuid, p_event_date date)
returns void language plpgsql security definer set search_path = '' as $$
declare
  current_user_id uuid := auth.uid();
  signup_total integer;
begin
  if current_user_id is null then raise exception 'Sign in is required to sign up.'; end if;
  if p_event_date < current_date then raise exception 'You cannot sign up for a past date.'; end if;
  if not exists (select 1 from public.organization_members where organization_id = p_organization_id and user_id = current_user_id) then
    raise exception 'Join this organization before signing up.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text || ':' || p_event_date::text, 0));
  if exists (select 1 from public.daily_signups where organization_id = p_organization_id and user_id = current_user_id and event_date = p_event_date) then
    raise exception 'You are already signed up for this day.';
  end if;
  select count(*) into signup_total from public.daily_signups where organization_id = p_organization_id and event_date = p_event_date;
  if signup_total >= 15 then raise exception 'This organization is full for that day.'; end if;
  insert into public.daily_signups (organization_id, user_id, event_date) values (p_organization_id, current_user_id, p_event_date);
end;
$$;
revoke all on function public.signup_for_event(uuid, date) from public;
grant execute on function public.signup_for_event(uuid, date) to authenticated;
