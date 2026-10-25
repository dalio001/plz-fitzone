-- PLZ Train (P4-11) Supabase schema for personal AI sync and remote MCP.
-- Run once in the Supabase SQL Editor.
-- Idempotent: safe to run multiple times.

-- 1. Main state table: single owner private state
create table if not exists plz_state (
  owner_hash text primary key,
  state jsonb not null default '{}'::jsonb,
  rev bigint not null default 0,
  updated_at timestamptz not null default now(),
  updated_by text not null default 'init',
  summary text
);

-- 2. State history table: stores up to the last 20 revisions for undo
create table if not exists plz_state_history (
  id bigint generated always as identity primary key,
  owner_hash text not null references plz_state(owner_hash) on delete cascade,
  rev bigint not null,
  state jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text not null,
  summary text
);

-- 3. Row Level Security (RLS)
-- Enabled on both tables with ZERO public policies.
-- Public/anon access via Supabase PostgREST is completely blocked.
-- Only Vercel serverless functions using SUPABASE_SERVICE_ROLE_KEY can read and write.
alter table plz_state enable row level security;
alter table plz_state_history enable row level security;

-- 4. Pruning trigger: automatically retain only the latest 20 history versions per owner
create or replace function prune_plz_state_history() returns trigger as $$
begin
  delete from plz_state_history
  where owner_hash = NEW.owner_hash
    and id not in (
      select id from plz_state_history
      where owner_hash = NEW.owner_hash
      order by rev desc
      limit 20
    );
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_prune_plz_state_history on plz_state_history;
create trigger trg_prune_plz_state_history
after insert on plz_state_history
for each row execute function prune_plz_state_history();
