begin;

create extension if not exists pgcrypto;

alter table public.boards
  add column if not exists share_id uuid;

alter table public.boards
  add column if not exists is_public boolean not null default false;

alter table public.boards
  alter column share_id set default gen_random_uuid();

update public.boards
set share_id = gen_random_uuid()
where share_id is null;

alter table public.boards
  alter column share_id set not null;

create unique index if not exists boards_share_id_uidx
  on public.boards(share_id);

create table if not exists public.board_members (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  email text not null,
  invited_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists board_members_board_email_uidx
  on public.board_members(board_id, email);

create index if not exists board_members_board_id_idx
  on public.board_members(board_id);

create index if not exists board_members_email_idx
  on public.board_members(lower(email));

do $$
begin
  alter publication supabase_realtime add table public.boards;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.board_members;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.columns;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.tasks;
exception
  when duplicate_object then null;
end $$;

create or replace function public.current_user_email()
returns text
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.can_view_board(p_board_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.boards b
    where b.id = p_board_id
      and (
        b.is_public = true
        or b.user_id = auth.uid()
        or exists (
          select 1
          from public.board_members bm
          where bm.board_id = b.id
            and lower(bm.email) = public.current_user_email()
        )
      )
  );
$$;

create or replace function public.can_edit_board(p_board_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.boards b
    where b.id = p_board_id
      and (
        b.user_id = auth.uid()
        or exists (
          select 1
          from public.board_members bm
          where bm.board_id = b.id
            and lower(bm.email) = public.current_user_email()
        )
      )
  );
$$;

alter table public.boards enable row level security;
alter table public.board_members enable row level security;
alter table public.columns enable row level security;
alter table public.tasks enable row level security;

drop policy if exists "boards_select_public_or_member" on public.boards;
create policy "boards_select_public_or_member"
on public.boards
for select
using (public.can_view_board(id));

drop policy if exists "boards_insert_owner" on public.boards;
create policy "boards_insert_owner"
on public.boards
for insert
with check (auth.uid() = user_id);

drop policy if exists "boards_update_owner" on public.boards;
create policy "boards_update_owner"
on public.boards
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "boards_delete_owner" on public.boards;
create policy "boards_delete_owner"
on public.boards
for delete
using (auth.uid() = user_id);

drop policy if exists "board_members_select_visible_board" on public.board_members;
create policy "board_members_select_visible_board"
on public.board_members
for select
using (public.can_view_board(board_id));

drop policy if exists "board_members_insert_owner" on public.board_members;
create policy "board_members_insert_owner"
on public.board_members
for insert
with check (
  exists (
    select 1
    from public.boards b
    where b.id = board_id
      and b.user_id = auth.uid()
  )
);

drop policy if exists "board_members_update_owner" on public.board_members;
create policy "board_members_update_owner"
on public.board_members
for update
using (
  exists (
    select 1
    from public.boards b
    where b.id = board_id
      and b.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.boards b
    where b.id = board_id
      and b.user_id = auth.uid()
  )
);

drop policy if exists "board_members_delete_owner" on public.board_members;
create policy "board_members_delete_owner"
on public.board_members
for delete
using (
  exists (
    select 1
    from public.boards b
    where b.id = board_id
      and b.user_id = auth.uid()
  )
);

drop policy if exists "columns_select_visible_board" on public.columns;
create policy "columns_select_visible_board"
on public.columns
for select
using (public.can_view_board(board_id));

drop policy if exists "columns_insert_editable_board" on public.columns;
create policy "columns_insert_editable_board"
on public.columns
for insert
with check (public.can_edit_board(board_id) and auth.uid() = user_id);

drop policy if exists "columns_update_editable_board" on public.columns;
create policy "columns_update_editable_board"
on public.columns
for update
using (public.can_edit_board(board_id))
with check (public.can_edit_board(board_id));

drop policy if exists "columns_delete_editable_board" on public.columns;
create policy "columns_delete_editable_board"
on public.columns
for delete
using (public.can_edit_board(board_id));

drop policy if exists "tasks_select_visible_board" on public.tasks;
create policy "tasks_select_visible_board"
on public.tasks
for select
using (
  exists (
    select 1
    from public.columns c
    where c.id = column_id
      and public.can_view_board(c.board_id)
  )
);

drop policy if exists "tasks_insert_editable_board" on public.tasks;
create policy "tasks_insert_editable_board"
on public.tasks
for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.columns c
    where c.id = column_id
      and public.can_edit_board(c.board_id)
  )
);

drop policy if exists "tasks_update_editable_board" on public.tasks;
create policy "tasks_update_editable_board"
on public.tasks
for update
using (
  exists (
    select 1
    from public.columns c
    where c.id = column_id
      and public.can_edit_board(c.board_id)
  )
)
with check (
  exists (
    select 1
    from public.columns c
    where c.id = column_id
      and public.can_edit_board(c.board_id)
  )
);

drop policy if exists "tasks_delete_editable_board" on public.tasks;
create policy "tasks_delete_editable_board"
on public.tasks
for delete
using (
  exists (
    select 1
    from public.columns c
    where c.id = column_id
      and public.can_edit_board(c.board_id)
  )
);

commit;
