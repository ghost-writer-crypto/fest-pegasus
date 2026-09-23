-- PEGASUS
-- Migration 008: Admin Team Penalty Operations, Reversal Audit, and RLS Policies
--
-- Objective:
-- 1. Add soft-reversal audit columns to public.team_penalties.
-- 2. Define performance indexes for festival team aggregation and active penalty queries.
-- 3. Define Public read and Admin write (INSERT, UPDATE) RLS policies on public.team_penalties.
-- 4. Grant table privileges to anon and authenticated roles.

-- ============================================================
-- 1. TEAM PENALTIES SCHEMA ENHANCEMENT
-- ============================================================

alter table public.team_penalties 
  add column if not exists is_reversed boolean not null default false,
  add column if not exists reversal_reason text,
  add column if not exists reversed_by uuid references auth.users(id) on delete set null,
  add column if not exists reversed_at timestamptz;

-- ============================================================
-- 2. INDEXES
-- ============================================================

create index if not exists team_penalties_festival_team_idx
  on public.team_penalties(festival_id, team_id);

create index if not exists team_penalties_festival_active_idx
  on public.team_penalties(festival_id, is_reversed);

create index if not exists team_penalties_event_idx
  on public.team_penalties(event_id)
  where event_id is not null;

-- ============================================================
-- 3. RLS ACTIVATION & PRIVILEGES
-- ============================================================

alter table public.team_penalties enable row level security;

grant select on public.team_penalties to anon, authenticated;
grant insert, update on public.team_penalties to authenticated;

-- ============================================================
-- 4. RLS POLICIES
-- ============================================================

drop policy if exists "Allow public read active festival team penalties" on public.team_penalties;
create policy "Allow public read active festival team penalties"
  on public.team_penalties
  for select
  using (
    exists (
      select 1 from public.festivals f
      where f.id = team_penalties.festival_id
        and f.is_active = true
    )
  );

drop policy if exists "Allow admins to insert team penalties" on public.team_penalties;
create policy "Allow admins to insert team penalties"
  on public.team_penalties
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

drop policy if exists "Allow admins to update team penalties" on public.team_penalties;
create policy "Allow admins to update team penalties"
  on public.team_penalties
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

