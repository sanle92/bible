-- 0008_platform_operations.sql
-- Merged: platform settings / API keys, system monitoring, backups.

-- =================================================================================
-- Platform Settings & API Keys
-- =================================================================================

create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users (id) on delete set null
);

comment on table public.platform_settings is 'Key/value platform configuration settings.';

create table if not exists public.api_keys (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  key_hash text not null,
  prefix text not null,
  scopes text[] not null default '{}',
  last_used_at timestamptz,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked boolean not null default false
);

comment on table public.api_keys is 'API keys for third-party integrations.';

alter table public.platform_settings enable row level security;
alter table public.api_keys enable row level security;

drop policy if exists "Admins can view platform settings" on public.platform_settings;
create policy "Admins can view platform settings" on public.platform_settings for select to authenticated using (auth.uid() in (select user_id from public.user_roles where role in ('super', 'admin')));

drop policy if exists "Super admins can manage platform settings" on public.platform_settings;
create policy "Super admins can manage platform settings" on public.platform_settings for all to authenticated using (auth.uid() in (select user_id from public.user_roles where role = 'super'));

drop policy if exists "Admins can view api keys" on public.api_keys;
create policy "Admins can view api keys" on public.api_keys for select to authenticated using (auth.uid() in (select user_id from public.user_roles where role in ('super', 'admin')));

drop policy if exists "Super admins can manage api keys" on public.api_keys;
create policy "Super admins can manage api keys" on public.api_keys for all to authenticated using (auth.uid() in (select user_id from public.user_roles where role = 'super'));

insert into public.platform_settings (key, value) values
  ('general', '{"appName": "Bible App", "supportEmail": "support@bible.app", "defaultLanguage": "en", "timezone": "UTC"}'::jsonb),
  ('branding', '{"primaryColor": "#4f46e5", "logoUrl": "", "faviconUrl": ""}'::jsonb),
  ('maintenance', '{"enabled": false, "message": "We are performing scheduled maintenance."}'::jsonb),
  ('email', '{"provider": "smtp", "from": "noreply@bible.app", "smtpHost": "", "smtpPort": 587, "smtpUser": "", "smtpPassword": ""}'::jsonb),
  ('push', '{"provider": "firebase", "fcmServerKey": ""}'::jsonb),
  ('storage', '{"provider": "supabase", "maxFileSizeMb": 50, "allowedTypes": ["image", "pdf", "audio", "video", "document"]}'::jsonb),
  ('security', '{"mfaRequired": false, "sessionTimeoutMinutes": 60, "passwordMinLength": 8, "requirePasswordChangeDays": 90}'::jsonb),
  ('backups', '{"enabled": true, "frequency": "daily", "retentionDays": 30, "lastBackupAt": null}'::jsonb),
  ('integrations', '{"googleAnalyticsId": "", "sentryDsn": "", "stripePublicKey": ""}'::jsonb)
on conflict (key) do nothing;

-- =================================================================================
-- System Monitoring
-- =================================================================================

create table if not exists public.system_health_checks (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  status text not null check (status in ('healthy', 'degraded', 'unhealthy')),
  response_time_ms int,
  message text,
  checked_at timestamptz not null default now()
);

comment on table public.system_health_checks is 'Latest status of platform health checks.';

create table if not exists public.background_jobs (
  id uuid primary key default uuid_generate_v4(),
  queue text not null default 'default',
  job_type text not null,
  payload jsonb,
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed', 'retrying')),
  attempts int not null default 0,
  max_attempts int not null default 3,
  error_message text,
  run_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.background_jobs is 'Background job queue and history.';

create table if not exists public.error_logs (
  id uuid primary key default uuid_generate_v4(),
  service text not null,
  message text not null,
  stack text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

comment on table public.error_logs is 'Application error logs.';

-- Indexes
create index if not exists idx_health_checks_name on public.system_health_checks (name, checked_at desc);
create index if not exists idx_background_jobs_status on public.background_jobs (status, run_at);
create index if not exists idx_background_jobs_queue on public.background_jobs (queue, status);
create index if not exists idx_error_logs_service on public.error_logs (service, created_at desc);

-- RLS
alter table public.system_health_checks enable row level security;
alter table public.background_jobs enable row level security;
alter table public.error_logs enable row level security;

drop policy if exists "Super admins can view health checks" on public.system_health_checks;
create policy "Super admins can view health checks" on public.system_health_checks for select to authenticated using (auth.uid() in (select user_id from public.user_roles where role in ('super', 'admin')));

drop policy if exists "Super admins can manage health checks" on public.system_health_checks;
create policy "Super admins can manage health checks" on public.system_health_checks for all to authenticated using (auth.uid() in (select user_id from public.user_roles where role = 'super'));

drop policy if exists "Super admins can view background jobs" on public.background_jobs;
create policy "Super admins can view background jobs" on public.background_jobs for select to authenticated using (auth.uid() in (select user_id from public.user_roles where role in ('super', 'admin')));

drop policy if exists "Super admins can manage background jobs" on public.background_jobs;
create policy "Super admins can manage background jobs" on public.background_jobs for all to authenticated using (auth.uid() in (select user_id from public.user_roles where role = 'super'));

drop policy if exists "Super admins can view error logs" on public.error_logs;
create policy "Super admins can view error logs" on public.error_logs for select to authenticated using (auth.uid() in (select user_id from public.user_roles where role in ('super', 'admin')));

drop policy if exists "Super admins can manage error logs" on public.error_logs;
create policy "Super admins can manage error logs" on public.error_logs for all to authenticated using (auth.uid() in (select user_id from public.user_roles where role = 'super'));

-- =================================================================================
-- Backups
-- =================================================================================

create table if not exists public.backups (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null default 'manual' check (type in ('automatic', 'manual')),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'failed')),
  size_bytes bigint,
  storage_path text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_by uuid references public.users (id) on delete set null,
  metadata jsonb
);

comment on table public.backups is 'Backup history and restore points.';

create index if not exists idx_backups_status on public.backups (status, started_at desc);

alter table public.backups enable row level security;

drop policy if exists "Admins can view backups" on public.backups;
create policy "Admins can view backups" on public.backups for select to authenticated using (auth.uid() in (select user_id from public.user_roles where role in ('super', 'admin')));

drop policy if exists "Super admins can manage backups" on public.backups;
create policy "Super admins can manage backups" on public.backups for all to authenticated using (auth.uid() in (select user_id from public.user_roles where role = 'super'));
