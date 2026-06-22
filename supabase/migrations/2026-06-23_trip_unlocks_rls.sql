alter table trip_unlocks enable row level security;

create policy "travel_anon_select_trip_unlocks"
  on trip_unlocks for select to anon using (true);

create policy "travel_anon_insert_trip_unlocks"
  on trip_unlocks for insert to anon with check (true);

create policy "travel_anon_update_trip_unlocks"
  on trip_unlocks for update to anon using (true) with check (true);
