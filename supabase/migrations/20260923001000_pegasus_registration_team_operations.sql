-- PEGASUS
-- Migration 010: Registration & Team Operations, Substitutions, and Multi-Tenant RLS
-- Domain → Rules → State → Operations → Data → UI

-- ============================================================
-- 1. ENUMS FOR SUBSTITUTION WORKFLOW
-- ============================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'substitution_status') then
    create type public.substitution_status as enum (
      'pending',
      'approved',
      'rejected',
      'cancelled'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'substitution_timing') then
    create type public.substitution_timing as enum (
      'normal',
      'emergency'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'substitution_payment_status') then
    create type public.substitution_payment_status as enum (
      'unpaid',
      'paid',
      'waived'
    );
  end if;
end $$;

-- ============================================================
-- 2. REGISTRATION SUBSTITUTIONS TABLE
-- ============================================================

create table if not exists public.registration_substitutions (
  id uuid primary key default gen_random_uuid(),
  festival_id uuid not null references public.festivals(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  
  -- Original and Replacement participants
  original_participant_id uuid not null references public.participants(id) on delete restrict,
  replacement_participant_id uuid not null references public.participants(id) on delete restrict,
  
  -- Registration linkages
  original_registration_id uuid not null references public.registrations(id) on delete restrict,
  replacement_registration_id uuid references public.registrations(id) on delete set null,
  
  -- Timing, fee, and status
  timing public.substitution_timing not null default 'normal',
  fee_amount numeric not null default 20 check (fee_amount >= 0),
  payment_status public.substitution_payment_status not null default 'unpaid',
  status public.substitution_status not null default 'pending',
  reason text not null,
  
  -- Administrative provenance
  requested_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  metadata jsonb not null default '{}'::jsonb,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  check (original_participant_id <> replacement_participant_id)
);

-- Indexes
create index if not exists registration_substitutions_festival_idx on public.registration_substitutions(festival_id);
create index if not exists registration_substitutions_event_idx on public.registration_substitutions(event_id);
create index if not exists registration_substitutions_team_idx on public.registration_substitutions(team_id);
create index if not exists registration_substitutions_status_idx on public.registration_substitutions(status);

-- Updated_at trigger
drop trigger if exists registration_substitutions_updated_at on public.registration_substitutions;
create trigger registration_substitutions_updated_at
before update on public.registration_substitutions
for each row execute function public.set_updated_at();

-- ============================================================
-- 3. SEED OFFICIAL TEAMS (Garuda, Toofan, Tiburon, Trojan)
-- ============================================================

insert into public.teams (
  festival_id,
  code,
  name,
  sort_order
)
select
  f.id,
  t.code,
  t.name,
  t.sort_order
from public.festivals f
cross join (
  values
    ('GAR', 'Garuda', 1),
    ('TOF', 'Toofan', 2),
    ('TIB', 'Tiburon', 3),
    ('TRJ', 'Trojan', 4)
) as t(code, name, sort_order)
where f.slug = 'pegasus-2026'
on conflict (festival_id, code) do update set
  name = excluded.name,
  sort_order = excluded.sort_order;

-- ============================================================
-- 4. TABLE PRIVILEGES / GRANTS
-- ============================================================

grant select, insert, update on public.teams to authenticated;
grant select, insert, update on public.registrations to authenticated;
grant select, insert, update on public.registration_substitutions to authenticated;
grant select on public.event_divisions to authenticated, anon;
grant select on public.event_quotas to authenticated, anon;
grant select on public.teams to anon;
grant select on public.registrations to anon;
grant select on public.registration_substitutions to anon;

-- ============================================================
-- 5. RLS POLICIES — TEAMS
-- ============================================================

alter table public.teams enable row level security;

drop policy if exists "admins can insert teams" on public.teams;
create policy "admins can insert teams"
on public.teams
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

drop policy if exists "admins can update teams" on public.teams;
create policy "admins can update teams"
on public.teams
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
-- 6. RLS POLICIES — EVENT DIVISIONS & EVENT QUOTAS
-- ============================================================

alter table public.event_divisions enable row level security;
alter table public.event_quotas enable row level security;

drop policy if exists "public can view event divisions" on public.event_divisions;
create policy "public can view event divisions"
on public.event_divisions
for select
using (true);

drop policy if exists "admins can manage event divisions" on public.event_divisions;
create policy "admins can manage event divisions"
on public.event_divisions
for all
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.is_active = true
  )
);

drop policy if exists "public can view event quotas" on public.event_quotas;
create policy "public can view event quotas"
on public.event_quotas
for select
using (true);

drop policy if exists "admins can manage event quotas" on public.event_quotas;
create policy "admins can manage event quotas"
on public.event_quotas
for all
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
-- 7. RLS POLICIES — REGISTRATIONS
-- ============================================================

alter table public.registrations enable row level security;

drop policy if exists "public can view approved registrations" on public.registrations;
create policy "public can view approved registrations"
on public.registrations
for select
using (status = 'approved');

drop policy if exists "admins have full access to registrations" on public.registrations;
create policy "admins have full access to registrations"
on public.registrations
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

drop policy if exists "team managers can view own team registrations" on public.registrations;
create policy "team managers can view own team registrations"
on public.registrations
for select
to authenticated
using (
  exists (
    select 1 from public.participants pt
    join public.profiles pr on pr.team_id = pt.team_id
    where pt.id = registrations.participant_id
      and pr.id = auth.uid()
      and pr.role = 'team_manager'
      and pr.is_active = true
  )
);

drop policy if exists "team managers can insert own team registrations" on public.registrations;
create policy "team managers can insert own team registrations"
on public.registrations
for insert
to authenticated
with check (
  exists (
    select 1 from public.participants pt
    join public.profiles pr on pr.team_id = pt.team_id
    where pt.id = registrations.participant_id
      and pr.id = auth.uid()
      and pr.role = 'team_manager'
      and pr.is_active = true
  )
);

drop policy if exists "team managers can update own team registrations" on public.registrations;
create policy "team managers can update own team registrations"
on public.registrations
for update
to authenticated
using (
  exists (
    select 1 from public.participants pt
    join public.profiles pr on pr.team_id = pt.team_id
    where pt.id = registrations.participant_id
      and pr.id = auth.uid()
      and pr.role = 'team_manager'
      and pr.is_active = true
  )
)
with check (
  exists (
    select 1 from public.participants pt
    join public.profiles pr on pr.team_id = pt.team_id
    where pt.id = registrations.participant_id
      and pr.id = auth.uid()
      and pr.role = 'team_manager'
      and pr.is_active = true
  )
);

-- ============================================================
-- 8. RLS POLICIES — REGISTRATION SUBSTITUTIONS
-- ============================================================

alter table public.registration_substitutions enable row level security;

drop policy if exists "admins have full access to substitutions" on public.registration_substitutions;
create policy "admins have full access to substitutions"
on public.registration_substitutions
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

drop policy if exists "team managers can view own team substitutions" on public.registration_substitutions;
create policy "team managers can view own team substitutions"
on public.registration_substitutions
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'team_manager'
      and p.team_id = registration_substitutions.team_id
      and p.is_active = true
  )
);

drop policy if exists "team managers can insert own team substitutions" on public.registration_substitutions;
create policy "team managers can insert own team substitutions"
on public.registration_substitutions
for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'team_manager'
      and p.team_id = registration_substitutions.team_id
      and p.is_active = true
  )
);

-- ============================================================
-- 9. RLS POLICIES — PARTICIPANTS (TEAM MANAGER SCOPE)
-- ============================================================

drop policy if exists "team managers can view own team participants" on public.participants;
create policy "team managers can view own team participants"
on public.participants
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'team_manager'
      and p.team_id = participants.team_id
      and p.is_active = true
  )
);

drop policy if exists "team managers can insert own team participants" on public.participants;
create policy "team managers can insert own team participants"
on public.participants
for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'team_manager'
      and p.team_id = participants.team_id
      and p.is_active = true
  )
);

drop policy if exists "team managers can update own team participants" on public.participants;
create policy "team managers can update own team participants"
on public.participants
for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'team_manager'
      and p.team_id = participants.team_id
      and p.is_active = true
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'team_manager'
      and p.team_id = participants.team_id
      and p.is_active = true
  )
);

