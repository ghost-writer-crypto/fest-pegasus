-- PEGASUS
-- Migration 003: Judge Identity & Assignment Security Hardening
--
-- Objective:
-- 1. Establish the authoritative public.judge_assignments relational table
--    linking authenticated judge profiles to official festival events and fixtures.
-- 2. Implement strict, minimum Row Level Security (RLS) policies for:
--    - public.judge_assignments
--    - public.results (judges can only read/insert/update draft results for assigned events)
--    - public.result_audit_entries (actor_id must strictly match authenticated user)
--
-- Security Invariants:
-- - Judges CANNOT verify, publish, or modify verified/published results.
-- - Results status is frozen on submit (status = 'submitted').
-- - Client-side judge IDs or names can never grant authorization.
-- - Zero exposure of private participant fields.

-- ============================================================
-- 1. JUDGE ASSIGNMENT STATUS ENUM
-- ============================================================

create type public.judge_assignment_status as enum (
  'assigned',
  'in_progress',
  'submitted',
  'completed'
);

-- ============================================================
-- 2. JUDGE ASSIGNMENTS TABLE
-- ============================================================

create table public.judge_assignments (
  id uuid primary key default gen_random_uuid(),
  festival_id uuid not null references public.festivals(id) on delete cascade,
  judge_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  competition_id uuid references public.competitions(id) on delete cascade,
  fixture_id uuid references public.fixtures(id) on delete cascade,
  role text not null default 'referee',
  status public.judge_assignment_status not null default 'assigned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (judge_id, event_id)
);

-- Indexes for performant relational lookups and RLS evaluation
create index judge_assignments_festival_idx on public.judge_assignments(festival_id);
create index judge_assignments_judge_idx on public.judge_assignments(judge_id);
create index judge_assignments_event_idx on public.judge_assignments(event_id);

-- Enable RLS
alter table public.judge_assignments enable row level security;

-- Timestamp trigger
create trigger judge_assignments_updated_at
before update on public.judge_assignments
for each row execute function public.set_updated_at();

-- ============================================================
-- 3. RLS POLICIES FOR JUDGE ASSIGNMENTS
-- ============================================================

-- Authenticated judges can view their own assignments; admins can view all
create policy "judges can view own assignments"
on public.judge_assignments
for select
to authenticated
using (
  judge_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.is_active = true
  )
);

-- Only admins can manage judge assignments
create policy "admins can manage judge assignments"
on public.judge_assignments
for all
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
-- 4. HARDENED RLS POLICIES FOR RESULTS
-- ============================================================

-- Authenticated judges can view results for events they are assigned to (including draft/submitted)
create policy "judges can view assigned results"
on public.results
for select
to authenticated
using (
  status = 'published'
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and (
        p.role = 'admin'
        or (
          p.role = 'judge'
          and exists (
            select 1 from public.judge_assignments ja
            where ja.judge_id = auth.uid()
              and ja.event_id = results.event_id
          )
        )
      )
  )
);

-- Judges can only create results for events they are assigned to
-- Disallows direct creation of 'verified' or 'published' results
create policy "judges can insert results for assigned events"
on public.results
for insert
to authenticated
with check (
  status in ('draft', 'submitted')
  and submitted_by = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and (
        p.role = 'admin'
        or (
          p.role = 'judge'
          and exists (
            select 1 from public.judge_assignments ja
            where ja.judge_id = auth.uid()
              and ja.event_id = results.event_id
          )
        )
      )
  )
);

-- Judges can only update DRAFT results for events they are assigned to
-- Once a result is 'submitted', 'verified', or 'published', it is IMMUTABLE to the judge
create policy "judges can update draft results for assigned events"
on public.results
for update
to authenticated
using (
  status = 'draft'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and (
        p.role = 'admin'
        or (
          p.role = 'judge'
          and exists (
            select 1 from public.judge_assignments ja
            where ja.judge_id = auth.uid()
              and ja.event_id = results.event_id
          )
        )
      )
  )
)
with check (
  status in ('draft', 'submitted')
  and submitted_by = auth.uid()
);

-- ============================================================
-- 5. HARDENED RLS POLICIES FOR RESULT AUDIT ENTRIES
-- ============================================================

-- Authenticated users can insert audit entries, but actor_id MUST match auth.uid()
create policy "users can insert audit entries for own actions"
on public.result_audit_entries
for insert
to authenticated
with check (
  actor_id = auth.uid()
);

-- Judges and admins can view audit entries for their assigned events
create policy "judges and admins can view audit entries for assigned events"
on public.result_audit_entries
for select
to authenticated
using (
  exists (
    select 1 from public.results r
    where r.id = result_audit_entries.result_id
      and (
        r.status = 'published'
        or exists (
          select 1 from public.profiles p
          where p.id = auth.uid()
            and p.is_active = true
            and (
              p.role = 'admin'
              or (
                p.role = 'judge'
                and exists (
                  select 1 from public.judge_assignments ja
                  where ja.judge_id = auth.uid()
                    and ja.event_id = r.event_id
                )
              )
            )
        )
      )
  )
);

