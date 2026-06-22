-- Consumable IAP：防止同一筆 transaction_id 重複寫入
create unique index if not exists trip_unlocks_transaction_id_unique_idx
  on trip_unlocks (transaction_id)
  where transaction_id is not null;
