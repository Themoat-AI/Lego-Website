-- Ensure the organization join RPC exists even for projects that applied only the base migration.
-- Keep this signature in sync with components/lego-app.tsx and refresh PostgREST's schema cache.
create or replace function public.join_organization(p_organization_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Sign in is required to join an organization.';
  end if;

  if not exists (
    select 1
    from public.organizations
    where id = p_organization_id
  ) then
    raise exception 'Organization not found.';
  end if;

  insert into public.organization_members (organization_id, user_id)
  values (p_organization_id, current_user_id)
  on conflict do nothing;
end;
$$;

revoke all on function public.join_organization(uuid) from public;
grant execute on function public.join_organization(uuid) to authenticated;

-- Tell PostgREST to discover the function immediately after this migration is applied.
notify pgrst, 'reload schema';
