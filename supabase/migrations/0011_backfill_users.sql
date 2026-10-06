-- 0011_backfill_users.sql
-- User content tables have a foreign key to public.users(id). That row is
-- normally created by the on_auth_user_created trigger. If an account was
-- created before the trigger existed (or the trigger is missing), inserts into
-- notes/highlights/etc. fail with a foreign key violation and nothing syncs.
-- This migration backfills public.users (and profiles) from auth.users and
-- re-asserts the trigger so future signups are covered.

-- Backfill users mirror from auth.users.
insert into public.users (id, email, provider, created_at, updated_at)
select
  au.id,
  au.email,
  coalesce(nullif(au.raw_app_meta_data->>'provider', ''), 'email'),
  now(),
  now()
from auth.users au
on conflict (id) do nothing;

-- Backfill a profile row for any user that is missing one.
insert into public.profiles (user_id, display_name)
select
  u.id,
  coalesce(
    nullif(au.raw_user_meta_data->>'full_name', ''),
    nullif(au.raw_user_meta_data->>'name', ''),
    nullif(split_part(au.email, '@', 1), ''),
    'User'
  )
from public.users u
join auth.users au on au.id = u.id
where not exists (
  select 1 from public.profiles p where p.user_id = u.id and p.deleted_at is null
);

-- Re-assert the trigger so future auth signups always create a public.users row.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
