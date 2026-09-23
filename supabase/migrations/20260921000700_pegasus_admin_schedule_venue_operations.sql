-- PEGASUS
-- Migration 007: Admin Schedule & Venue Operations, RLS Policies, and Schedule History
--
-- Objective:
-- 1. Add is_active column to public.venues (default true).
-- 2. Create public.schedule_change_entries for immutable operational schedule audit history.
-- 3. Define Admin RLS policies (INSERT, UPDATE, DELETE) on public.venues.
-- 4. Define Admin RLS policies (INSERT, UPDATE, DELETE) on public.schedules.
-- 5. Define Admin RLS policies on public.schedule_change_entries.
-- 6. Grant appropriate table privileges to authenticated role.

-- ============================================================
-- 1. VENUES SCHEMA ENHANCEMENT
-- ============================================================

alter table public.venues 
add column if not exists is_active boolean not null default true;

-- ============================================================
-- 2. SCHEDULE CHANGE HISTORY TABLE
-- ============================================================

create table if not exists public.schedule_change_entries (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  reason text,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now()
);

create index if not exists schedule_changes_schedule_idx
  on public.schedule_change_entries(schedule_id);

create index if not exists schedule_changes_created_at_idx
  on public.schedule_change_entries(created_at desc);

-- ============================================================
-- 3. RLS ACTIVATION & PRIVILEGES
-- ============================================================

alter table public.schedule_change_entries enable row level security;

grant insert, update, delete on public.venues to authenticated;
grant insert, update, delete on public.schedules to authenticated;
grant select, insert on public.schedule_change_entries to authenticated;

-- ============================================================
-- 4. VENUES ADMIN RLS POLICIES
-- ============================================================

drop policy if exists "admins can insert venues" on public.venues;
create policy "admins can insert venues"
on public.venues
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

drop policy if exists "admins can update venues" on public.venues;
create policy "admins can update venues"
on public.venues
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

drop policy if exists "admins can delete venues" on public.venues;
create policy "admins can delete venues"
on public.venues
for delete
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.is_active = true
  )
);

-- ============================================================
-- 5. SCHEDULES ADMIN RLS POLICIES
-- ============================================================

drop policy if exists "admins can insert schedules" on public.schedules;
create policy "admins can insert schedules"
on public.schedules
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

drop policy if exists "admins can update schedules" on public.schedules;
create policy "admins can update schedules"
on public.schedules
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

drop policy if exists "admins can delete schedules" on public.schedules;
create policy "admins can delete schedules"
on public.schedules
for delete
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.is_active = true
  )
);

-- ============================================================
-- 6. SCHEDULE CHANGE HISTORY RLS POLICIES
-- ============================================================

drop policy if exists "admins can view schedule changes" on public.schedule_change_entries;
create policy "admins can view schedule changes"
on public.schedule_change_entries
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

drop policy if exists "admins can insert schedule changes" on public.schedule_change_entries;
create policy "admins can insert schedule changes"
on public.schedule_change_entries
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

