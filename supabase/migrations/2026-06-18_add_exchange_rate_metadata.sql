-- Add exchange rate metadata if base migration was applied earlier

alter table travel_trips
add column if not exists exchange_rate_source text not null default 'fallback';

alter table travel_trips
add column if not exists exchange_rate_fetched_at timestamptz;
