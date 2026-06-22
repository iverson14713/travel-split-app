import { FREE_TRIP_RETENTION_DAYS } from '../constants/tripRetention'
import { addDaysToDateString, formatDisplayDate, normalizeDateString } from './dates'
import { getTodayDateString, isTripPastEndDate } from './tripLifecycle'
import { isTripUnlocked } from '../services/tripUnlockService'

export type TripRetentionInput = {
  endDate?: string
  unlocked?: boolean
  tripId?: string
}

export function resolveTripUnlocked(trip: TripRetentionInput): boolean {
  if (trip.tripId) return isTripUnlocked(trip.tripId)
  return trip.unlocked === true
}

export function getFreeRetentionUntil(endDate: string): string {
  return addDaysToDateString(endDate, FREE_TRIP_RETENTION_DAYS)
}

export function formatRetentionUntilLabel(endDate: string): string {
  return formatDisplayDate(getFreeRetentionUntil(endDate))
}

/** 免費且已結束、超過 retention_until */
export function isFreeTripRetentionExpired(trip: TripRetentionInput): boolean {
  if (resolveTripUnlocked(trip)) return false
  if (!trip.endDate) return false
  const endDate = normalizeDateString(trip.endDate)
  if (!isTripPastEndDate({ ...trip, endDate })) return false
  return getTodayDateString() > getFreeRetentionUntil(endDate)
}

/** 免費、已結束、尚在保留期內 */
export function shouldShowFreeRetentionHint(trip: TripRetentionInput): boolean {
  if (resolveTripUnlocked(trip)) return false
  if (!trip.endDate) return false
  const endDate = normalizeDateString(trip.endDate)
  if (!isTripPastEndDate({ ...trip, endDate })) return false
  return !isFreeTripRetentionExpired({ ...trip, endDate })
}

export const UNLOCKED_LONG_TERM_LABEL = '已解鎖・長期保留'

export const UNLOCKED_LONG_TERM_HINT = '旅程結束後仍可查看行程、記帳與結算資料。'

export const FREE_RETENTION_UNLOCK_HINT = '如需長期保存，請解鎖這趟旅程。'
