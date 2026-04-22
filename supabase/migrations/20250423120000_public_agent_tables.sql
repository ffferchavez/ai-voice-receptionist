-- Voice agent tables in public (PostgREST default schema).
-- Use this when the Supabase API does not expose a custom schema (e.g. "voices"),
-- which otherwise yields: Invalid schema: voices

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- agent_configs
-- -----------------------------------------------------------------------------
create table if not exists public.agent_configs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  system_prompt text not null,
  voice_provider text not null default 'elevenlabs',
  voice_id text,
  settings jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agent_configs_org_id_idx on public.agent_configs (organization_id);
create index if not exists agent_configs_updated_at_idx on public.agent_configs (updated_at desc);

drop trigger if exists agent_configs_set_updated_at on public.agent_configs;
create trigger agent_configs_set_updated_at
  before update on public.agent_configs
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- agent_branches
-- -----------------------------------------------------------------------------
create table if not exists public.agent_branches (
  id uuid primary key default gen_random_uuid(),
  agent_config_id uuid not null references public.agent_configs (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  slug text not null,
  traffic_percent int not null default 0 check (traffic_percent >= 0 and traffic_percent <= 100),
  is_live boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agent_config_id, slug)
);

create index if not exists agent_branches_org_id_idx on public.agent_branches (organization_id);
create index if not exists agent_branches_agent_id_idx on public.agent_branches (agent_config_id);

drop trigger if exists agent_branches_set_updated_at on public.agent_branches;
create trigger agent_branches_set_updated_at
  before update on public.agent_branches
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- agent_publish_events
-- -----------------------------------------------------------------------------
create table if not exists public.agent_publish_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  agent_config_id uuid not null references public.agent_configs (id) on delete cascade,
  branch_id uuid not null references public.agent_branches (id) on delete cascade,
  branch_slug text not null,
  branch_name text not null,
  actor_user_id uuid references auth.users (id) on delete set null,
  actor_name text,
  traffic_snapshot jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists agent_publish_events_org_id_idx on public.agent_publish_events (organization_id);
create index if not exists agent_publish_events_agent_id_idx on public.agent_publish_events (agent_config_id);

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.agent_configs enable row level security;
alter table public.agent_branches enable row level security;
alter table public.agent_publish_events enable row level security;

drop policy if exists "Members can select agent_configs" on public.agent_configs;
create policy "Members can select agent_configs"
  on public.agent_configs for select
  using (public.is_org_member(organization_id));

drop policy if exists "Members can insert agent_configs" on public.agent_configs;
create policy "Members can insert agent_configs"
  on public.agent_configs for insert
  with check (public.is_org_member(organization_id));

drop policy if exists "Members can update agent_configs" on public.agent_configs;
create policy "Members can update agent_configs"
  on public.agent_configs for update
  using (public.is_org_member(organization_id));

drop policy if exists "Members can delete agent_configs" on public.agent_configs;
create policy "Members can delete agent_configs"
  on public.agent_configs for delete
  using (public.is_org_member(organization_id));

drop policy if exists "Members can select agent_branches" on public.agent_branches;
create policy "Members can select agent_branches"
  on public.agent_branches for select
  using (public.is_org_member(organization_id));

drop policy if exists "Members can insert agent_branches" on public.agent_branches;
create policy "Members can insert agent_branches"
  on public.agent_branches for insert
  with check (public.is_org_member(organization_id));

drop policy if exists "Members can update agent_branches" on public.agent_branches;
create policy "Members can update agent_branches"
  on public.agent_branches for update
  using (public.is_org_member(organization_id));

drop policy if exists "Members can delete agent_branches" on public.agent_branches;
create policy "Members can delete agent_branches"
  on public.agent_branches for delete
  using (public.is_org_member(organization_id));

drop policy if exists "Members can select agent_publish_events" on public.agent_publish_events;
create policy "Members can select agent_publish_events"
  on public.agent_publish_events for select
  using (public.is_org_member(organization_id));

drop policy if exists "Members can insert agent_publish_events" on public.agent_publish_events;
create policy "Members can insert agent_publish_events"
  on public.agent_publish_events for insert
  with check (public.is_org_member(organization_id));
