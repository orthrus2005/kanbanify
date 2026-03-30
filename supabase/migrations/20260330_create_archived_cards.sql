begin;

create extension if not exists pgcrypto;

create table if not exists public.archived_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (item_type in ('task', 'inbox')),
  source_id uuid not null,
  board_id uuid null references public.boards(id) on delete cascade,
  column_id uuid null references public.columns(id) on delete set null,
  title text not null,
  description text not null default '',
  due_date timestamptz null,
  color text null,
  archived_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (item_type, source_id)
);

create index if not exists archived_cards_user_id_idx
  on public.archived_cards(user_id);

create index if not exists archived_cards_board_type_idx
  on public.archived_cards(board_id, item_type);

create index if not exists archived_cards_archived_at_idx
  on public.archived_cards(archived_at desc);

alter table public.archived_cards enable row level security;

drop policy if exists "archived_cards_select_own" on public.archived_cards;
create policy "archived_cards_select_own"
on public.archived_cards
for select
using (auth.uid() = user_id);

drop policy if exists "archived_cards_insert_own" on public.archived_cards;
create policy "archived_cards_insert_own"
on public.archived_cards
for insert
with check (auth.uid() = user_id);

drop policy if exists "archived_cards_update_own" on public.archived_cards;
create policy "archived_cards_update_own"
on public.archived_cards
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "archived_cards_delete_own" on public.archived_cards;
create policy "archived_cards_delete_own"
on public.archived_cards
for delete
using (auth.uid() = user_id);

commit;
