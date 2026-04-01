begin;

create or replace function public.user_exists_by_email(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from auth.users
    where lower(email) = lower(coalesce(p_email, ''))
  );
$$;

grant execute on function public.user_exists_by_email(text) to anon, authenticated, service_role;

commit;
