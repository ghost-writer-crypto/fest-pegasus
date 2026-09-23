-- PEGASUS
-- Migration 005: Admin Result Verification & Publication Lifecycle Policies
--
-- Objective:
-- 1. Enable authenticated active administrators to verify submitted results (submitted -> verified).
--    Enforces verified_by = auth.uid() and current status = 'submitted'.
-- 2. Enable authenticated active administrators to publish verified results (verified -> published).
--    Enforces published_at is not null and current status = 'verified'.
-- 3. Enable authenticated active administrators to unlock verified/published results for formal correction (-> corrected).
-- 4. Enable authenticated active administrators to reverify corrected results (corrected -> verified).
-- 5. Preserve immutability: All transitions require explicit matching source and target lifecycle states.

-- ============================================================
-- 1. ADMIN VERIFY SUBMITTED RESULTS
-- ============================================================

drop policy if exists "admins can verify submitted results" on public.results;
create policy "admins can verify submitted results"
on public.results
for update
to authenticated
using (
  status = 'submitted'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.is_active = true
  )
)
with check (
  status = 'verified'
  and verified_by = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.is_active = true
  )
);

-- ============================================================
-- 2. ADMIN PUBLISH VERIFIED RESULTS
-- ============================================================

drop policy if exists "admins can publish verified results" on public.results;
create policy "admins can publish verified results"
on public.results
for update
to authenticated
using (
  status = 'verified'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.is_active = true
  )
)
with check (
  status = 'published'
  and published_at is not null
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.is_active = true
  )
);

-- ============================================================
-- 3. ADMIN UNLOCK RESULTS FOR CORRECTION
-- ============================================================

drop policy if exists "admins can unlock results for correction" on public.results;
create policy "admins can unlock results for correction"
on public.results
for update
to authenticated
using (
  status in ('verified', 'published')
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.is_active = true
  )
)
with check (
  status = 'corrected'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.is_active = true
  )
);

-- ============================================================
-- 4. ADMIN REVERIFY CORRECTED RESULTS
-- ============================================================

drop policy if exists "admins can reverify corrected results" on public.results;
create policy "admins can reverify corrected results"
on public.results
for update
to authenticated
using (
  status = 'corrected'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.is_active = true
  )
)
with check (
  status = 'verified'
  and verified_by = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.is_active = true
  )
);

