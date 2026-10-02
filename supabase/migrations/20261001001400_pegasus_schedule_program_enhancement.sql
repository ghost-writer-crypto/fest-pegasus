-- PEGASUS
-- Migration 014: Schedule Program Enhancement & Official October 2026 Festival Timetable
--
-- Objective:
-- 1. Enhance public.schedules with title text and category text columns.
-- 2. Ensure canonical venues (Ground, Volleyball Court, Courtyard) exist in public.venues.
-- 3. Populate all 59 official program-level schedule entries for October 2026.
-- 4. Ensure Admin RLS policies allow complete management (INSERT, UPDATE, DELETE).

-- ============================================================
-- 1. SCHEMA ENHANCEMENT: TITLE & CATEGORY COLUMNS
-- ============================================================

alter table public.schedules
  add column if not exists title text,
  add column if not exists category text;

-- Create indexes for program title and category searches
create index if not exists schedules_title_idx on public.schedules(title);
create index if not exists schedules_category_idx on public.schedules(category);

-- ============================================================
-- 2. CANONICAL VENUES ENSURANCE
-- ============================================================

insert into public.venues (festival_id, name, slug, location, is_active)
select
  f.id,
  v.name,
  v.slug,
  v.location,
  true
from public.festivals f
cross join (
  values
    ('Ground', 'ground', 'Main Ground'),
    ('Volleyball Court', 'volleyball-court', 'Sports Complex - Volleyball Court'),
    ('Courtyard', 'courtyard', 'Central Courtyard')
) as v(name, slug, location)
where f.slug = 'pegasus-2026'
on conflict (festival_id, slug) do update set
  name = excluded.name,
  location = excluded.location,
  is_active = true;

-- ============================================================
-- 3. ENSURE RLS POLICIES FOR ADMINS
-- ============================================================

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
-- 4. OFFICIAL 59 PEGASUS SCHEDULE ENTRIES (OCTOBER 2026)
-- ============================================================

with fest as (
  select id from public.festivals where slug = 'pegasus-2026' limit 1
),
v_ground as (
  select v.id from public.venues v join fest on v.festival_id = fest.id where v.slug = 'ground' limit 1
),
v_court as (
  select v.id from public.venues v join fest on v.festival_id = fest.id where v.slug = 'volleyball-court' limit 1
),
v_courtyard as (
  select v.id from public.venues v join fest on v.festival_id = fest.id where v.slug = 'courtyard' limit 1
)
insert into public.schedules (
  festival_id,
  venue_id,
  title,
  category,
  starts_at,
  ends_at,
  status,
  notes
)
select
  fest.id,
  case raw.v_key
    when 'ground' then (select id from v_ground)
    when 'volleyball-court' then (select id from v_court)
    when 'courtyard' then (select id from v_courtyard)
    else null
  end,
  raw.title,
  raw.category,
  raw.starts_at,
  raw.ends_at,
  'scheduled'::public.schedule_status,
  raw.notes
from fest
cross join (
  values
    -- 01-10-2026
    ('ground', 'CRICKET #1', 'GENERAL', '2026-10-01 15:00:00+00'::timestamptz, '2026-10-01 15:30:00+00'::timestamptz, 'Match #1 (8:30 PM - 9:00 PM IST)'),
    ('volleyball-court', 'ARM WRESTLING ROUNDS', 'PRE-SENIOR', '2026-10-01 15:54:00+00'::timestamptz, '2026-10-01 17:00:00+00'::timestamptz, 'Preliminary rounds (9:24 PM - 10:30 PM IST)'),

    -- 02-10-2026
    ('ground', 'CRICKET #2', 'GENERAL', '2026-10-02 15:00:00+00'::timestamptz, '2026-10-02 15:30:00+00'::timestamptz, 'Match #2 (8:30 PM - 9:00 PM IST)'),
    ('volleyball-court', 'ARM WRESTLING ROUNDS', 'PRE-SENIOR', '2026-10-02 15:54:00+00'::timestamptz, '2026-10-02 17:00:00+00'::timestamptz, 'Preliminary rounds (9:24 PM - 10:30 PM IST)'),

    -- 03-10-2026
    ('ground', 'CROSS BARRICK', 'PRE-SENIOR', '2026-10-03 02:50:00+00'::timestamptz, null, 'Original committee schedule specifies 8:20 AM - 7:00 AM (literal timing preserved without modification; end time unset due to constraint)'),
    ('ground', 'BOWLING', 'PRE-SENIOR', '2026-10-03 01:30:00+00'::timestamptz, '2026-10-03 02:00:00+00'::timestamptz, '7:00 AM - 7:30 AM IST'),
    ('ground', 'BOWLING', 'SENIOR', '2026-10-03 02:30:00+00'::timestamptz, '2026-10-03 03:00:00+00'::timestamptz, '8:00 AM - 8:30 AM IST'),
    (null, 'Swimming & Football', 'GENERAL', '2026-10-03 03:30:00+00'::timestamptz, null, 'TIME NOT PROVIDED — VENUE NOT PROVIDED by committee'),

    -- 04-10-2026
    ('ground', 'UMIYADI', 'PRE-SENIOR, SENIOR', '2026-10-04 05:15:00+00'::timestamptz, '2026-10-04 05:54:00+00'::timestamptz, '10:45 AM - 11:24 AM IST'),
    ('ground', 'SLOW CYCLE', 'PRE-SENIOR, JUNIOR', '2026-10-04 05:54:00+00'::timestamptz, '2026-10-04 06:45:00+00'::timestamptz, '11:24 AM - 12:15 PM IST'),
    ('ground', 'KHO KHO #1 & #2', 'PRE-SENIOR', '2026-10-04 11:00:00+00'::timestamptz, '2026-10-04 12:30:00+00'::timestamptz, 'Matches #1 & #2 (4:30 PM - 6:00 PM IST)'),
    ('volleyball-court', 'SKIPPING', 'JUNIOR, SUB-JUNIOR', '2026-10-04 15:54:00+00'::timestamptz, '2026-10-04 17:00:00+00'::timestamptz, '9:24 PM - 10:30 PM IST'),

    -- 05-10-2026
    ('courtyard', 'BADMINTON SINGLES #1-#2', 'SUPER SENIOR', '2026-10-05 00:30:00+00'::timestamptz, '2026-10-05 02:00:00+00'::timestamptz, 'Matches #1 & #2 (6:00 AM - 7:30 AM IST)'),
    ('ground', 'CRICKET LOSERS FINAL', 'GENERAL', '2026-10-05 15:00:00+00'::timestamptz, '2026-10-05 15:30:00+00'::timestamptz, '3rd place playoff (8:30 PM - 9:00 PM IST)'),
    ('courtyard', 'JUGGLING', 'SUPER SENIOR, PRE-SENIOR', '2026-10-05 15:54:00+00'::timestamptz, '2026-10-05 17:00:00+00'::timestamptz, '9:24 PM - 10:30 PM IST'),

    -- 06-10-2026
    ('courtyard', 'BADMINTON SINGLES #1-#2', 'SENIOR', '2026-10-06 00:30:00+00'::timestamptz, '2026-10-06 02:00:00+00'::timestamptz, 'Matches #1 & #2 (6:00 AM - 7:30 AM IST)'),
    ('ground', 'CRICKET FINAL', 'GENERAL', '2026-10-06 15:00:00+00'::timestamptz, '2026-10-06 15:30:00+00'::timestamptz, 'Championship Final (8:30 PM - 9:00 PM IST)'),
    ('volleyball-court', 'PUSH UP', 'SUPER SENIOR, SENIOR, PRE-SENIOR, JUNIOR', '2026-10-06 15:54:00+00'::timestamptz, '2026-10-06 17:00:00+00'::timestamptz, '9:24 PM - 10:30 PM IST'),

    -- 07-10-2026
    ('courtyard', 'BADMINTON DOUBLES #1-#2', 'SUPER SENIOR', '2026-10-07 00:30:00+00'::timestamptz, '2026-10-07 02:00:00+00'::timestamptz, 'Matches #1 & #2 (6:00 AM - 7:30 AM IST)'),
    ('ground', 'KHO KHO LOSERS', 'SUB-JUNIOR', '2026-10-07 11:00:00+00'::timestamptz, '2026-10-07 12:30:00+00'::timestamptz, '3rd place playoff (4:30 PM - 6:00 PM IST)'),
    ('volleyball-court', 'ARM WRESTLING LOSERS/FINAL', 'PRE-SENIOR', '2026-10-07 15:54:00+00'::timestamptz, '2026-10-07 17:00:00+00'::timestamptz, 'Finals & 3rd place (9:24 PM - 10:30 PM IST)'),

    -- 08-10-2026
    ('courtyard', 'BADMINTON LOSERS', 'SUPER SENIOR', '2026-10-08 00:30:00+00'::timestamptz, '2026-10-08 02:00:00+00'::timestamptz, '3rd place playoff (6:00 AM - 7:30 AM IST)'),
    ('volleyball-court', 'VOLLEYBALL MATCH #1', 'GENERAL', '2026-10-08 15:00:00+00'::timestamptz, '2026-10-08 15:30:00+00'::timestamptz, 'Match #1 (8:30 PM - 9:00 PM IST)'),
    ('courtyard', 'BADMINTON DOUBLES #1-#2', 'JUNIOR', '2026-10-08 15:54:00+00'::timestamptz, '2026-10-08 17:00:00+00'::timestamptz, 'Matches #1 & #2 (9:24 PM - 10:30 PM IST)'),

    -- 09-10-2026
    ('volleyball-court', 'VOLLEYBALL MATCH #2', 'GENERAL', '2026-10-09 15:00:00+00'::timestamptz, '2026-10-09 15:30:00+00'::timestamptz, 'Match #2 (8:30 PM - 9:00 PM IST)'),
    ('volleyball-court', 'PULL UP', 'SUPER SENIOR, SENIOR, PRE-SENIOR', '2026-10-09 15:54:00+00'::timestamptz, '2026-10-09 17:00:00+00'::timestamptz, '9:24 PM - 10:30 PM IST'),

    -- 10-10-2026
    ('courtyard', 'BADMINTON LOSERS', 'SENIOR', '2026-10-10 00:30:00+00'::timestamptz, '2026-10-10 02:00:00+00'::timestamptz, '3rd place playoff (6:00 AM - 7:30 AM IST)'),
    ('volleyball-court', 'SINGLE LEG HULA HOOP', 'SUB-JUNIOR', '2026-10-10 03:30:00+00'::timestamptz, '2026-10-10 03:54:00+00'::timestamptz, '9:00 AM - 9:24 AM IST'),
    ('volleyball-court', 'HOP SCOTCH', 'SUB-JUNIOR', '2026-10-10 03:54:00+00'::timestamptz, '2026-10-10 04:30:00+00'::timestamptz, '9:24 AM - 10:00 AM IST'),
    ('ground', 'FREESTYLE', 'SENIOR', '2026-10-10 11:00:00+00'::timestamptz, '2026-10-10 12:30:00+00'::timestamptz, '4:30 PM - 6:00 PM IST'),
    ('volleyball-court', 'VOLLEYBALL LOSERS/FINAL', 'GENERAL', '2026-10-10 15:30:00+00'::timestamptz, '2026-10-10 17:00:00+00'::timestamptz, 'Finals & 3rd place (9:00 PM - 10:30 PM IST)'),

    -- 11-10-2026
    ('ground', 'PENALTY SHOOTOUT', 'JUNIOR, GENERAL', '2026-10-11 01:00:00+00'::timestamptz, '2026-10-11 01:30:00+00'::timestamptz, '6:30 AM - 7:00 AM IST'),
    ('courtyard', 'BALLOON PYRAMID', 'SUB-JUNIOR', '2026-10-11 01:30:00+00'::timestamptz, '2026-10-11 01:50:00+00'::timestamptz, '7:00 AM - 7:20 AM IST'),
    ('courtyard', 'FISHING BOTTLE', 'SUB-JUNIOR', '2026-10-11 01:50:00+00'::timestamptz, '2026-10-11 02:15:00+00'::timestamptz, '7:20 AM - 7:45 AM IST'),
    ('courtyard', 'MUSICAL CHAIR', 'SUB-JUNIOR', '2026-10-11 02:15:00+00'::timestamptz, '2026-10-11 02:35:00+00'::timestamptz, '7:45 AM - 8:05 AM IST'),
    ('courtyard', 'BALLOON RACE', 'SUB-JUNIOR', '2026-10-11 02:35:00+00'::timestamptz, '2026-10-11 03:00:00+00'::timestamptz, '8:05 AM - 8:30 AM IST'),
    ('courtyard', 'BOTTLE HIT', 'JUNIOR', '2026-10-11 03:00:00+00'::timestamptz, '2026-10-11 03:45:00+00'::timestamptz, '8:30 AM - 9:15 AM IST'),
    (null, 'BREAKFAST', 'GENERAL', '2026-10-11 03:45:00+00'::timestamptz, null, 'Official breakfast block — TIME NOT PROVIDED — VENUE NOT PROVIDED by committee'),
    ('courtyard', 'CANDLE RACE', 'SUB-JUNIOR', '2026-10-11 04:30:00+00'::timestamptz, '2026-10-11 05:15:00+00'::timestamptz, '10:00 AM - 10:45 AM IST'),
    ('ground', 'THREE LEGGED RACE', 'SUB-JUNIOR', '2026-10-11 05:15:00+00'::timestamptz, '2026-10-11 05:50:00+00'::timestamptz, '10:45 AM - 11:20 AM IST'),
    ('ground', 'SACK RACE', 'JUNIOR', '2026-10-11 05:50:00+00'::timestamptz, '2026-10-11 06:25:00+00'::timestamptz, '11:20 AM - 11:55 AM IST'),
    ('courtyard', 'WATER FILLING', 'SUB-JUNIOR', '2026-10-11 06:25:00+00'::timestamptz, '2026-10-11 06:45:00+00'::timestamptz, '11:55 AM - 12:15 PM IST'),
    ('courtyard', 'WATER FILLING GROUP', 'JUNIOR', '2026-10-11 06:45:00+00'::timestamptz, '2026-10-11 07:15:00+00'::timestamptz, 'Group category (12:15 PM - 12:45 PM IST)'),
    ('courtyard', 'DART BOARD', 'SENIOR, PRE-SENIOR, JUNIOR', '2026-10-11 07:15:00+00'::timestamptz, '2026-10-11 07:45:00+00'::timestamptz, '12:45 PM - 1:15 PM IST'),
    ('ground', 'DODGEBALL #1-#2', 'SUB-JUNIOR', '2026-10-11 11:00:00+00'::timestamptz, '2026-10-11 12:30:00+00'::timestamptz, 'Matches #1 & #2 (4:30 PM - 6:00 PM IST)'),

    -- 12-10-2026
    ('courtyard', 'BADMINTON DOUBLES LOSERS', 'PRE-SENIOR', '2026-10-12 00:45:00+00'::timestamptz, '2026-10-12 02:00:00+00'::timestamptz, '3rd place playoff (6:15 AM - 7:30 AM IST)'),
    ('ground', 'KHO KHO FINAL', 'SUB-JUNIOR', '2026-10-12 11:00:00+00'::timestamptz, '2026-10-12 12:30:00+00'::timestamptz, 'Championship Final (4:30 PM - 6:00 PM IST)'),
    ('courtyard', 'BADMINTON DOUBLES FINAL', 'JUNIOR', '2026-10-12 15:54:00+00'::timestamptz, '2026-10-12 17:00:00+00'::timestamptz, 'Championship Final (9:24 PM - 10:30 PM IST)'),

    -- 13-10-2026
    ('courtyard', 'BADMINTON SINGLES FINAL', 'SUPER SENIOR', '2026-10-13 00:45:00+00'::timestamptz, '2026-10-13 02:00:00+00'::timestamptz, 'Championship Final (6:15 AM - 7:30 AM IST)'),
    ('ground', 'DODGEBALL LOSERS', 'JUNIOR, GENERAL', '2026-10-13 11:00:00+00'::timestamptz, '2026-10-13 12:30:00+00'::timestamptz, '3rd place playoff (4:30 PM - 6:00 PM IST)'),

    -- 14-10-2026
    ('courtyard', 'BADMINTON SINGLES FINALS', 'SENIOR', '2026-10-14 00:45:00+00'::timestamptz, '2026-10-14 02:00:00+00'::timestamptz, 'Championship Final (6:15 AM - 7:30 AM IST)'),
    ('ground', 'DODGEBALL FINAL', 'JUNIOR, GENERAL', '2026-10-14 11:00:00+00'::timestamptz, '2026-10-14 12:30:00+00'::timestamptz, 'Championship Final (4:30 PM - 6:00 PM IST)'),
    ('courtyard', 'BADMINTON SINGLES FINALS', 'GENERAL', '2026-10-14 15:50:00+00'::timestamptz, '2026-10-14 17:00:00+00'::timestamptz, 'Championship Final (9:20 PM - 10:30 PM IST)'),

    -- 15-10-2026
    ('courtyard', 'BADMINTON DOUBLES FINALS', 'PRE-SENIOR', '2026-10-15 00:45:00+00'::timestamptz, '2026-10-15 02:00:00+00'::timestamptz, 'Championship Final (6:15 AM - 7:30 AM IST)'),
    ('ground', 'SHOT ON TARGET', 'SUPER SENIOR', '2026-10-15 08:45:00+00'::timestamptz, '2026-10-15 11:00:00+00'::timestamptz, '2:15 PM - 4:30 PM IST'),
    ('ground', 'CORNER KICK GOAL', 'SENIOR', '2026-10-15 11:00:00+00'::timestamptz, '2026-10-15 12:30:00+00'::timestamptz, '4:30 PM - 6:00 PM IST'),
    ('volleyball-court', 'BASKET THROW', 'SUPER SENIOR, SENIOR', '2026-10-15 16:00:00+00'::timestamptz, '2026-10-15 16:30:00+00'::timestamptz, '9:30 PM - 10:00 PM IST'),

    -- 16-10-2026
    ('volleyball-court', 'ARCHERY', 'SUPER SENIOR', '2026-10-16 15:00:00+00'::timestamptz, '2026-10-16 16:30:00+00'::timestamptz, '8:30 PM - 10:00 PM IST'),

    -- 18-10-2026
    (null, 'ATHLETICS MEET', 'GENERAL', '2026-10-18 03:30:00+00'::timestamptz, null, 'Official track & field meet — TIME NOT PROVIDED — VENUE NOT PROVIDED by committee')
) as raw(v_key, title, category, starts_at, ends_at, notes);

