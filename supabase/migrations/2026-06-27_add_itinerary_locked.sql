alter table travel_trips
  add column if not exists itinerary_locked boolean not null default false;

comment on column travel_trips.itinerary_locked is '鎖定後僅主揪可編輯行程；記帳不受影響';
