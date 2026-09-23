-- PEGASUS
-- Migration 006: Admin Participant Management RLS & Privileges
--
-- Objective:
-- 1. Enable authenticated active administrators to insert new participant records.
-- 2. Enable authenticated active administrators to update participant records.
-- 3. Grant insert and update privileges on public.participants to authenticated role.
-- 4. Grant select on private columns to authenticated role for administrative management.

-- ============================================================
-- 1. TABLE PRIVILEGES
-- ============================================================

grant insert, update on public.participants to authenticated;
grant select (phone, email, date_of_birth, notes) on public.participants to authenticated;

-- ============================================================
-- 2. ADMIN INSERT PARTICIPANT POLICY
-- ============================================================

drop policy if exists "admins can insert participants" on public.participants;
create policy "admins can insert participants"
on public.participants
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

-- ============================================================
-- 3. ADMIN UPDATE PARTICIPANT POLICY
-- ============================================================

drop policy if exists "admins can update participants" on public.participants;
create policy "admins can update participants"
on public.participants
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

