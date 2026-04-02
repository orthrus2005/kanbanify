begin;

alter table public.boards
  add column if not exists owner_email text;

update public.boards b
set owner_email = lower(au.email)
from auth.users au
where b.user_id = au.id
  and (b.owner_email is null or b.owner_email = '');

commit;
