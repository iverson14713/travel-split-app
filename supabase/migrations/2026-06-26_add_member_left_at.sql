alter table travel_members
  add column if not exists left_at timestamptz;

comment on column travel_members.left_at is '成員主動退出行程時間；保留歷史記帳資料';
