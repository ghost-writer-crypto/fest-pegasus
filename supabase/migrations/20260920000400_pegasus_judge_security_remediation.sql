-- PEGASUS
-- Migration 004: Judge Security Remediation
--
-- Objective:
-- 1. [HIGH-01] Eliminate self-role privilege escalation on public.profiles.
--    Enforce via a SECURITY DEFINER trigger that non-admin callers cannot alter role or is_active.
-- 2. [HIGH-02] Fix results draft RLS deadlock:
--    Allow submitted_by to be NULL or auth.uid() when status = 'draft',
--    while strictly requiring submitted_by = auth.uid() when status = 'submitted'.
-- 3. [MED-03] Grant authenticated judges and admins read access to public.registrations
--    scoped to active assignments/festivals for operational roster resolution.
-- 4. [MED-04] Enforce active assignment status ('assigned', 'in_progress')
--    in RLS policies for judge_assignments, results, and registrations.
-- 5. [LOW-02] Protect private participant fields (phone, email, date_of_birth, notes)
--    at the database permission layer via column-level grants.

-- ============================================================
-- 1. [HIGH-01] PROFILE PRIVILEGE ESCALATION PROTECTION
-- ============================================================

-- Function to prevent non-admins from changing privileged profile fields (role, is_active)
create or replace function public.check_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  calling_user_role public.profile_role;
begin
  -- Check if privileged fields are being modified
  if (new.role is distinct from old.role) or (new.is_active is distinct from old.is_active) then
    -- When invoked from an authenticated client session
    if auth.uid() is not null then
      select role into calling_user_role
      from public.profiles
      where id = auth.uid();

      if calling_user_role is distinct from 'admin' then
        raise exception 'Security Boundary Violation: Only administrators are authorized to modify user roles or active status.';
      end if;
    end if;
  end if;
  return new;
end;
$$;

-- Attach trigger to public.profiles
drop trigger if exists check_profile_privilege_escalation_trigger on public.profiles;
create trigger check_profile_privilege_escalation_trigger
before update on public.profiles
for each row
execute function public.check_profile_privilege_escalation();

-- Add policy allowing active admins to manage any profile
drop policy if exists "admins can manage all profiles" on public.profiles;
create policy "admins can manage all profiles"
on public.profiles
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
-- 2. [HIGH-02 & MED-04] FIX RESULTS DRAFT RLS & ENFORCE ACTIVE ASSIGNMENT STATUS
-- ============================================================

-- Drop previous judge mutation policies from migration 003
drop policy if exists "judges can insert results for assigned events" on public.results;
drop policy if exists "judges can update draft results for assigned events" on public.results;
drop policy if exists "judges can view assigned results" on public.results;

-- 2a. SELECT: Judges can view published results or assigned results (draft/submitted) if actively assigned
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
              and ja.status in ('assigned', 'in_progress')
          )
        )
      )
  )
);

-- 2b. INSERT:
-- Draft: submitted_by may be NULL or equal auth.uid()
-- Submitted: submitted_by MUST equal auth.uid()
-- Strictly requires active assignment status ('assigned', 'in_progress')
create policy "judges can insert results for assigned events"
on public.results
for insert
to authenticated
with check (
  (
    (status = 'draft' and (submitted_by is null or submitted_by = auth.uid()))
    or
    (status = 'submitted' and submitted_by = auth.uid())
  )
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
              and ja.status in ('assigned', 'in_progress')
          )
        )
      )
  )
);

-- 2c. UPDATE:
-- Only draft results can be updated by judges (USING status = 'draft').
-- Once submitted, verified, or published, rows are immutable to judges.
-- Draft: submitted_by may be NULL or equal auth.uid()
-- Submitted: submitted_by MUST equal auth.uid()
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
              and ja.status in ('assigned', 'in_progress')
          )
        )
      )
  )
)
with check (
  (status = 'draft' and (submitted_by is null or submitted_by = auth.uid()))
  or
  (status = 'submitted' and submitted_by = auth.uid())
);

-- ============================================================
-- 3. [MED-03 & MED-04] REGISTRATIONS READ ACCESS FOR ACTIVE OFFICIALS
-- ============================================================

drop policy if exists "officials can view event registrations" on public.registrations;
create policy "officials can view event registrations"
on public.registrations
for select
to authenticated
using (
  exists (
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
              and ja.event_id = registrations.event_id
              and ja.status in ('assigned', 'in_progress')
          )
        )
      )
  )
);

-- ============================================================
-- 4. [MED-04] AUDIT ENTRIES ENFORCE ACTIVE ASSIGNMENT STATUS
-- ============================================================

drop policy if exists "judges and admins can view audit entries for assigned events" on public.result_audit_entries;
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
                    and ja.status in ('assigned', 'in_progress')
                )
              )
            )
        )
      )
  )
);

-- ============================================================
-- 5. [LOW-02] PARTICIPANT PRIVACY: DATABASE-LEVEL COLUMN RESTRICTION
-- ============================================================

-- Revoke broad table SELECT from anon and authenticated roles
revoke select on public.participants from anon, authenticated;

-- Grant column-level SELECT strictly on public participant fields
grant select (
  id,
  festival_id,
  team_id,
  division_id,
  public_id,
  chest_number,
  name,
  profile_image_url,
  status,
  created_at,
  updated_at
) on public.participants to anon, authenticated;

