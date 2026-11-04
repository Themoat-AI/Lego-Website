-- Repair and complete the live app database permissions/actions. Apply this migration after
-- the existing migrations in supabase/migrations, then reload PostgREST's schema cache.

-- Keep client-visible table permissions explicit; row-level security remains the authority.
grant select, insert on public.organizations to authenticated;
grant select, insert on public.organization_members to authenticated;
grant select on public.daily_signups to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert on public.chat_messages to authenticated;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.daily_signups enable row level security;
alter table public.projects enable row level security;
alter table public.chat_messages enable row level security;

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

drop policy if exists "Authenticated users can view signup records" on public.daily_signups;
create policy "Authenticated users can view signup records" on public.daily_signups
  for select to authenticated using (true);

drop policy if exists "Members can view organization projects" on public.projects;
create policy "Members can view organization projects" on public.projects for select to authenticated
  using (exists (select 1 from public.organization_members m where m.organization_id = projects.organization_id and m.user_id = (select auth.uid())));
drop policy if exists "Members can create organization projects" on public.projects;
create policy "Members can create organization projects" on public.projects for insert to authenticated
  with check (created_by = (select auth.uid()) and exists (select 1 from public.organization_members m where m.organization_id = projects.organization_id and m.user_id = (select auth.uid())));
drop policy if exists "Members can update organization projects" on public.projects;
create policy "Members can update organization projects" on public.projects for update to authenticated
  using (created_by = (select auth.uid()) and exists (select 1 from public.organization_members m where m.organization_id = projects.organization_id and m.user_id = (select auth.uid())))
  with check (created_by = (select auth.uid()) and exists (select 1 from public.organization_members m where m.organization_id = projects.organization_id and m.user_id = (select auth.uid())));
drop policy if exists "Members can delete organization projects" on public.projects;
create policy "Members can delete organization projects" on public.projects for delete to authenticated
  using (created_by = (select auth.uid()) and exists (select 1 from public.organization_members m where m.organization_id = projects.organization_id and m.user_id = (select auth.uid())));

drop policy if exists "Members can view organization chat" on public.chat_messages;
create policy "Members can view organization chat" on public.chat_messages for select to authenticated
  using (exists (select 1 from public.organization_members m where m.organization_id = chat_messages.organization_id and m.user_id = (select auth.uid())));
drop policy if exists "Members can send organization chat" on public.chat_messages;
create policy "Members can send organization chat" on public.chat_messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and char_length(body) between 1 and 500 and exists (select 1 from public.organization_members m where m.organization_id = chat_messages.organization_id and m.user_id = (select auth.uid())));

create or replace function public.join_organization(p_organization_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'Sign in is required to join a group.'; end if;
  if not exists (select 1 from public.organizations where id = p_organization_id) then raise exception 'Group not found.'; end if;
  insert into public.organization_members (organization_id, user_id)
  values (p_organization_id, current_user_id) on conflict do nothing;
end;
$$;
revoke all on function public.join_organization(uuid) from public;
grant execute on function public.join_organization(uuid) to authenticated;

create or replace function public.signup_for_event(p_organization_id uuid, p_event_date date)
returns void language plpgsql security definer set search_path = '' as $$
declare
  current_user_id uuid := auth.uid();
  signup_total integer;
begin
  if current_user_id is null then raise exception 'Sign in is required to sign up.'; end if;
  if p_event_date is null or p_event_date < current_date then raise exception 'Choose today or a future date.'; end if;
  if not exists (select 1 from public.organization_members where organization_id = p_organization_id and user_id = current_user_id) then
    raise exception 'Join this group before signing up.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text || ':' || p_event_date::text, 0));
  if exists (select 1 from public.daily_signups where organization_id = p_organization_id and user_id = current_user_id and event_date = p_event_date) then
    raise exception 'You are already signed up for this day.';
  end if;
  select count(*) into signup_total from public.daily_signups where organization_id = p_organization_id and event_date = p_event_date;
  if signup_total >= 15 then raise exception 'This group is full for that day.'; end if;
  insert into public.daily_signups (organization_id, user_id, event_date) values (p_organization_id, current_user_id, p_event_date);
end;
$$;
revoke all on function public.signup_for_event(uuid, date) from public;
grant execute on function public.signup_for_event(uuid, date) to authenticated;

notify pgrst, 'reload schema';
