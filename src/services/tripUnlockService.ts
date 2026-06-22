import {
  ABSOLUTE_MAX_TRIP_DAYS,
  ESTIMATED_MEMBER_FIVE_PLUS,
  FREE_LIMITS,
  UNLOCKED_LIMITS,
  type EstimatedMemberCount,
} from '../constants/freeLimits'
import type { Trip } from '../types'
import { getActiveMemberCount } from '../utils/members'
import { getTripDays } from '../utils/dates'

export type TripUnlockStatus = 'free' | 'unlocked' | 'developer_unlocked'

export type UpgradeReason =
  | 'member_limit'
  | 'member_limit_full'
  | 'create_member_limit'
  | 'day_limit'
  | 'expense_limit'
  | 'manual_unlock'

export type TripUnlockOverride = 'free' | 'unlocked'

const STORAGE_PREFIX = 'travel_split_'

function storageKey(suffix: string): string {
  return `${STORAGE_PREFIX}${suffix}`
}

function readBool(key: string): boolean {
  try {
    return localStorage.getItem(key) === 'true'
  } catch {
    return false
  }
}

function writeBool(key: string, value: boolean): void {
  try {
    if (value) localStorage.setItem(key, 'true')
    else localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

function readOverride(tripId: string): TripUnlockOverride | null {
  try {
    const raw = localStorage.getItem(storageKey(`trip_unlock_override_${tripId}`))
    if (raw === 'free' || raw === 'unlocked') return raw
    return null
  } catch {
    return null
  }
}

export function getDeveloperGlobalUnlock(): boolean {
  return readBool(storageKey('developer_global_unlock'))
}

export function setDeveloperGlobalUnlock(enabled: boolean): void {
  writeBool(storageKey('developer_global_unlock'), enabled)
}

export function getTripUnlockOverride(tripId: string): TripUnlockOverride | null {
  return readOverride(tripId)
}

export function setTripUnlockOverride(tripId: string, value: TripUnlockOverride | null): void {
  const key = storageKey(`trip_unlock_override_${tripId}`)
  try {
    if (value) localStorage.setItem(key, value)
    else localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

export function isTripMockUnlocked(tripId: string): boolean {
  return readBool(storageKey(`trip_mock_unlock_${tripId}`))
}

export function setTripMockUnlocked(tripId: string, unlocked: boolean): void {
  writeBool(storageKey(`trip_mock_unlock_${tripId}`), unlocked)
}

export function isTripPurchasedUnlocked(tripId: string): boolean {
  return readBool(storageKey(`trip_purchased_unlock_${tripId}`))
}

/** Reserved for future IAP – not used by mock unlock */
export function setTripPurchasedUnlocked(tripId: string, unlocked: boolean): void {
  writeBool(storageKey(`trip_purchased_unlock_${tripId}`), unlocked)
}

export function mockUnlockTrip(tripId: string): void {
  setTripMockUnlocked(tripId, true)
}

export function getEffectiveTripUnlockStatus(tripId: string): TripUnlockStatus {
  const override = readOverride(tripId)
  if (override === 'free') return 'free'
  if (override === 'unlocked') return 'unlocked'
  if (getDeveloperGlobalUnlock()) return 'developer_unlocked'
  if (isTripPurchasedUnlocked(tripId) || isTripMockUnlocked(tripId)) return 'unlocked'
  return 'free'
}

export function isTripUnlocked(tripId: string): boolean {
  return getEffectiveTripUnlockStatus(tripId) !== 'free'
}

export function getTripDayCount(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0
  return getTripDays(startDate, endDate).length
}

export function countTripExpenses(trip: Trip): number {
  return trip.expenses.length
}

export interface TripUsageSnapshot {
  members: number
  days: number
  expenses: number
  maxMembers: number
  maxDays: number
  maxExpenses: number
  isUnlimited: boolean
  status: TripUnlockStatus
}

export function exceedsAbsoluteMaxDays(startDate: string, endDate: string): boolean {
  return getTripDayCount(startDate, endDate) > ABSOLUTE_MAX_TRIP_DAYS
}

export function getTripUsageLimits(trip: Trip): TripUsageSnapshot {
  const status = getEffectiveTripUnlockStatus(trip.id)
  const isUnlimited = status !== 'free'

  return {
    members: getActiveMemberCount(trip.members),
    days: getTripDayCount(trip.startDate, trip.endDate),
    expenses: countTripExpenses(trip),
    maxMembers: isUnlimited ? Infinity : FREE_LIMITS.maxMembers,
    maxDays: isUnlimited ? UNLOCKED_LIMITS.maxDays : FREE_LIMITS.maxDays,
    maxExpenses: isUnlimited ? Infinity : FREE_LIMITS.maxExpenses,
    isUnlimited,
    status,
  }
}

export function shouldShowUpgrade(reason: UpgradeReason, tripId: string): boolean {
  if (isTripUnlocked(tripId)) return false
  return reason !== 'manual_unlock' || !isTripUnlocked(tripId)
}

export function checkCreateMemberPlan(count: EstimatedMemberCount): UpgradeReason | null {
  if (getDeveloperGlobalUnlock()) return null
  if (count === ESTIMATED_MEMBER_FIVE_PLUS) return 'create_member_limit'
  return null
}

export function checkMemberLimit(trip: Trip): UpgradeReason | null {
  if (isTripUnlocked(trip.id)) return null
  if (getActiveMemberCount(trip.members) >= FREE_LIMITS.maxMembers) return 'member_limit'
  return null
}

export function checkDayLimit(startDate: string, endDate: string, tripId?: string): UpgradeReason | null {
  if (exceedsAbsoluteMaxDays(startDate, endDate)) return null
  if (tripId && isTripUnlocked(tripId)) return null
  const days = getTripDayCount(startDate, endDate)
  if (days > FREE_LIMITS.maxDays) return 'day_limit'
  return null
}

export function checkExpenseLimit(trip: Trip): UpgradeReason | null {
  if (isTripUnlocked(trip.id)) return null
  if (countTripExpenses(trip) >= FREE_LIMITS.maxExpenses) return 'expense_limit'
  return null
}

export function getUpgradeReasonCopy(reason: UpgradeReason): { headline: string; detail: string } {
  switch (reason) {
    case 'create_member_limit':
      return {
        headline: '5 人以上旅程需要解鎖',
        detail: '免費版適合 4 人以內小旅行。如果這趟旅程有 5 位以上同伴，解鎖後可加入更多成員並使用完整功能。',
      }
    case 'member_limit_full':
      return {
        headline: '免費版成員已滿',
        detail: '目前 4 / 4 位成員。解鎖這趟旅程後，可以邀請更多同伴加入。',
      }
    case 'member_limit':
      return {
        headline: '成員已達免費上限',
        detail: '免費版最多 4 位成員。解鎖這趟旅程後，可加入更多同伴。',
      }
    case 'day_limit':
      return {
        headline: '天數已達免費上限',
        detail: '免費版最多規劃 5 天。解鎖後這趟旅程可支援最多 30 天。',
      }
    case 'expense_limit':
      return {
        headline: '記帳已達免費上限',
        detail: '免費版最多 30 筆記帳。解鎖後可不限筆數記帳。',
      }
    default:
      return { headline: '', detail: '' }
  }
}

export function getUpgradeModalTitle(reason: UpgradeReason): string {
  if (reason === 'create_member_limit') return '5 人以上旅程需要解鎖'
  return '解鎖這趟旅行'
}

export function getUpgradeLeadCopy(reason: UpgradeReason): string {
  if (reason === 'create_member_limit') {
    return '免費版適合 4 人以內小旅行。如果這趟旅程有 5 位以上同伴，解鎖後可加入更多成員並使用完整功能。'
  }
  return '免費版適合 5 天內小旅行。解鎖後這趟旅程可支援最多 30 天、更多成員與不限記帳筆數。'
}

export function getUnlockStatusLabel(status: TripUnlockStatus): string {
  switch (status) {
    case 'developer_unlocked':
      return '開發者模式：完整功能已啟用'
    case 'unlocked':
      return '此旅程已解鎖完整功能'
    default:
      return ''
  }
}
