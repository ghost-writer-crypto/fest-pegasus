-- PEGASUS
-- Migration 001: Core Foundation
-- Domain → Rules → State → Operations → Data → UI

create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

create type public.point_class as enum ('W', 'X', 'Y', 'Z');

create type public.participant_status as enum (
  'registered',
  'confirmed',
  'withdrawn',
  'disqualified'
);

create type public.registration_status as enum (
  'draft',
  'submitted',
  'approved',
  'withdrawn',
  'rejected'
);

create type public.competition_format as enum (
  'final',
  'heats',
  'knockout',
  'round_robin',
  'match'
);

create type public.fixture_status as enum (
  'scheduled',
  'live',
  'finished',
  'cancelled'
);

create type public.schedule_status as enum (
  'scheduled',
  'live',
  'delayed',
  'postponed',
  'venue_changed',
  'finished',
  'cancelled'
);

create type public.result_status as enum (
  'draft',
  'submitted',
  'verified',
  'published',
  'corrected'
);

create type public.result_disposition as enum (
  'normal',
  'dns',
  'dnf',
  'dq'
);

create type public.profile_role as enum (
  'admin',
  'judge',
  'team_manager',
  'desk_operator',
  'guest'
);

-- ============================================================
-- FESTIVAL
-- ============================================================

create table public.festivals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  starts_at timestamptz,
  ends_at timestamptz,
  registration_deadline timestamptz,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- DIVISIONS
-- ============================================================

create table public.divisions (
  id uuid primary key default gen_random_uuid(),
  festival_id uuid not null references public.festivals(id) on delete cascade,
  code text not null,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),

  unique (festival_id, code),
  unique (festival_id, name)
);

-- ============================================================
-- SPORTS
-- ============================================================

create table public.sports (
  id uuid primary key default gen_random_uuid(),
  festival_id uuid not null references public.festivals(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),

  unique (festival_id, slug)
);

-- ============================================================
-- CODEX EVENTS
-- Authoritative event/rule configuration
-- ============================================================

create table public.codex_events (
  id uuid primary key default gen_random_uuid(),
  festival_id uuid not null references public.festivals(id) on delete cascade,
  sport_id uuid references public.sports(id) on delete set null,
  code text not null,
  name text not null,
  point_class public.point_class,
  competition_type text,
  scoring_engine text,
  rules jsonb not null default '{}'::jsonb,
  is_confirmed boolean not null default true,
  created_at timestamptz not null default now(),

  unique (festival_id, code)
);

-- ============================================================
-- EVENTS
-- ============================================================

create table public.events (
  id uuid primary key default gen_random_uuid(),
  festival_id uuid not null references public.festivals(id) on delete cascade,
  sport_id uuid not null references public.sports(id) on delete restrict,
  codex_event_id uuid references public.codex_events(id) on delete set null,
  code text not null,
  name text not null,
  point_class public.point_class,
  competition_type text,
  scoring_engine text,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (festival_id, code)
);

-- ============================================================
-- EVENT ↔ DIVISION
-- ============================================================

create table public.event_divisions (
  event_id uuid not null references public.events(id) on delete cascade,
  division_id uuid not null references public.divisions(id) on delete cascade,

  primary key (event_id, division_id)
);

-- ============================================================
-- EVENT QUOTAS
-- ============================================================

create table public.event_quotas (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  division_id uuid references public.divisions(id) on delete cascade,
  minimum_count integer,
  maximum_count integer,
  substitutes_count integer not null default 0,
  rules jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  check (minimum_count is null or minimum_count >= 0),
  check (maximum_count is null or maximum_count >= 0),
  check (substitutes_count >= 0),
  check (
    minimum_count is null
    or maximum_count is null
    or minimum_count <= maximum_count
  )
);

-- ============================================================
-- TEAMS
-- ============================================================

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  festival_id uuid not null references public.festivals(id) on delete cascade,
  code text not null,
  name text not null,
  color text,
  logo_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (festival_id, code),
  unique (festival_id, name)
);

-- ============================================================
-- PARTICIPANTS
-- ============================================================

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  festival_id uuid not null references public.festivals(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  division_id uuid references public.divisions(id) on delete restrict,
  public_id text not null,
  chest_number text,
  name text not null,
  profile_image_url text,
  status public.participant_status not null default 'registered',

  -- Private fields
  phone text,
  email text,
  date_of_birth date,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (festival_id, public_id)
);

-- ============================================================
-- REGISTRATIONS
-- ============================================================

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  festival_id uuid not null references public.festivals(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  division_id uuid references public.divisions(id) on delete restrict,
  status public.registration_status not null default 'draft',
  seed_number integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (participant_id, event_id)
);

-- ============================================================
-- VENUES
-- ============================================================

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  festival_id uuid not null references public.festivals(id) on delete cascade,
  name text not null,
  slug text not null,
  location text,
  capacity integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  unique (festival_id, slug)
);

-- ============================================================
-- COMPETITIONS
-- ============================================================

create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  festival_id uuid not null references public.festivals(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  division_id uuid references public.divisions(id) on delete restrict,
  name text not null,
  format public.competition_format not null,
  status text not null default 'scheduled',
  round_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- FIXTURES
-- ============================================================

create table public.fixtures (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  home_team_id uuid references public.teams(id) on delete set null,
  away_team_id uuid references public.teams(id) on delete set null,
  scheduled_at timestamptz,
  venue_id uuid references public.venues(id) on delete set null,
  status public.fixture_status not null default 'scheduled',
  score_home numeric,
  score_away numeric,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- SCHEDULES
-- ============================================================

create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  festival_id uuid not null references public.festivals(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  competition_id uuid references public.competitions(id) on delete cascade,
  fixture_id uuid references public.fixtures(id) on delete cascade,
  venue_id uuid references public.venues(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status public.schedule_status not null default 'scheduled',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (ends_at is null or ends_at >= starts_at)
);

-- ============================================================
-- RESULTS
-- ============================================================

create table public.results (
  id uuid primary key default gen_random_uuid(),
  festival_id uuid not null references public.festivals(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete restrict,
  competition_id uuid references public.competitions(id) on delete set null,
  fixture_id uuid references public.fixtures(id) on delete set null,
  participant_id uuid references public.participants(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,

  rank integer,
  points numeric not null default 0,
  performance jsonb not null default '{}'::jsonb,
  disposition public.result_disposition not null default 'normal',
  status public.result_status not null default 'draft',

  is_official boolean not null default false,

  submitted_by uuid references auth.users(id) on delete set null,
  verified_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- RESULT AUDIT
-- ============================================================

create table public.result_audit_entries (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references public.results(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  reason text,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- TEAM PENALTIES
-- ============================================================

create table public.team_penalties (
  id uuid primary key default gen_random_uuid(),
  festival_id uuid not null references public.festivals(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  points numeric not null,
  reason text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),

  check (points <> 0)
);

-- ============================================================
-- PROFILES
-- Linked to Supabase Auth
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role public.profile_role not null default 'guest',
  team_id uuid references public.teams(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index divisions_festival_idx
  on public.divisions(festival_id);

create index sports_festival_idx
  on public.sports(festival_id);

create index codex_events_festival_idx
  on public.codex_events(festival_id);

create index events_festival_idx
  on public.events(festival_id);

create index events_sport_idx
  on public.events(sport_id);

create index teams_festival_idx
  on public.teams(festival_id);

create index participants_festival_idx
  on public.participants(festival_id);

create index participants_team_idx
  on public.participants(team_id);

create index participants_division_idx
  on public.participants(division_id);

create index registrations_event_idx
  on public.registrations(event_id);

create index registrations_participant_idx
  on public.registrations(participant_id);

create index competitions_event_idx
  on public.competitions(event_id);

create index fixtures_competition_idx
  on public.fixtures(competition_id);

create index schedules_starts_at_idx
  on public.schedules(starts_at);

create index results_event_idx
  on public.results(event_id);

create index results_competition_idx
  on public.results(competition_id);

create index results_team_idx
  on public.results(team_id);

create index results_participant_idx
  on public.results(participant_id);

create index result_audit_result_idx
  on public.result_audit_entries(result_id);

create index penalties_team_idx
  on public.team_penalties(team_id);

-- ============================================================
-- RLS
-- ============================================================

alter table public.festivals enable row level security;
alter table public.divisions enable row level security;
alter table public.sports enable row level security;
alter table public.codex_events enable row level security;
alter table public.events enable row level security;
alter table public.event_divisions enable row level security;
alter table public.event_quotas enable row level security;
alter table public.teams enable row level security;
alter table public.participants enable row level security;
alter table public.registrations enable row level security;
alter table public.venues enable row level security;
alter table public.competitions enable row level security;
alter table public.fixtures enable row level security;
alter table public.schedules enable row level security;
alter table public.results enable row level security;
alter table public.result_audit_entries enable row level security;
alter table public.team_penalties enable row level security;
alter table public.profiles enable row level security;

-- ============================================================
-- PUBLIC READ POLICIES
-- Only public-safe data is exposed.
-- Published results only.
-- ============================================================

create policy "public can view active festivals"
on public.festivals
for select
using (is_active = true);

create policy "public can view divisions"
on public.divisions
for select
using (
  exists (
    select 1
    from public.festivals f
    where f.id = divisions.festival_id
      and f.is_active = true
  )
);

create policy "public can view sports"
on public.sports
for select
using (
  exists (
    select 1
    from public.festivals f
    where f.id = sports.festival_id
      and f.is_active = true
  )
);

create policy "public can view events"
on public.events
for select
using (
  exists (
    select 1
    from public.festivals f
    where f.id = events.festival_id
      and f.is_active = true
  )
);

create policy "public can view teams"
on public.teams
for select
using (
  exists (
    select 1
    from public.festivals f
    where f.id = teams.festival_id
      and f.is_active = true
  )
);

create policy "public can view public participant fields"
on public.participants
for select
using (
  exists (
    select 1
    from public.festivals f
    where f.id = participants.festival_id
      and f.is_active = true
  )
);

create policy "public can view published results"
on public.results
for select
using (
  status = 'published'
  and exists (
    select 1
    from public.festivals f
    where f.id = results.festival_id
      and f.is_active = true
  )
);

create policy "public can view schedules"
on public.schedules
for select
using (
  exists (
    select 1
    from public.festivals f
    where f.id = schedules.festival_id
      and f.is_active = true
  )
);

create policy "public can view venues"
on public.venues
for select
using (
  exists (
    select 1
    from public.festivals f
    where f.id = venues.festival_id
      and f.is_active = true
  )
);

create policy "public can view competitions"
on public.competitions
for select
using (
  exists (
    select 1
    from public.festivals f
    where f.id = competitions.festival_id
      and f.is_active = true
  )
);

create policy "public can view fixtures"
on public.fixtures
for select
using (
  exists (
    select 1
    from public.competitions c
    join public.festivals f on f.id = c.festival_id
    where c.id = fixtures.competition_id
      and f.is_active = true
  )
);

-- ============================================================
-- AUTHENTICATED PROFILE
-- ============================================================

create policy "users can view own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "users can update own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- ============================================================
-- TIMESTAMP TRIGGER
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger festivals_updated_at
before update on public.festivals
for each row execute function public.set_updated_at();

create trigger events_updated_at
before update on public.events
for each row execute function public.set_updated_at();

create trigger teams_updated_at
before update on public.teams
for each row execute function public.set_updated_at();

create trigger participants_updated_at
before update on public.participants
for each row execute function public.set_updated_at();

create trigger registrations_updated_at
before update on public.registrations
for each row execute function public.set_updated_at();

create trigger competitions_updated_at
before update on public.competitions
for each row execute function public.set_updated_at();

create trigger fixtures_updated_at
before update on public.fixtures
for each row execute function public.set_updated_at();

create trigger schedules_updated_at
before update on public.schedules
for each row execute function public.set_updated_at();

create trigger results_updated_at
before update on public.results
for each row execute function public.set_updated_at();

create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();
