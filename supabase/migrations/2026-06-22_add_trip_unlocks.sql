-- 單趟解鎖紀錄（預留給 iOS IAP / 後端同步，目前 mock unlock 仍使用 localStorage）
create table if not exists trip_unlocks (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references travel_trips(id) on delete cascade,
  transaction_id text,
  original_transaction_id text,
  product_id text,
  platform text not null default 'ios',
  source text not null default 'ios_iap',
  unlocked_at timestamptz not null default now(),
  unlock_base_start_date date,
  max_end_date date,
  unique (trip_id)
);

create index if not exists trip_unlocks_trip_id_idx on trip_unlocks (trip_id);
create index if not exists trip_unlocks_original_transaction_id_idx on trip_unlocks (original_transaction_id);
