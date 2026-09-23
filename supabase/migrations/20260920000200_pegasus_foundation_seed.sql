-- PEGASUS
-- Migration 002: Real Data Foundation Seed
-- Authoritative Codex Foundation Seed
--
-- This migration seeds ONLY authoritative foundation records:
-- 1. Festival foundation record ('pegasus-2026')
-- 2. 5 Codex divisions (Bidaya, Thaniya, Thamheediyya, Aliya, Majestir)
-- 3. Core sports disciplines
-- 4. Authoritative Codex events (59 events: 52 confirmed with point classes, 7 unconfirmed with NULL point class)
-- 5. Confirmed active festival events (7 operational events from data/events.ts)
-- 6. Event division linkages
-- 7. Confirmed event quotas
--
-- EXCLUSIONS (Deliberately NOT seeded):
-- - Teams (4 houses exist, but names, codes, and colors are unconfirmed by organizers)
-- - Participants (mock data p001-p004 excluded)
-- - Results (mock results r001-r004 excluded)
-- - Competitions (mock scheduling comp-001-comp-003 excluded)
-- - Fixtures & Schedules (unconfirmed tournament pairings / timetable)
-- - Leaderboard & Standings (computed dynamically from official results)

-- ============================================================================
-- 1. FESTIVAL FOUNDATION RECORD
-- ============================================================================

insert into public.festivals (
  name,
  slug,
  description,
  is_active
)
values (
  'Pegasus Sports Festival 2026',
  'pegasus-2026',
  'Official Pegasus Sports Festival Operating System',
  true
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  is_active = excluded.is_active;

-- ============================================================================
-- 2. DIVISIONS (5 Authoritative Codex Divisions)
-- ============================================================================

insert into public.divisions (
  festival_id,
  code,
  name,
  sort_order
)
select
  f.id,
  d.code,
  d.name,
  d.sort_order
from public.festivals f
cross join (
  values
    ('bidaya', 'Bidaya', 1),
    ('thaniya', 'Thaniya', 2),
    ('thamheediyya', 'Thamheediyya', 3),
    ('aliya', 'Aliya', 4),
    ('majestir', 'Majestir', 5)
) as d(code, name, sort_order)
where f.slug = 'pegasus-2026'
on conflict (festival_id, code) do update set
  name = excluded.name,
  sort_order = excluded.sort_order;

-- ============================================================================
-- 3. SPORTS DISCIPLINES
-- ============================================================================

insert into public.sports (
  festival_id,
  slug,
  name,
  description,
  sort_order
)
select
  f.id,
  s.slug,
  s.name,
  s.description,
  s.sort_order
from public.festivals f
cross join (
  values
    ('athletics', 'Athletics', 'Speed, strength, endurance and precision.', 1),
    ('football', 'Football', 'The beautiful game. One team, one objective.', 2),
    ('basketball', 'Basketball', 'Speed, movement and relentless competition.', 3),
    ('volleyball', 'Volleyball', 'Precision, teamwork and power.', 4),
    ('cricket', 'Cricket', 'Strategy, skill and patience under pressure.', 5),
    ('tug-of-war', 'Tug of War', 'Strength, grip, and collective team power.', 6)
) as s(slug, name, description, sort_order)
where f.slug = 'pegasus-2026'
on conflict (festival_id, slug) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order;

-- ============================================================================
-- 4. CODEX EVENTS (59 Authoritative Codex Events)
-- ============================================================================
-- Confirmed point classes:
--   W = Individual (5 / 3 / 1)
--   X = Group (5 / 3 / 1)
--   Y = Group (7 / 5 / 3)
--   Z = General (10 / 7 / 5)
-- Unconfirmed point classes are inserted with point_class = NULL and is_confirmed = false.

insert into public.codex_events (
  festival_id,
  sport_id,
  code,
  name,
  point_class,
  competition_type,
  scoring_engine,
  rules,
  is_confirmed
)
select
  f.id,
  sp.id as sport_id,
  ce.code,
  ce.name,
  ce.point_class::public.point_class,
  ce.competition_type,
  ce.scoring_engine,
  ce.rules::jsonb,
  ce.is_confirmed
from public.festivals f
cross join (
  values
    -- W - Individual: 5 / 3 / 1 (33 events)
    ('race-100m', 'Race 100m', 'W', 'athletics', 'final', 'athletics', '{}', true),
    ('long-jump', 'Long Jump', 'W', 'athletics', 'final', 'athletics', '{}', true),
    ('high-jump', 'High Jump', 'W', 'athletics', 'final', 'athletics', '{}', true),
    ('shot-put', 'Shot Put', 'W', 'athletics', 'final', 'athletics', '{}', true),
    ('javelin-throw', 'Javelin Throw', 'W', 'athletics', 'final', 'athletics', '{}', true),
    ('discus-throw', 'Discus Throw', 'W', 'athletics', 'final', 'athletics', '{}', true),
    ('badminton-singles', 'Badminton Singles', 'W', null, 'knockout', 'standard_match', '{}', true),
    ('archery', 'Archery', 'W', null, 'final', null, '{}', true),
    ('chess', 'Chess', 'W', null, 'knockout', 'standard_match', '{}', true),
    ('chess-general', 'Chess General', 'W', null, 'knockout', 'standard_match', '{}', true),
    ('swimming', 'Swimming', 'W', null, 'final', 'swimming', '{}', true),
    ('shot-on-target', 'Shot on Target', 'W', 'football', 'final', null, '{}', true),
    ('dart-board', 'Dart Board', 'W', null, 'final', null, '{}', true),
    ('corner-kick-goal', 'Corner Kick Goal', 'W', 'football', 'final', null, '{}', true),
    ('freestyle', 'Freestyle', 'W', null, 'final', null, '{}', true),
    ('bowling', 'Bowling', 'W', 'cricket', 'final', null, '{}', true),
    ('skipping', 'Skipping', 'W', null, 'final', null, '{}', true),
    ('sack-race', 'Sack Race', 'W', null, 'final', null, '{}', true),
    ('slow-cycle', 'Slow Cycle', 'W', null, 'final', null, '{}', true),
    ('bottle-hit', 'Bottle Hit', 'W', null, 'final', null, '{}', true),
    ('uriyadi', 'Uriyadi', 'W', null, 'final', null, '{}', true),
    ('uriyadi-general', 'Uriyadi General', 'W', null, 'final', null, '{}', true),
    ('single-leg-hula-hoop', 'Single Leg Hula Hoop', 'W', null, 'final', null, '{}', true),
    ('thread-needle', 'Thread and Needle', 'W', null, 'final', null, '{}', true),
    ('hopscotch', 'Hopscotch', 'W', null, 'final', null, '{}', true),
    ('balloon-pyramid', 'Balloon Pyramid', 'W', null, 'final', null, '{}', true),
    ('biscuit-eating', 'Biscuit Eating', 'W', null, 'final', null, '{}', true),
    ('balloon-pop', 'Balloon Pop', 'W', null, 'final', null, '{}', true),
    ('candle-race', 'Candle Race', 'W', null, 'final', null, '{}', true),
    ('musical-chair', 'Musical Chair', 'W', null, 'final', null, '{}', true),
    ('sweet-pick', 'Sweet Pick', 'W', null, 'final', null, '{}', true),
    ('basket-throw', 'Basket Throw', 'W', 'basketball', 'final', null, '{}', true),
    ('water-filling', 'Water Filling', 'W', null, 'final', null, '{}', true),

    -- X - Group: 5 / 3 / 1 (8 events)
    ('water-filling-group', 'Water Filling Group', 'X', null, 'final', null, '{}', true),
    ('three-legged-race', 'Three Legged Race', 'X', null, 'final', null, '{}', true),
    ('relay-4x50m', 'Relay 4x50m', 'X', 'athletics', 'final', 'athletics', '{}', true),
    ('relay-4x100m', 'Relay 4x100m', 'X', 'athletics', 'final', 'athletics', '{}', true),
    ('relay-4x200m', 'Relay 4x200m', 'X', 'athletics', 'final', 'athletics', '{}', true),
    ('badminton-doubles', 'Badminton Doubles', 'X', null, 'knockout', 'standard_match', '{}', true),
    ('kho-kho', 'Kho-Kho', 'X', null, 'match', null, '{}', true),
    ('dodge-ball', 'Dodge Ball', 'X', null, 'match', null, '{}', true),

    -- Y - Group: 7 / 5 / 3 (5 events)
    ('penalty-shootout', 'Penalty Shootout', 'Y', 'football', 'knockout', 'standard_match', '{}', true),
    ('tug-of-war', 'Tug of War', 'Y', 'tug-of-war', 'match', 'tug_of_war', '{"maxTeamWeightKg": 600, "notes": "Total team weight must not exceed 600 kg."}', true),
    ('commentary', 'Commentary', 'Y', null, 'final', null, '{}', true),
    ('pegasus-branding', 'Pegasus Branding', 'Y', null, 'final', null, '{}', true),
    ('march-past-cultural-show', 'March Past and Cultural Show', 'Y', null, 'final', null, '{}', true),

    -- Z - General: 10 / 7 / 5 (6 events)
    ('cricket', 'Cricket', 'Z', 'cricket', 'knockout', 'standard_match', '{}', true),
    ('volleyball', 'Volleyball', 'Z', 'volleyball', 'knockout', 'standard_match', '{}', true),
    ('football', 'Football', 'Z', 'football', 'knockout', 'standard_match', '{}', true),
    ('arm-wrestling', 'Arm Wrestling', 'Z', null, 'knockout', 'arm_wrestling', '{}', true),
    ('push-up', 'Push Up', 'Z', null, 'final', 'weightlifting', '{}', true),
    ('pull-up', 'Pull Up', 'Z', null, 'final', 'weightlifting', '{}', true),

    -- Unconfirmed Codex Classifications (7 events: point_class = NULL, is_confirmed = false)
    ('crossbar-kick', 'Crossbar Kick', null, 'football', 'final', null, '{}', false),
    ('juggling', 'Juggling', null, 'football', 'final', null, '{}', false),
    ('race-walking-100m', 'Race Walking 100m', null, 'athletics', 'final', 'athletics', '{}', false),
    ('throwball', 'Throwball', null, null, 'match', null, '{}', false),
    ('uriyadi-hifz', 'Uriyadi Hifz', null, null, 'final', null, '{}', false),
    ('chess-hifz', 'Chess Hifz', null, null, 'knockout', 'standard_match', '{}', false),
    ('swimming-hifz', 'Swimming Hifz', null, null, 'final', 'swimming', '{}', false)
) as ce(code, name, point_class, sport_slug, competition_type, scoring_engine, rules, is_confirmed)
left join public.sports sp on sp.festival_id = f.id and sp.slug = ce.sport_slug
where f.slug = 'pegasus-2026'
on conflict (festival_id, code) do update set
  name = excluded.name,
  point_class = excluded.point_class,
  sport_id = coalesce(excluded.sport_id, public.codex_events.sport_id),
  competition_type = coalesce(excluded.competition_type, public.codex_events.competition_type),
  scoring_engine = coalesce(excluded.scoring_engine, public.codex_events.scoring_engine),
  rules = excluded.rules,
  is_confirmed = excluded.is_confirmed;

-- ============================================================================
-- 5. CONFIRMED FESTIVAL EVENTS (7 Operational Events)
-- ============================================================================

insert into public.events (
  festival_id,
  sport_id,
  codex_event_id,
  code,
  name,
  point_class,
  competition_type,
  scoring_engine,
  status,
  metadata
)
select
  f.id,
  sp.id as sport_id,
  ce.id as codex_event_id,
  e.code,
  e.name,
  e.point_class::public.point_class,
  e.competition_type,
  e.scoring_engine,
  'active',
  '{}'::jsonb
from public.festivals f
cross join (
  values
    ('race-100m-majestir', 'Race 100m', 'race-100m', 'athletics', 'W', 'final', 'athletics'),
    ('long-jump-majestir', 'Long Jump', 'long-jump', 'athletics', 'W', 'final', 'athletics'),
    ('high-jump-majestir', 'High Jump', 'high-jump', 'athletics', 'W', 'final', 'athletics'),
    ('football', 'Football', 'football', 'football', 'Z', 'knockout', 'standard_match'),
    ('volleyball', 'Volleyball', 'volleyball', 'volleyball', 'Z', 'knockout', 'standard_match'),
    ('cricket', 'Cricket', 'cricket', 'cricket', 'Z', 'knockout', 'standard_match'),
    ('tug-of-war', 'Tug of War', 'tug-of-war', 'tug-of-war', 'Y', 'match', 'tug_of_war')
) as e(code, name, codex_code, sport_slug, point_class, competition_type, scoring_engine)
join public.sports sp on sp.festival_id = f.id and sp.slug = e.sport_slug
left join public.codex_events ce on ce.festival_id = f.id and ce.code = e.codex_code
where f.slug = 'pegasus-2026'
on conflict (festival_id, code) do update set
  name = excluded.name,
  sport_id = excluded.sport_id,
  codex_event_id = excluded.codex_event_id,
  point_class = excluded.point_class,
  competition_type = excluded.competition_type,
  scoring_engine = excluded.scoring_engine,
  status = excluded.status;

-- ============================================================================
-- 6. EVENT ↔ DIVISION LINKAGES
-- ============================================================================

insert into public.event_divisions (
  event_id,
  division_id
)
select
  e.id as event_id,
  d.id as division_id
from public.festivals f
cross join (
  values
    ('race-100m-majestir', 'majestir'),
    ('long-jump-majestir', 'majestir'),
    ('high-jump-majestir', 'majestir')
) as ed(event_code, division_code)
join public.events e on e.festival_id = f.id and e.code = ed.event_code
join public.divisions d on d.festival_id = f.id and d.code = ed.division_code
where f.slug = 'pegasus-2026'
on conflict (event_id, division_id) do nothing;

-- ============================================================================
-- 7. CONFIRMED EVENT QUOTAS
-- ============================================================================

insert into public.event_quotas (
  event_id,
  division_id,
  minimum_count,
  maximum_count,
  substitutes_count,
  rules
)
select
  e.id as event_id,
  d.id as division_id,
  q.minimum_count,
  q.maximum_count,
  q.substitutes_count,
  q.rules::jsonb
from public.festivals f
cross join (
  values
    ('race-100m-majestir', 'majestir', null::integer, 2, 0, '{}'),
    ('long-jump-majestir', 'majestir', null::integer, 2, 0, '{}'),
    ('high-jump-majestir', 'majestir', null::integer, 2, 0, '{}'),
    ('football', null, null::integer, 7, 3, '{}'),
    ('volleyball', null, null::integer, 6, 3, '{}'),
    ('cricket', null, null::integer, 9, 2, '{}'),
    ('tug-of-war', null, null::integer, 8, 4, '{"maxTeamWeightKg": 600, "notes": "Total team weight must not exceed 600 kg."}')
) as q(event_code, division_code, minimum_count, maximum_count, substitutes_count, rules)
join public.events e on e.festival_id = f.id and e.code = q.event_code
left join public.divisions d on d.festival_id = f.id and d.code = q.division_code
where f.slug = 'pegasus-2026'
  and not exists (
    select 1
    from public.event_quotas eq
    where eq.event_id = e.id
      and (
        (eq.division_id is null and d.id is null)
        or eq.division_id = d.id
      )
  );

