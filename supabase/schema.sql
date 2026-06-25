-- 旅分帳 Supabase Schema
-- 貼到 Supabase SQL Editor 執行

-- ============================================================
-- Tables
-- ============================================================

create table if not exists travel_trips (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  destination text,
  start_date date,
  end_date date,
  status text not null default 'active'
    check (status in ('active', 'archived')),
  last_activity_at timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at timestamptz,
  edit_permission text not null default 'owner_only'
    check (edit_permission in ('owner_only', 'all_members')),
  itinerary_locked boolean not null default false,
  base_currency text not null default 'TWD',
  jpy_to_twd_rate numeric not null default 0.215,
  usd_to_twd_rate numeric not null default 32,
  exchange_rate_source text not null default 'fallback',
  exchange_rate_fetched_at timestamptz,
  exchange_rates_to_twd jsonb not null default '{}',
  estimated_member_count int,
  owner_member_id uuid references travel_members(id) on delete set null,
  created_by_device_id text,
  created_at timestamptz not null default now()
);

create table if not exists travel_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references travel_trips(id) on delete cascade,
  name text not null,
  role text not null default 'member'
    check (role in ('owner', 'member')),
  status text not null default 'active'
    check (status in ('active', 'removed')),
  removed_at timestamptz,
  left_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists travel_itinerary_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references travel_trips(id) on delete cascade,
  day_index int not null,
  time text,
  title text not null,
  location text,
  note text,
  created_by uuid references travel_members(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists travel_expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references travel_trips(id) on delete cascade,
  payer_member_id uuid references travel_members(id) on delete set null,
  receiver_member_id uuid references travel_members(id) on delete set null,
  type text not null default 'expense'
    check (type in ('expense', 'transfer')),
  amount numeric not null,
  currency text not null default 'JPY',
  category text,
  note text,
  participant_member_ids uuid[] not null default '{}',
  exchange_rate_to_twd numeric not null default 1,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Indexes
-- ============================================================

create index if not exists idx_travel_trips_code on travel_trips(code);
create index if not exists idx_travel_members_trip_id on travel_members(trip_id);
create index if not exists idx_travel_itinerary_items_trip_id on travel_itinerary_items(trip_id);
create index if not exists idx_travel_expenses_trip_id on travel_expenses(trip_id);

-- ============================================================
-- Row Level Security (MVP: open anon access)
-- ============================================================

alter table travel_trips enable row level security;
alter table travel_members enable row level security;
alter table travel_itinerary_items enable row level security;
alter table travel_expenses enable row level security;

-- travel_trips
create policy "travel_anon_select_trips"
  on travel_trips for select to anon using (true);

create policy "travel_anon_insert_trips"
  on travel_trips for insert to anon with check (true);

create policy "travel_anon_update_trips"
  on travel_trips for update to anon using (true) with check (true);

-- travel_members
create policy "travel_anon_select_members"
  on travel_members for select to anon using (true);

create policy "travel_anon_insert_members"
  on travel_members for insert to anon with check (true);

create policy "travel_anon_update_members"
  on travel_members for update to anon using (true) with check (true);

create policy "travel_anon_delete_members"
  on travel_members for delete to anon using (true);

-- travel_itinerary_items
create policy "travel_anon_select_itinerary_items"
  on travel_itinerary_items for select to anon using (true);

create policy "travel_anon_insert_itinerary_items"
  on travel_itinerary_items for insert to anon with check (true);

create policy "travel_anon_update_itinerary_items"
  on travel_itinerary_items for update to anon using (true) with check (true);

create policy "travel_anon_delete_itinerary_items"
  on travel_itinerary_items for delete to anon using (true);

-- travel_expenses
create policy "travel_anon_select_expenses"
  on travel_expenses for select to anon using (true);

create policy "travel_anon_insert_expenses"
  on travel_expenses for insert to anon with check (true);

create policy "travel_anon_update_expenses"
  on travel_expenses for update to anon using (true) with check (true);

create policy "travel_anon_delete_expenses"
  on travel_expenses for delete to anon using (true);

-- trip_unlocks（iOS IAP 單趟解鎖）
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
create unique index if not exists trip_unlocks_transaction_id_unique_idx
  on trip_unlocks (transaction_id)
  where transaction_id is not null;

alter table trip_unlocks enable row level security;

create policy "travel_anon_select_trip_unlocks"
  on trip_unlocks for select to anon using (true);

create policy "travel_anon_insert_trip_unlocks"
  on trip_unlocks for insert to anon with check (true);

create policy "travel_anon_update_trip_unlocks"
  on trip_unlocks for update to anon using (true) with check (true);

-- ============================================================
-- Notes: future automated cleanup
-- ============================================================
-- MVP 目前採 soft delete（travel_trips.deleted_at）與封存（status=archived）。
-- 未來可使用 Supabase Edge Function 或 Scheduled Function：
-- - 清理 last_activity_at 超過 180 天且 deleted_at is not null 的資料
-- - 或針對 archived 超過一定時間的旅行做清理/匯出備份
