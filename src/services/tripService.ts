import { requireSupabase } from '../lib/supabase'
import { DB_TABLES } from '../lib/database.tables'
import type { EditPermission, Expense, ExpenseType, ItineraryItem, Member, Trip, TripStatus } from '../types'
import { generateTripCode } from '../utils/tripCode'

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
  created_at: string
}

interface MemberRow {
  id: string
  trip_id: string
  name: string
  role: 'owner' | 'member'
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
  category: string | null
  note: string | null
  participant_member_ids: string[]
  created_at: string
}

function mapMember(row: MemberRow): Member {
  return {
    id: row.id,
    nickname: row.name,
    isHost: row.role === 'owner',
    joinedAt: row.created_at,
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

function mapExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    type: row.type ?? 'expense',
    amount: Number(row.amount),
    currency: row.currency,
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
    members: members.map(mapMember),
    itinerary: itinerary.map(mapItinerary),
    expenses: expenses.map(mapExpense),
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
}

export interface CreateTripResult {
  trip: Trip
  memberId: string
}

export async function createTrip(input: CreateTripInput): Promise<CreateTripResult> {
  const db = requireSupabase()
  const code = await generateUniqueCode()

  const { data: tripRow, error: tripError } = await db
    .from(DB_TABLES.trips)
    .insert({
      code,
      name: input.name,
      destination: input.destination,
      start_date: input.startDate,
      end_date: input.endDate,
      edit_permission: 'owner_only',
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

export async function addExpense(input: {
  tripId: string
  type: ExpenseType
  payerMemberId: string
  receiverMemberId?: string
  amount: number
  currency: string
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
    category: input.category,
    note: input.note || null,
    participant_member_ids: input.participantMemberIds,
  })

  if (error) throw error
  await reviveTripIfArchived(input.tripId)
  await touchTripActivity(input.tripId)
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
