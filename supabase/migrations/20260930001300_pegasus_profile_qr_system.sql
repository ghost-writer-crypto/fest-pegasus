-- ============================================================
-- PEGASUS 15.1 — PROFILE QR SYSTEM MIGRATION
-- Unified QR Identity management for Students, Judges, and Admins
-- ============================================================

create type public.qr_status as enum (
  'active',
  'revoked'
);

create table if not exists public.qr_identities (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('participant', 'profile')),
  entity_id uuid not null,
  qr_token text not null unique,
  status public.qr_status not null default 'active',
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  rotated_at timestamptz
);

create index if not exists idx_qr_identities_token on public.qr_identities (qr_token);
create index if not exists idx_qr_identities_entity on public.qr_identities (entity_type, entity_id);

-- Enable Row Level Security
alter table public.qr_identities enable row level security;

-- 1. Public resolution policy: Anyone can query active QR identities by token for verification
create policy "Public can read active qr identities by token"
  on public.qr_identities
  for select
  using (status = 'active');

-- 2. Administrator policy: Full access for active admins
create policy "Admins have full access to qr identities"
  on public.qr_identities
  for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
      and profiles.is_active = true
    )
  );
