-- 0007_access_audit_and_security.sql
-- Merged: roles/permissions, audit logs, security center (2FA, sessions, login history, rate limits).

-- =================================================================================
-- Roles and Permissions
-- =================================================================================

create table if not exists public.roles (
  id uuid primary key default uuid_generate_v4(),
  key text not null unique,
  name text not null,
  description text,
  is_system boolean not null default false,
  is_custom boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.roles is 'Admin and platform roles.';

create table if not exists public.permissions (
  id uuid primary key default uuid_generate_v4(),
  key text not null unique,
  name text not null,
  category text not null,
  description text
);

comment on table public.permissions is 'Individual permissions that can be assigned to roles.';

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles (id) on delete cascade,
  permission_id uuid not null references public.permissions (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

comment on table public.role_permissions is 'Many-to-many mapping of roles to permissions.';

insert into public.roles (key, name, description, is_system, is_custom) values
  ('super', 'Super Admin', 'Full platform access', true, false),
  ('admin', 'Administrator', 'Manage users and content', true, false),
  ('editor', 'Editor', 'Create and edit content', true, false),
  ('translator', 'Translator', 'Manage Bible translations', true, false),
  ('support', 'Support', 'View users and help with issues', true, false),
  ('moderator', 'Moderator', 'Moderate community content', true, false),
  ('author', 'Author', 'Create articles and notes', true, false)
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  is_system = excluded.is_system;

insert into public.permissions (key, name, category, description) values
  ('users:read', 'View Users', 'Users', 'View user list and profiles'),
  ('users:write', 'Manage Users', 'Users', 'Edit users, roles, and status'),
  ('content:read', 'View Content', 'Content', 'View notes, sermons, highlights'),
  ('content:write', 'Manage Content', 'Content', 'Create, edit, delete content'),
  ('translations:write', 'Manage Translations', 'Translations', 'Upload and manage Bible translations'),
  ('community:moderate', 'Moderate Community', 'Community', 'Approve/reject public notes, comments, reports'),
  ('notifications:send', 'Send Notifications', 'Notifications', 'Send push/email/in-app notifications'),
  ('media:manage', 'Manage Media', 'Media', 'Upload and organize media files'),
  ('analytics:read', 'View Analytics', 'Analytics', 'View product analytics and reports'),
  ('settings:read', 'View Settings', 'Settings', 'View platform settings'),
  ('settings:write', 'Manage Settings', 'Settings', 'Edit platform settings and roles')
on conflict (key) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description;

with role_map as (
  select id, key from public.roles where key in ('super', 'admin', 'editor', 'translator', 'support', 'moderator', 'author')
),
perm_map as (
  select id, key from public.permissions
)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from role_map r, perm_map p
where (r.key = 'super')
   or (r.key = 'admin' and p.key in ('users:read', 'users:write', 'content:read', 'content:write', 'community:moderate', 'notifications:send', 'media:manage', 'analytics:read', 'settings:read'))
   or (r.key = 'editor' and p.key in ('content:read', 'content:write', 'media:manage'))
   or (r.key = 'translator' and p.key in ('translations:write', 'content:read'))
   or (r.key = 'support' and p.key in ('users:read', 'content:read'))
   or (r.key = 'moderator' and p.key in ('community:moderate', 'content:read'))
   or (r.key = 'author' and p.key in ('content:read', 'content:write'))
on conflict do nothing;

alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;

drop policy if exists "Roles are viewable by admins" on public.roles;
create policy "Roles are viewable by admins" on public.roles for select to authenticated using (auth.uid() in (select user_id from public.user_roles where role in ('super', 'admin')));

drop policy if exists "Super admins can manage roles" on public.roles;
create policy "Super admins can manage roles" on public.roles for all to authenticated using (auth.uid() in (select user_id from public.user_roles where role = 'super'));

drop policy if exists "Permissions are viewable by admins" on public.permissions;
create policy "Permissions are viewable by admins" on public.permissions for select to authenticated using (auth.uid() in (select user_id from public.user_roles where role in ('super', 'admin')));

drop policy if exists "Super admins can manage permissions" on public.permissions;
create policy "Super admins can manage permissions" on public.permissions for all to authenticated using (auth.uid() in (select user_id from public.user_roles where role = 'super'));

drop policy if exists "Role permissions are viewable by admins" on public.role_permissions;
create policy "Role permissions are viewable by admins" on public.role_permissions for select to authenticated using (auth.uid() in (select user_id from public.user_roles where role in ('super', 'admin')));

drop policy if exists "Super admins can manage role permissions" on public.role_permissions;
create policy "Super admins can manage role permissions" on public.role_permissions for all to authenticated using (auth.uid() in (select user_id from public.user_roles where role = 'super'));

drop trigger if exists trg_roles_updated_at on public.roles;
create trigger trg_roles_updated_at
  before update on public.roles
  for each row execute function public.update_updated_at_column();

-- =================================================================================
-- Audit Logs
-- =================================================================================

create table if not exists public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users (id) on delete set null,
  action text not null check (action in ('login', 'logout', 'create', 'update', 'delete', 'publish', 'unpublish', 'import', 'export', 'disable', 'enable', 'approve', 'reject', 'schedule', 'send_notification')),
  target_type text,
  target_id text,
  target_name text,
  details jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

comment on table public.audit_logs is 'Audit trail of user and admin actions.';

create index if not exists idx_audit_logs_user on public.audit_logs (user_id, created_at);
create index if not exists idx_audit_logs_action on public.audit_logs (action, created_at);
create index if not exists idx_audit_logs_target on public.audit_logs (target_type, target_id);
create index if not exists idx_audit_logs_created_at on public.audit_logs (created_at desc);

alter table public.audit_logs enable row level security;

drop policy if exists "Admins can view audit logs" on public.audit_logs;
create policy "Admins can view audit logs" on public.audit_logs for select to authenticated using (auth.uid() in (select user_id from public.user_roles where role in ('super', 'admin')));

drop policy if exists "Authenticated users can insert their own audit logs" on public.audit_logs;
create policy "Authenticated users can insert their own audit logs" on public.audit_logs for insert to authenticated with check (auth.uid() = user_id);

-- =================================================================================
-- Security Center
-- =================================================================================

create table if not exists public.user_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  device_name text,
  device_type text,
  ip_address text,
  user_agent text,
  started_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  revoked boolean not null default false
);

comment on table public.user_sessions is 'Active user sessions.';

create table if not exists public.login_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users (id) on delete cascade,
  ip_address text,
  user_agent text,
  status text not null default 'success' check (status in ('success', 'failed', 'blocked')),
  created_at timestamptz not null default now()
);

comment on table public.login_history is 'Login attempts history.';

create table if not exists public.rate_limits (
  id uuid primary key default uuid_generate_v4(),
  key text not null unique,
  window_seconds int not null default 60,
  max_requests int not null default 100,
  created_at timestamptz not null default now()
);

comment on table public.rate_limits is 'Rate limiting rules per endpoint/key.';

insert into public.rate_limits (key, window_seconds, max_requests) values
  ('login', 300, 10),
  ('register', 3600, 5),
  ('api_general', 60, 100)
on conflict (key) do update set
  window_seconds = excluded.window_seconds,
  max_requests = excluded.max_requests;

create index if not exists idx_user_sessions_user on public.user_sessions (user_id, revoked);
create index if not exists idx_login_history_user on public.login_history (user_id, created_at desc);

alter table public.user_sessions enable row level security;
alter table public.login_history enable row level security;
alter table public.rate_limits enable row level security;

drop policy if exists "Admins can view user sessions" on public.user_sessions;
create policy "Admins can view user sessions" on public.user_sessions for select to authenticated using (auth.uid() in (select user_id from public.user_roles where role in ('super', 'admin')));

drop policy if exists "Admins can manage user sessions" on public.user_sessions;
create policy "Admins can manage user sessions" on public.user_sessions for all to authenticated using (auth.uid() in (select user_id from public.user_roles where role in ('super', 'admin')));

drop policy if exists "Admins can view login history" on public.login_history;
create policy "Admins can view login history" on public.login_history for select to authenticated using (auth.uid() in (select user_id from public.user_roles where role in ('super', 'admin')));

drop policy if exists "Admins can view rate limits" on public.rate_limits;
create policy "Admins can view rate limits" on public.rate_limits for select to authenticated using (auth.uid() in (select user_id from public.user_roles where role in ('super', 'admin')));

drop policy if exists "Super admins can manage rate limits" on public.rate_limits;
create policy "Super admins can manage rate limits" on public.rate_limits for all to authenticated using (auth.uid() in (select user_id from public.user_roles where role = 'super'));
