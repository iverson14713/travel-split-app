alter table travel_trips
add column if not exists exchange_rates_to_twd jsonb not null default '{}';
