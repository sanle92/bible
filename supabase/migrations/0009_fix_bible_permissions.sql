-- 0009_fix_bible_permissions.sql
-- Grant table-level privileges on Bible reference tables. RLS policies alone are
-- not enough: the Postgres role must also have the corresponding privileges on
-- the table. Without these grants the client gets "permission denied" and the
-- reader app appears to have no real Bible data.

grant usage on schema public to anon, authenticated, service_role;

do $$
declare
  bible_tables text[] := array['bible_books', 'bible_chapters', 'bible_verses', 'bible_translations'];
  tbl text;
begin
  foreach tbl in array bible_tables loop
    if to_regclass(quote_ident('public.' || tbl)) is not null then
      execute format('grant select on table public.%I to anon, authenticated, service_role', tbl);
      execute format('grant insert, update, delete on table public.%I to service_role', tbl);
    end if;
  end loop;
end;
$$;

grant all privileges on all sequences in schema public to service_role;
