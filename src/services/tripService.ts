import { requireSupabase } from '../lib/supabase'
import { DB_TABLES } from '../lib/database.tables'
import type { EditPermission, ExchangeRateSource, Expense, ExpenseType, ItineraryItem, Member, MemberStatus, Trip, TripStatus } from '../types'
import { generateTripCode } from '../utils/tripCode'
import { FALLBACK_RATES_TO_TWD, getRateFromTripMap } from './exchangeRateService'

interface TripRow {
  id: string
  code: string
  name: string
  destination: string | null
  start_date: string | null
  end_date: string | null
  status: TripStatus
  last_activity_at: string
  archived_at: string | null
  deleted_at: string | null
  edit_permission: EditPermission
  base_currency: string
  jpy_to_twd_rate: number
  usd_to_twd_rate: number
  exchange_rate_source: ExchangeRateSource
  exchange_rate_fetched_at: string | null
  exchange_rates_to_twd: Record<string, number> | null
  estimated_member_count: number | null
  created_at: string
}

interface MemberRow {
  id: string
  trip_id: string
  name: string
  role: 'owner' | 'member'
  status?: MemberStatus | null
  removed_at?: string | null
  created_at: string
}

interface ItineraryRow {
  id: string
  trip_id: string
  day_index: number
  time: string | null
  title: string
  location: string | null
  note: string | null
  created_by: string | null
  created_at: string
}

interface ExpenseRow {
  id: string
  trip_id: string
  payer_member_id: string | null
  receiver_member_id: string | null
  type: ExpenseType
  amount: number
  currency: string
  exchange_rate_to_twd: number | null
  category: string | null
  note: string | null
  participant_member_ids: string[]
  created_at: string
}

function mapMember(row: MemberRow): Member {
  const status: MemberStatus =
    row.status === 'removed' || row.removed_at != null ? 'removed' : 'active'

  return {
    id: row.id,
    nickname: row.name,
    isHost: row.role === 'owner',
    joinedAt: row.created_at,
    status,
    removedAt: row.removed_at ?? undefined,
  }
}

function mapItinerary(row: ItineraryRow): ItineraryItem {
  return {
    id: row.id,
    day: row.day_index,
    time: row.time ?? '',
    title: row.title,
    location: row.location ?? '',
    note: row.note ?? '',
  }
}

function normalizeTripExchangeRates(row: TripRow): Record<string, number> {
  const raw = row.exchange_rates_to_twd
  if (raw && typeof raw === 'object' && Object.keys(raw).length > 0) {
    const map: Record<string, number> = { ...FALLBACK_RATES_TO_TWD, TWD: 1 }
    for (const [code, value] of Object.entries(raw)) {
      const num = Number(value)
      if (Number.isFinite(num) && num > 0) map[code.toUpperCase()] = num
    }
    map.JPY = map.JPY ?? Number(row.jpy_to_twd_rate ?? 0.215)
    map.USD = map.USD ?? Number(row.usd_to_twd_rate ?? 32)
    return map
  }

  return {
    ...FALLBACK_RATES_TO_TWD,
    TWD: 1,
    JPY: Number(row.jpy_to_twd_rate ?? 0.215),
    USD: Number(row.usd_to_twd_rate ?? 32),
  }
}

function mapExpense(row: ExpenseRow, exchangeRatesToTwd: Record<string, number>): Expense {
  const currency = (row.currency || 'TWD').toUpperCase()
  let exchangeRateToTwd = row.exchange_rate_to_twd != null ? Number(row.exchange_rate_to_twd) : NaN
  if (!Number.isFinite(exchangeRateToTwd) || exchangeRateToTwd <= 0) {
    exchangeRateToTwd = getRateFromTripMap(currency, exchangeRatesToTwd)
  }

  return {
    id: row.id,
    type: row.type ?? 'expense',
    amount: Number(row.amount),
    currency: row.currency,
    exchangeRateToTwd,
    payerId: row.payer_member_id ?? '',
    receiverId: row.receiver_member_id ?? undefined,
    participantIds: row.participant_member_ids ?? [],
    category: row.category ?? '',
    note: row.note ?? '',
    createdAt: row.created_at,
  }
}

function mapTrip(
  row: TripRow,
  members: MemberRow[],
  itinerary: ItineraryRow[],
  expenses: ExpenseRow[],
): Trip {
  const exchangeRatesToTwd = normalizeTripExchangeRates(row)
  const jpyToTwdRate = exchangeRatesToTwd.JPY ?? Number(row.jpy_to_twd_rate ?? 0.215)
  const usdToTwdRate = exchangeRatesToTwd.USD ?? Number(row.usd_to_twd_rate ?? 32)

  return {
    id: row.id,
    code: row.code,
    name: row.name,
    destination: row.destination ?? '',
    startDate: row.start_date ?? '',
    endDate: row.end_date ?? '',
    status: row.status ?? 'active',
    lastActivityAt: row.last_activity_at,
    archivedAt: row.archived_at ?? undefined,
    editPermission: row.edit_permission as EditPermission,
    baseCurrency: row.base_currency ?? 'TWD',
    jpyToTwdRate,
    usdToTwdRate,
    exchangeRateSource: row.exchange_rate_source ?? 'fallback',
    exchangeRateFetchedAt: row.exchange_rate_fetched_at ?? undefined,
    exchangeRatesToTwd,
    estimatedMemberCount: row.estimated_member_count ?? undefined,
    members: members.map(mapMember),
    itinerary: itinerary.map(mapItinerary),
    expenses: expenses.map((expenseRow) => mapExpense(expenseRow, exchangeRatesToTwd)),
    createdAt: row.created_at,
  }
}

async function touchTripActivity(tripId: string): Promise<void> {
  const db = requireSupabase()
  const { error } = await db
    .from(DB_TABLES.trips)
    .update({ last_activity_at: new Date().toISOString() })
    .eq('id', tripId)
  if (error) throw error
}

async function reviveTripIfArchived(tripId: string): Promise<void> {
  const db = requireSupabase()
  const now = new Date().toISOString()
  const { error } = await db
    .from(DB_TABLES.trips)
    .update({ status: 'active', archived_at: null, last_activity_at: now })
    .eq('id', tripId)
    .eq('status', 'archived')
  if (error) throw error
}

export async function fetchTripByCode(code: string): Promise<Trip | null> {
  const db = requireSupabase()
  const normalizedCode = code.trim().toUpperCase()

  const { data: tripRow, error: tripError } = await db
    .from(DB_TABLES.trips)
    .select('*')
    .eq('code', normalizedCode)
    .is('deleted_at', null)
    .maybeSingle()

  if (tripError) throw tripError
  if (!tripRow) return null

  const [membersResult, itineraryResult, expensesResult] = await Promise.all([
    db.from(DB_TABLES.members).select('*').eq('trip_id', tripRow.id).order('created_at'),
    db.from(DB_TABLES.itineraryItems).select('*').eq('trip_id', tripRow.id).order('day_index'),
    db.from(DB_TABLES.expenses).select('*').eq('trip_id', tripRow.id).order('created_at', { ascending: false }),
  ])

  if (membersResult.error) throw membersResult.error
  if (itineraryResult.error) throw itineraryResult.error
  if (expensesResult.error) throw expensesResult.error

  return mapTrip(tripRow, membersResult.data, itineraryResult.data, expensesResult.data)
}

export async function tripCodeExists(code: string): Promise<boolean> {
  const db = requireSupabase()
  const { data, error } = await db
    .from(DB_TABLES.trips)
    .select('id')
    .eq('code', code.toUpperCase())
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error
  return !!data
}

async function generateUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateTripCode()
    const exists = await tripCodeExists(code)
    if (!exists) return code
  }
  throw new Error('無法產生唯一的旅行代碼，請再試一次')
}

export interface CreateTripInput {
  name: string
  destination: string
  startDate: string
  endDate: string
  ownerName?: string
  estimatedMemberCount?: number
  exchangeRatesToTwd?: Record<string, number>
  jpyToTwdRate?: number
  usdToTwdRate?: number
  exchangeRateSource?: ExchangeRateSource
  exchangeRateFetchedAt?: string
}

export interface CreateTripResult {
  trip: Trip
  memberId: string
}

export async function createTrip(input: CreateTripInput): Promise<CreateTripResult> {
  const db = requireSupabase()
  const code = await generateUniqueCode()

  const exchangeRatesToTwd = input.exchangeRatesToTwd ?? {
    ...FALLBACK_RATES_TO_TWD,
    TWD: 1,
    JPY: input.jpyToTwdRate ?? 0.215,
    USD: input.usdToTwdRate ?? 32,
  }

  const { data: tripRow, error: tripError } = await db
    .from(DB_TABLES.trips)
    .insert({
      code,
      name: input.name,
      destination: input.destination,
      start_date: input.startDate,
      end_date: input.endDate,
      edit_permission: 'owner_only',
      base_currency: 'TWD',
      jpy_to_twd_rate: exchangeRatesToTwd.JPY ?? input.jpyToTwdRate ?? 0.215,
      usd_to_twd_rate: exchangeRatesToTwd.USD ?? input.usdToTwdRate ?? 32,
      exchange_rates_to_twd: exchangeRatesToTwd,
      exchange_rate_source: input.exchangeRateSource ?? 'fallback',
      exchange_rate_fetched_at: input.exchangeRateFetchedAt ?? null,
      estimated_member_count: input.estimatedMemberCount ?? null,
    })
    .select()
    .single()

  if (tripError) throw tripError

  const { data: memberRow, error: memberError } = await db
    .from(DB_TABLES.members)
    .insert({
      trip_id: tripRow.id,
      name: input.ownerName?.trim() || '主揪',
      role: 'owner',
    })
    .select()
    .single()

  if (memberError) throw memberError

  const trip = mapTrip(tripRow, [memberRow], [], [])
  return { trip, memberId: memberRow.id }
}

export async function joinTrip(tripId: string, nickname: string): Promise<Member> {
  const db = requireSupabase()

  const { data, error } = await db
    .from(DB_TABLES.members)
    .insert({
      trip_id: tripId,
      name: nickname,
      role: 'member',
    })
    .select()
    .single()

  if (error) throw error
  await touchTripActivity(tripId)
  return mapMember(data)
}

export async function addItineraryItem(input: {
  tripId: string
  dayIndex: number
  time: string
  title: string
  location: string
  note: string
  createdBy?: string
}): Promise<void> {
  const db = requireSupabase()

  const { error } = await db.from(DB_TABLES.itineraryItems).insert({
    trip_id: input.tripId,
    day_index: input.dayIndex,
    time: input.time || null,
    title: input.title,
    location: input.location || null,
    note: input.note || null,
    created_by: input.createdBy ?? null,
  })

  if (error) throw error
  await reviveTripIfArchived(input.tripId)
  await touchTripActivity(input.tripId)
}

export async function updateItineraryItem(
  itemId: string,
  input: {
    tripId: string
    dayIndex: number
    time: string
    title: string
    location: string
    note: string
  },
): Promise<void> {
  const db = requireSupabase()

  const { error } = await db
    .from(DB_TABLES.itineraryItems)
    .update({
      day_index: input.dayIndex,
      time: input.time || null,
      title: input.title,
      location: input.location || null,
      note: input.note || null,
    })
    .eq('id', itemId)

  if (error) throw error
  await reviveTripIfArchived(input.tripId)
  await touchTripActivity(input.tripId)
}

export async function deleteItineraryItem(itemId: string, tripId: string): Promise<void> {
  const db = requireSupabase()

  const { error } = await db.from(DB_TABLES.itineraryItems).delete().eq('id', itemId)

  if (error) throw error
  await touchTripActivity(tripId)
}

export async function addExpense(input: {
  tripId: string
  type: ExpenseType
  payerMemberId: string
  receiverMemberId?: string
  amount: number
  currency: string
  exchangeRateToTwd: number
  category: string
  note: string
  participantMemberIds: string[]
}): Promise<void> {
  const db = requireSupabase()

  const { error } = await db.from(DB_TABLES.expenses).insert({
    trip_id: input.tripId,
    type: input.type,
    payer_member_id: input.payerMemberId,
    receiver_member_id: input.receiverMemberId ?? null,
    amount: input.amount,
    currency: input.currency,
    exchange_rate_to_twd: input.exchangeRateToTwd,
    category: input.category,
    note: input.note || null,
    participant_member_ids: input.participantMemberIds,
  })

  if (error) throw error
  await reviveTripIfArchived(input.tripId)
  await touchTripActivity(input.tripId)
}

export async function updateExpense(
  expenseId: string,
  input: {
    tripId: string
    type: ExpenseType
    payerMemberId: string
    receiverMemberId?: string
    amount: number
    currency: string
    exchangeRateToTwd: number
    category: string
    note: string
    participantMemberIds: string[]
  },
): Promise<void> {
  const db = requireSupabase()

  const { error } = await db
    .from(DB_TABLES.expenses)
    .update({
      type: input.type,
      payer_member_id: input.payerMemberId,
      receiver_member_id: input.receiverMemberId ?? null,
      amount: input.amount,
      currency: input.currency,
      exchange_rate_to_twd: input.exchangeRateToTwd,
      category: input.category,
      note: input.note || null,
      participant_member_ids: input.participantMemberIds,
    })
    .eq('id', expenseId)

  if (error) throw error
  await reviveTripIfArchived(input.tripId)
  await touchTripActivity(input.tripId)
}

export async function deleteExpense(expenseId: string, tripId: string): Promise<void> {
  const db = requireSupabase()

  const { error } = await db.from(DB_TABLES.expenses).delete().eq('id', expenseId)

  if (error) throw error
  await reviveTripIfArchived(tripId)
  await touchTripActivity(tripId)
}

export async function updateMemberName(memberId: string, name: string): Promise<void> {
  const db = requireSupabase()

  const { data, error } = await db
    .from(DB_TABLES.members)
    .update({ name })
    .eq('id', memberId)
    .select('trip_id')
    .single()

  if (error) throw error
  await touchTripActivity(data.trip_id)
}

export async function removeMember(memberId: string, tripId: string): Promise<void> {
  const db = requireSupabase()
  const now = new Date().toISOString()

  const { data: memberRow, error: fetchError } = await db
    .from(DB_TABLES.members)
    .select('id, role, status, removed_at')
    .eq('id', memberId)
    .eq('trip_id', tripId)
    .maybeSingle()

  if (fetchError) throw fetchError
  if (!memberRow) throw new Error('找不到此成員')
  if (memberRow.role === 'owner') throw new Error('無法移除主揪')
  if (memberRow.status === 'removed' || memberRow.removed_at != null) {
    throw new Error('此成員已不在旅程中')
  }

  const { error } = await db
    .from(DB_TABLES.members)
    .update({ status: 'removed', removed_at: now })
    .eq('id', memberId)
    .eq('trip_id', tripId)

  if (error) throw error
  await touchTripActivity(tripId)
}

export async function updateEditPermission(
  tripId: string,
  permission: EditPermission,
): Promise<void> {
  const db = requireSupabase()

  const { error } = await db
    .from(DB_TABLES.trips)
    .update({ edit_permission: permission, last_activity_at: new Date().toISOString() })
    .eq('id', tripId)

  if (error) throw error
}

export async function updateTripDates(
  tripId: string,
  startDate: string,
  endDate: string,
): Promise<void> {
  const db = requireSupabase()

  const { error } = await db
    .from(DB_TABLES.trips)
    .update({
      start_date: startDate,
      end_date: endDate,
      last_activity_at: new Date().toISOString(),
    })
    .eq('id', tripId)

  if (error) throw error
}

export async function updateExchangeRates(
  tripId: string,
  rates: {
    exchangeRatesToTwd: Record<string, number>
    exchangeRateSource?: ExchangeRateSource
    exchangeRateFetchedAt?: string
  },
): Promise<void> {
  const db = requireSupabase()
  const jpyToTwdRate = rates.exchangeRatesToTwd.JPY ?? 0.215
  const usdToTwdRate = rates.exchangeRatesToTwd.USD ?? 32

  const payload: Record<string, string | number | Record<string, number>> = {
    exchange_rates_to_twd: rates.exchangeRatesToTwd,
    jpy_to_twd_rate: jpyToTwdRate,
    usd_to_twd_rate: usdToTwdRate,
    last_activity_at: new Date().toISOString(),
  }

  if (rates.exchangeRateSource) {
    payload.exchange_rate_source = rates.exchangeRateSource
  }
  if (rates.exchangeRateFetchedAt) {
    payload.exchange_rate_fetched_at = rates.exchangeRateFetchedAt
  }

  const { error } = await db.from(DB_TABLES.trips).update(payload).eq('id', tripId)

  if (error) throw error
}

export async function archiveTrip(tripId: string): Promise<void> {
  const db = requireSupabase()
  const now = new Date().toISOString()
  const { error } = await db
    .from(DB_TABLES.trips)
    .update({ status: 'archived', archived_at: now, last_activity_at: now })
    .eq('id', tripId)
  if (error) throw error
}

export async function restoreTrip(tripId: string): Promise<void> {
  const db = requireSupabase()
  const now = new Date().toISOString()
  const { error } = await db
    .from(DB_TABLES.trips)
    .update({ status: 'active', archived_at: null, last_activity_at: now })
    .eq('id', tripId)
  if (error) throw error
}

export async function softDeleteTrip(tripId: string): Promise<void> {
  const db = requireSupabase()
  const now = new Date().toISOString()
  const { error } = await db
    .from(DB_TABLES.trips)
    .update({ deleted_at: now, last_activity_at: now })
    .eq('id', tripId)
  if (error) throw error
}

export async function getTripAvailabilityByCode(code: string): Promise<{
  id: string
  name: string
  deleted: boolean
} | null> {
  const db = requireSupabase()
  const normalizedCode = code.trim().toUpperCase()
  const { data, error } = await db
    .from(DB_TABLES.trips)
    .select('id,name,deleted_at')
    .eq('code', normalizedCode)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return { id: data.id, name: data.name, deleted: data.deleted_at != null }
}
