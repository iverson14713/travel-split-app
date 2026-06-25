import type { TripStatus } from '../types'
import { addDaysToDateString, normalizeDateString } from './dates'

export const SETTLING_GRACE_DAYS = 7

/** 首頁列表與旅程狀態顯示用 */
export type HomeListPhase = 'active' | 'upcoming' | 'settling' | 'ended' | 'archived'

export type TripLifecyclePhase = HomeListPhase

export type TripDisplayStatus = HomeListPhase

export type TripEditBlockReason = 'ended' | 'archived'

export type TripItineraryBlockReason = 'ended' | 'archived' | 'settling' | 'locked'

export const TRIP_LIST_PHASE_LABELS: Record<HomeListPhase, string> = {
  active: '進行中',
  upcoming: '即將開始',
  settling: '待整理',
  ended: '已結束',
  archived: '已封存',
}

export const TRIP_LIFECYCLE_LABELS: Record<TripLifecyclePhase, string> = TRIP_LIST_PHASE_LABELS

export const TRIP_SETTLING_VIEW_HINT =
  '旅程已結束，可在整理期間補記支出與完成結算。'

export const TRIP_ENDED_VIEW_HINT =
  '這趟旅程已結束，資料仍可查看與結算，但不能再新增或編輯支出。'

export const TRIP_ARCHIVED_VIEW_HINT = '這趟旅程已封存，僅供查看。'

export type TripLifecycleInput = {
  status?: TripStatus
  startDate?: string
  endDate?: string
}

export type TripLifecycleOptions = {
  today?: string
}

export function getTodayDateString(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function isTripArchived(trip: TripLifecycleInput): boolean {
  return trip.status === 'archived'
}

function getSettlingUntil(endDate: string): string {
  return addDaysToDateString(endDate, SETTLING_GRACE_DAYS)
}

export function getTripDisplayStatus(
  trip: TripLifecycleInput,
  options?: TripLifecycleOptions,
): TripDisplayStatus {
  if (isTripArchived(trip)) return 'archived'

  const today = normalizeDateString(options?.today ?? getTodayDateString())
  const startDate = normalizeDateString(trip.startDate)
  const endDate = normalizeDateString(trip.endDate)

  if (startDate && today < startDate) return 'upcoming'
  if (endDate && today > endDate) {
    const settlingUntil = getSettlingUntil(endDate)
    if (today <= settlingUntil) return 'settling'
    return 'ended'
  }
  return 'active'
}

export function isTripUpcoming(
  trip: TripLifecycleInput,
  options?: TripLifecycleOptions,
): boolean {
  return getTripDisplayStatus(trip, options) === 'upcoming'
}

/** 日曆上的旅程已結束（含整理期） */
export function isTripPastEndDate(
  trip: TripLifecycleInput,
  options?: TripLifecycleOptions,
): boolean {
  if (isTripArchived(trip)) return false
  const today = normalizeDateString(options?.today ?? getTodayDateString())
  const endDate = normalizeDateString(trip.endDate)
  return Boolean(endDate && today > endDate)
}

/** 整理期也已過，完全鎖定編輯 */
export function isTripEnded(
  trip: TripLifecycleInput,
  options?: TripLifecycleOptions,
): boolean {
  return getTripDisplayStatus(trip, options) === 'ended'
}

export function isTripSettling(
  trip: TripLifecycleInput,
  options?: TripLifecycleOptions,
): boolean {
  return getTripDisplayStatus(trip, options) === 'settling'
}

export function getHomeListPhase(
  trip: TripLifecycleInput,
  options?: TripLifecycleOptions,
): HomeListPhase {
  return getTripDisplayStatus(trip, options)
}

/** @deprecated 請改用 getTripDisplayStatus */
export function getTripLifecyclePhase(
  trip: TripLifecycleInput,
  options?: TripLifecycleOptions,
): TripLifecyclePhase {
  return getTripDisplayStatus(trip, options)
}

export function canEditItinerary(
  trip: TripLifecycleInput,
  options?: TripLifecycleOptions,
): boolean {
  const status = getTripDisplayStatus(trip, options)
  return status === 'upcoming' || status === 'active'
}

export function canEditItineraryNotes(
  trip: TripLifecycleInput,
  options?: TripLifecycleOptions,
): boolean {
  return getTripDisplayStatus(trip, options) === 'settling'
}

export function canAddItinerary(
  trip: TripLifecycleInput,
  options?: TripLifecycleOptions,
): boolean {
  return canEditItinerary(trip, options)
}

export function canEditExpense(
  trip: TripLifecycleInput,
  options?: TripLifecycleOptions,
): boolean {
  const status = getTripDisplayStatus(trip, options)
  return status === 'upcoming' || status === 'active' || status === 'settling'
}

export function canSettle(
  trip: TripLifecycleInput,
  options?: TripLifecycleOptions,
): boolean {
  const status = getTripDisplayStatus(trip, options)
  return status === 'active' || status === 'settling' || status === 'ended'
}

/** @deprecated 請改用 canSettle */
export function canRecordRepayment(
  trip: TripLifecycleInput,
  options?: TripLifecycleOptions,
): boolean {
  return canSettle(trip, options)
}

export function canModifyTripDates(
  trip: TripLifecycleInput,
  options?: TripLifecycleOptions,
): boolean {
  return canEditItinerary(trip, options)
}

/** @deprecated 請改用 canEditItinerary / canEditExpense */
export function canEditTrip(
  trip: TripLifecycleInput,
  options?: TripLifecycleOptions,
): boolean {
  return canEditItinerary(trip, options)
}

/** @deprecated 請改用 canEditItinerary / canEditExpense */
export function canEditTripContent(
  trip: TripLifecycleInput,
  options?: TripLifecycleOptions,
): boolean {
  return canEditItinerary(trip, options)
}

export function getExpenseEditBlockedReason(
  trip: TripLifecycleInput,
  options?: TripLifecycleOptions,
): TripEditBlockReason | null {
  if (isTripArchived(trip)) return 'archived'
  if (!canEditExpense(trip, options)) return 'ended'
  return null
}

export function getItineraryAddBlockedReason(
  trip: TripLifecycleInput,
  options?: TripLifecycleOptions,
): TripItineraryBlockReason | null {
  if (isTripArchived(trip)) return 'archived'
  const status = getTripDisplayStatus(trip, options)
  if (status === 'ended') return 'ended'
  if (status === 'settling') return 'settling'
  if (!canAddItinerary(trip, options)) return 'ended'
  return null
}

/** @deprecated 請改用 getExpenseEditBlockedReason 或 getItineraryAddBlockedReason */
export function getTripEditBlockedReason(
  trip: TripLifecycleInput,
  options?: TripLifecycleOptions,
): TripEditBlockReason | null {
  return getExpenseEditBlockedReason(trip, options)
}
