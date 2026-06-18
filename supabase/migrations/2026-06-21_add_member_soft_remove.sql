alter table travel_members
  add column if not exists status text not null default 'active'
    check (status in ('active', 'removed'));

alter table travel_members
  add column if not exists removed_at timestamptz;

comment on column travel_members.status is 'active = 在旅程中；removed = 主揪軟移除';
comment on column travel_members.removed_at is '軟移除時間';
