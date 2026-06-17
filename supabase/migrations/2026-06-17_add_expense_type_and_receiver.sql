-- Migration: add type + receiver_member_id to travel_expenses

alter table travel_expenses
add column if not exists type text not null default 'expense'
check (type in ('expense', 'transfer'));

alter table travel_expenses
add column if not exists receiver_member_id uuid references travel_members(id) on delete set null;

