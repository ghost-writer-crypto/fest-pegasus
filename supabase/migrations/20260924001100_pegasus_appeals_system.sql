-- ============================================================
-- PEGASUS SPORTS FESTIVAL — APPEALS & DISPUTES SYSTEM
-- Migration: 20260924001100_pegasus_appeals_system.sql
-- ============================================================

-- 1. ENUM TYPES
do $$ begin
  create type public.appeal_status as enum (
    'submitted',
    'under_review',
    'accepted',
    'rejected',
    'partially_upheld'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.appeal_reason_category as enum (
    'scoring_discrepancy',
    'timing_error',
    'rule_violation',
    'eligibility_breach',
    'conduct_protest',
    'clerical_error',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

-- 2. APPEALS TABLE
create table if not exists public.appeals (
  id uuid primary key default gen_random_uuid(),
  festival_id uuid not null references public.festivals(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  competition_id uuid references public.competitions(id) on delete set null,
  fixture_id uuid references public.fixtures(id) on delete set null,
  result_id uuid references public.results(id) on delete set null,
  team_id uuid not null references public.teams(id) on delete cascade,
  participant_id uuid references public.participants(id) on delete set null,

  -- Submitter Provenance
  submitted_by uuid references auth.users(id) on delete set null,
  submitter_name text not null,
  submitter_role public.identity_role not null,

  -- Appeal Substance
  reason_category public.appeal_reason_category not null default 'other',
  title text not null,
  description text not null,
  evidence_references text[] not null default '{}'::text[],

  -- Temporal Windows
  published_at timestamptz,
  deadline_at timestamptz not null,
  window_minutes int not null default 30,

  -- Financials (₹70 Codex Fee)
  fee_amount numeric not null default 70 check (fee_amount >= 0),
  fee_status text not null default 'unpaid' check (fee_status in ('unpaid', 'paid', 'waived', 'refunded')),

  -- Lifecycle & Adjudication
  status public.appeal_status not null default 'submitted',
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewer_name text,
  reviewed_at timestamptz,
  decision_notes text,
  corrected_result_payload jsonb,

  -- Metadata & Timestamps
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. INDEXES
create index if not exists appeals_festival_idx on public.appeals(festival_id);
create index if not exists appeals_event_idx on public.appeals(event_id);
create index if not exists appeals_team_idx on public.appeals(team_id);
create index if not exists appeals_result_idx on public.appeals(result_id);
create index if not exists appeals_status_idx on public.appeals(status);
create index if not exists appeals_created_at_idx on public.appeals(created_at desc);

-- 4. UPDATED_AT TRIGGER
drop trigger if exists appeals_updated_at on public.appeals;
create trigger appeals_updated_at
before update on public.appeals
for each row execute function public.set_updated_at();

-- 5. ROW LEVEL SECURITY
alter table public.appeals enable row level security;

-- Public can read appeals (operational transparency for official protests)
create policy "Allow public read on appeals"
on public.appeals for select
using (true);

-- Admins and desk operators can insert, update, and manage appeals
create policy "Allow admins and desk operators full access on appeals"
on public.appeals for all
using (
  auth.role() = 'authenticated' and (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'desk_operator')
      and profiles.is_active = true
    )
  )
);

-- Team managers can submit appeals for their own team
create policy "Allow team managers to lodge appeals for their team"
on public.appeals for insert
with check (
  auth.role() = 'authenticated' and (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'team_manager'
      and profiles.team_id = appeals.team_id
      and profiles.is_active = true
    )
  )
);
