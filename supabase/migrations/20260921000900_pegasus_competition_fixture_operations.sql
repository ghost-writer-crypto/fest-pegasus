-- PEGASUS
-- Migration 009: Admin Competition & Fixture Operations, RLS Policies, and Change History
--
-- Objective:
-- 1. Create public.competition_change_entries for immutable operational competition/fixture audit history.
-- 2. Define Admin RLS policies (INSERT, UPDATE) on public.competitions.
-- 3. Define Admin RLS policies (INSERT, UPDATE) on public.fixtures.
-- 4. Define Admin RLS policies on public.competition_change_entries.
-- 5. Grant appropriate table privileges to authenticated and anon roles.
-- 6. Add performance indexes for competition and fixture queries.

-- ============================================================
-- 1. COMPETITION CHANGE HISTORY TABLE
-- ============================================================

create table if not exists public.competition_change_entries (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  fixture_id uuid references public.fixtures(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  reason text,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now()
);

create index if not exists competition_changes_competition_idx
  on public.competition_change_entries(competition_id);

create index if not exists competition_changes_fixture_idx
  on public.competition_change_entries(fixture_id)
  where fixture_id is not null;

create index if not exists competition_changes_created_at_idx
  on public.competition_change_entries(created_at desc);

-- ============================================================
-- 2. PERFORMANCE INDEXES
-- ============================================================

create index if not exists competitions_festival_idx
  on public.competitions(festival_id);

create index if not exists competitions_event_division_idx
  on public.competitions(festival_id, event_id, division_id);

create index if not exists fixtures_competition_idx
  on public.fixtures(competition_id);

create index if not exists fixtures_venue_idx
  on public.fixtures(venue_id)
  where venue_id is not null;

create index if not exists fixtures_status_idx
  on public.fixtures(status);

-- ============================================================
-- 3. RLS ACTIVATION & PRIVILEGES
-- ============================================================

alter table public.competitions enable row level security;
alter table public.fixtures enable row level security;
alter table public.competition_change_entries enable row level security;

-- Grants
grant select on public.competitions to anon, authenticated;
grant insert, update on public.competitions to authenticated;

grant select on public.fixtures to anon, authenticated;
grant insert, update on public.fixtures to authenticated;

grant select, insert on public.competition_change_entries to authenticated;

-- ============================================================
-- 4. COMPETITIONS RLS POLICIES
-- ============================================================

drop policy if exists "Allow admins to insert competitions" on public.competitions;
create policy "Allow admins to insert competitions"
  on public.competitions
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.is_active = true
    )
  );

drop policy if exists "Allow admins to update competitions" on public.competitions;
create policy "Allow admins to update competitions"
  on public.competitions
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.is_active = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.is_active = true
    )
  );

-- ============================================================
-- 5. FIXTURES RLS POLICIES
-- ============================================================

drop policy if exists "Allow admins to insert fixtures" on public.fixtures;
create policy "Allow admins to insert fixtures"
  on public.fixtures
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.is_active = true
    )
  );

drop policy if exists "Allow admins to update fixtures" on public.fixtures;
create policy "Allow admins to update fixtures"
  on public.fixtures
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.is_active = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.is_active = true
    )
  );

-- ============================================================
-- 6. COMPETITION CHANGE ENTRIES RLS POLICIES
-- ============================================================

drop policy if exists "Allow admins to read competition change entries" on public.competition_change_entries;
create policy "Allow admins to read competition change entries"
  on public.competition_change_entries
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.is_active = true
    )
  );

drop policy if exists "Allow admins to insert competition change entries" on public.competition_change_entries;
create policy "Allow admins to insert competition change entries"
  on public.competition_change_entries
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.is_active = true
    )
  );

