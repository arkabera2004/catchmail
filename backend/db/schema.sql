-- CatchMail database schema
-- Run this in the Supabase SQL editor (or `supabase db execute`) once per project.
-- The backend connects with the service-role key exclusively, so RLS policies
-- below deliberately deny the anon/authenticated roles entirely — every read and
-- write goes through the Express API, never directly from the browser.

create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  picture text,
  google_refresh_token_enc text,
  plan text not null default 'free' check (plan in ('free', 'paid')),
  paused boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  task_text text not null,
  deadline timestamptz,
  source_email_id text not null,
  source_email_link text,
  source_email_subject text,
  source_email_sender text,
  confidence text check (confidence in ('high', 'medium', 'low')),
  status text not null default 'open' check (status in ('open', 'done')),
  calendar_event_id text,
  created_at timestamptz not null default now(),
  unique (user_id, source_email_id, task_text)
);

create table if not exists sync_state (
  user_id uuid primary key references users(id) on delete cascade,
  last_history_id text,
  last_synced_at timestamptz
);

create table if not exists subscriptions (
  user_id uuid primary key references users(id) on delete cascade,
  razorpay_subscription_id text,
  status text,
  current_period_end timestamptz
);

create index if not exists idx_tasks_user_id on tasks(user_id);
create index if not exists idx_tasks_created_at on tasks(created_at);

alter table users enable row level security;
alter table tasks enable row level security;
alter table sync_state enable row level security;
alter table subscriptions enable row level security;

-- Deny all direct client access (anon + authenticated). Only the service role
-- (used solely by the backend) can read/write; service role bypasses RLS.
create policy "deny_all_users" on users for all to anon, authenticated using (false);
create policy "deny_all_tasks" on tasks for all to anon, authenticated using (false);
create policy "deny_all_sync_state" on sync_state for all to anon, authenticated using (false);
create policy "deny_all_subscriptions" on subscriptions for all to anon, authenticated using (false);
