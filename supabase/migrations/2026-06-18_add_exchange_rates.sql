-- Manual / API exchange rates for TWD estimation

alter table travel_trips
add column if not exists base_currency text not null default 'TWD';

alter table travel_trips
add column if not exists jpy_to_twd_rate numeric not null default 0.215;

alter table travel_trips
add column if not exists usd_to_twd_rate numeric not null default 32;

alter table travel_trips
add column if not exists exchange_rate_source text not null default 'fallback';

alter table travel_trips
add column if not exists exchange_rate_fetched_at timestamptz;

alter table travel_expenses
add column if not exists exchange_rate_to_twd numeric not null default 1;
