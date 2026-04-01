begin;

alter table public.columns
  add column if not exists creator_email text;

alter table public.tasks
  add column if not exists creator_email text;

update public.columns c
set creator_email = lower(au.email)
from auth.users au
where c.user_id = au.id
  and c.creator_email is null;

update public.tasks t
set creator_email = lower(au.email)
from auth.users au
where t.user_id = au.id
  and t.creator_email is null;

commit;
