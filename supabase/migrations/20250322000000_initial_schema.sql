-- AI Voice Receptionist — initial schema + RLS (Helion Voices MVP)
-- Apply with Supabase CLI or SQL editor.

-- -----------------------------------------------------------------------------
-- Extensions
-- -----------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Helper: updated_at trigger
-- -----------------------------------------------------------------------------
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
-- profiles (1:1 with auth.users)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_display_name_idx on public.profiles (display_name);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- organizations & membership
-- -----------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index organization_members_user_id_idx on public.organization_members (user_id);
create index organization_members_org_id_idx on public.organization_members (organization_id);

-- RPC: create org + owner membership (SECURITY DEFINER)
create or replace function public.create_organization_with_owner(
  org_name text,
  org_slug text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.organizations (name, slug, created_by)
  values (org_name, org_slug, auth.uid())
  returning id into new_org_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (new_org_id, auth.uid(), 'owner');

  return new_org_id;
end;
$$;

grant execute on function public.create_organization_with_owner(text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- RLS helper
-- -----------------------------------------------------------------------------
create or replace function public.is_org_member(check_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = check_org_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.org_role(check_org_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select m.role
  from public.organization_members m
  where m.organization_id = check_org_id
    and m.user_id = auth.uid()
  limit 1;
$$;

-- -----------------------------------------------------------------------------
-- receptionist_configs
-- -----------------------------------------------------------------------------
create table public.receptionist_configs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations (id) on delete cascade,
  greeting text,
  voice_provider text not null default 'vapi',
  webhook_secret text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger receptionist_configs_set_updated_at
  before update on public.receptionist_configs
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- call_sessions & call_events
-- -----------------------------------------------------------------------------
create table public.call_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  external_call_id text,
  provider text not null default 'unknown',
  status text not null default 'active',
  transcript text,
  summary text,
  raw_latest jsonb,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider, external_call_id)
);

create index call_sessions_org_id_idx on public.call_sessions (organization_id);
create index call_sessions_created_at_idx on public.call_sessions (created_at desc);

create trigger call_sessions_set_updated_at
  before update on public.call_sessions
  for each row execute function public.set_updated_at();

create table public.call_events (
  id uuid primary key default gen_random_uuid(),
  call_session_id uuid not null references public.call_sessions (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  event_type text not null,
  normalized jsonb not null default '{}'::jsonb,
  raw_payload jsonb not null,
  created_at timestamptz not null default now()
);

create index call_events_session_idx on public.call_events (call_session_id);
create index call_events_org_idx on public.call_events (organization_id);

-- -----------------------------------------------------------------------------
-- captured_leads & knowledge & usage
-- -----------------------------------------------------------------------------
create table public.captured_leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  call_session_id uuid references public.call_sessions (id) on delete set null,
  extracted jsonb not null default '{}'::jsonb,
  summary text,
  contact_email text,
  contact_phone text,
  created_at timestamptz not null default now()
);

create index captured_leads_org_idx on public.captured_leads (organization_id);

create table public.knowledge_snippets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  body text not null,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index knowledge_snippets_org_idx on public.knowledge_snippets (organization_id);

create trigger knowledge_snippets_set_updated_at
  before update on public.knowledge_snippets
  for each row execute function public.set_updated_at();

create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index usage_events_org_idx on public.usage_events (organization_id);

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.receptionist_configs enable row level security;
alter table public.call_sessions enable row level security;
alter table public.call_events enable row level security;
alter table public.captured_leads enable row level security;
alter table public.knowledge_snippets enable row level security;
alter table public.usage_events enable row level security;

-- profiles
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- organizations
create policy "Members can view organizations"
  on public.organizations for select
  using (public.is_org_member(id));

create policy "Authenticated users can create organizations"
  on public.organizations for insert
  with check (auth.uid() is not null and created_by = auth.uid());

create policy "Owners and admins can update organizations"
  on public.organizations for update
  using (public.org_role(id) in ('owner', 'admin'));

-- organization_members
create policy "Members can view membership rows for their orgs"
  on public.organization_members for select
  using (public.is_org_member(organization_id));

-- First owner row: creator only, org must have no members yet
create policy "Bootstrap first owner membership"
  on public.organization_members for insert
  with check (
    user_id = auth.uid()
    and role = 'owner'
    and exists (
      select 1 from public.organizations o
      where o.id = organization_members.organization_id
        and o.created_by = auth.uid()
        and not exists (
          select 1 from public.organization_members m
          where m.organization_id = o.id
        )
    )
  );

create policy "Owners and admins can invite members"
  on public.organization_members for insert
  with check (public.org_role(organization_id) in ('owner', 'admin'));

create policy "Owners and admins can remove members"
  on public.organization_members for delete
  using (public.org_role(organization_id) in ('owner', 'admin'));

create policy "Owners and admins can update members"
  on public.organization_members for update
  using (public.org_role(organization_id) in ('owner', 'admin'));

-- receptionist_configs
create policy "Members can view receptionist config"
  on public.receptionist_configs for select
  using (public.is_org_member(organization_id));

create policy "Admins can insert receptionist config"
  on public.receptionist_configs for insert
  with check (public.org_role(organization_id) in ('owner', 'admin'));

create policy "Admins can update receptionist config"
  on public.receptionist_configs for update
  using (public.org_role(organization_id) in ('owner', 'admin'));

create policy "Admins can delete receptionist config"
  on public.receptionist_configs for delete
  using (public.org_role(organization_id) in ('owner', 'admin'));

-- call_sessions & events & leads (read for members; writes via service role in webhooks)
create policy "Members can view call sessions"
  on public.call_sessions for select
  using (public.is_org_member(organization_id));

create policy "Members can view call events"
  on public.call_events for select
  using (public.is_org_member(organization_id));

create policy "Members can view captured leads"
  on public.captured_leads for select
  using (public.is_org_member(organization_id));

-- knowledge_snippets
create policy "Members can view knowledge"
  on public.knowledge_snippets for select
  using (public.is_org_member(organization_id));

create policy "Admins can insert knowledge"
  on public.knowledge_snippets for insert
  with check (public.org_role(organization_id) in ('owner', 'admin'));

create policy "Admins can update knowledge"
  on public.knowledge_snippets for update
  using (public.org_role(organization_id) in ('owner', 'admin'));

create policy "Admins can delete knowledge"
  on public.knowledge_snippets for delete
  using (public.org_role(organization_id) in ('owner', 'admin'));

-- usage_events
create policy "Members can view usage events"
  on public.usage_events for select
  using (public.is_org_member(organization_id));

-- Note: INSERT into call_sessions, call_events, captured_leads, usage_events
-- is performed with the Supabase service role in server-side webhook/simulation routes.
