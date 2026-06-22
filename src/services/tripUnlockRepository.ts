import { DB_TABLES } from '../lib/database.tables'
import { isSupabaseConfigured, requireSupabase } from '../lib/supabase'
import type { TripUnlockRecord } from './iapService'

interface TripUnlockRow {
  id: string
  trip_id: string
  transaction_id: string | null
  original_transaction_id: string | null
  product_id: string | null
  platform: string
  source: string
  unlocked_at: string
  unlock_base_start_date: string | null
  max_end_date: string | null
}

function mapRow(row: TripUnlockRow): TripUnlockRecord {
  return {
    trip_id: row.trip_id,
    transaction_id: row.transaction_id ?? '',
    original_transaction_id: row.original_transaction_id ?? row.transaction_id ?? '',
    product_id: row.product_id ?? '',
    platform: 'ios',
    unlocked_at: row.unlocked_at,
    unlock_base_start_date: row.unlock_base_start_date ?? undefined,
    max_end_date: row.max_end_date ?? undefined,
    source: row.source === 'mock' ? 'mock' : 'ios_iap',
  }
}

export async function fetchTripUnlockByTransactionId(
  transactionId: string,
): Promise<TripUnlockRecord | null> {
  if (!isSupabaseConfigured || !transactionId.trim()) return null

  const db = requireSupabase()
  const { data, error } = await db
    .from(DB_TABLES.tripUnlocks)
    .select('*')
    .eq('transaction_id', transactionId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return mapRow(data as TripUnlockRow)
}

export async function insertTripUnlock(input: {
  tripId: string
  transactionId: string
  originalTransactionId: string
  productId: string
  unlockBaseStartDate: string
  maxEndDate: string
}): Promise<TripUnlockRecord> {
  const existingByTransaction = await fetchTripUnlockByTransactionId(input.transactionId)
  if (existingByTransaction) {
    return existingByTransaction
  }

  const db = requireSupabase()

  const payload = {
    trip_id: input.tripId,
    transaction_id: input.transactionId,
    original_transaction_id: input.originalTransactionId,
    product_id: input.productId,
    platform: 'ios',
    source: 'ios_iap',
    unlocked_at: new Date().toISOString(),
    unlock_base_start_date: input.unlockBaseStartDate,
    max_end_date: input.maxEndDate,
  }

  const { data, error } = await db
    .from(DB_TABLES.tripUnlocks)
    .upsert(payload, { onConflict: 'trip_id' })
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') {
      const byTransaction = await fetchTripUnlockByTransactionId(input.transactionId)
      if (byTransaction) return byTransaction

      const byTrip = await fetchTripUnlockByTripId(input.tripId)
      if (byTrip) return byTrip
    }
    throw error
  }

  return mapRow(data as TripUnlockRow)
}

export async function fetchTripUnlockByTripId(tripId: string): Promise<TripUnlockRecord | null> {
  if (!isSupabaseConfigured) return null

  const db = requireSupabase()
  const { data, error } = await db
    .from(DB_TABLES.tripUnlocks)
    .select('*')
    .eq('trip_id', tripId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return mapRow(data as TripUnlockRow)
}

export async function fetchTripStartDateById(tripId: string): Promise<string | null> {
  if (!isSupabaseConfigured) return null

  const db = requireSupabase()
  const { data, error } = await db
    .from(DB_TABLES.trips)
    .select('start_date')
    .eq('id', tripId)
    .maybeSingle()

  if (error) throw error
  return (data as { start_date?: string } | null)?.start_date ?? null
}
