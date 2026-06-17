-- Migration: add lifecycle fields to travel_trips

alter table travel_trips
add column if not exists status text not null default 'active'
check (status in ('active', 'archived'));

alter table travel_trips
add column if not exists last_activity_at timestamptz not null default now();

alter table travel_trips
add column if not exists archived_at timestamptz;

alter table travel_trips
add column if not exists deleted_at timestamptz;

