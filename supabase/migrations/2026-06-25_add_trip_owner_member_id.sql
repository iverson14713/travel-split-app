-- Immutable trip owner reference + creator device id
alter table travel_trips
  add column if not exists owner_member_id uuid references travel_members(id) on delete set null,
  add column if not exists created_by_device_id text;

create index if not exists idx_travel_trips_owner_member_id on travel_trips(owner_member_id);

-- Backfill owner_member_id from earliest active owner/member when missing
update travel_trips t
set owner_member_id = sub.id
from (
  select distinct on (m.trip_id)
    m.trip_id,
    m.id
  from travel_members m
  where m.status = 'active'
    and m.removed_at is null
  order by m.trip_id, m.created_at asc
) sub
where t.id = sub.trip_id
  and t.owner_member_id is null;

-- Ensure only the canonical owner keeps role = owner per trip
with canonical_owner as (
  select distinct on (trip_id)
    trip_id,
    id as owner_id
  from travel_members
  where status = 'active'
    and removed_at is null
  order by trip_id, created_at asc
)
update travel_members m
set role = case when m.id = co.owner_id then 'owner' else 'member' end
from canonical_owner co
where m.trip_id = co.trip_id
  and m.status = 'active'
  and m.removed_at is null
  and m.role is distinct from case when m.id = co.owner_id then 'owner' else 'member' end;
