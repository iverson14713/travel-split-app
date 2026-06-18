alter table travel_trips
  add column if not exists estimated_member_count int;

comment on column travel_trips.estimated_member_count is '建立時預計同行人數；5 代表 5 人以上';
