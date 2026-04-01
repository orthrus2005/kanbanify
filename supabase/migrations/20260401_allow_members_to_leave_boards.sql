begin;

drop policy if exists "board_members_delete_owner" on public.board_members;
drop policy if exists "board_members_delete_owner_or_self" on public.board_members;

create policy "board_members_delete_owner_or_self"
on public.board_members
for delete
using (
  public.is_board_owner(board_id)
  or lower(email) = public.current_user_email()
);

commit;
