import type { TripStatus } from '../types'

export type TripLifecyclePhase = 'active' | 'ended' | 'archived'

export const TRIP_LIFECYCLE_LABELS: Record<TripLifecyclePhase, string> = {
  active: '進行中',
  ended: '已結束',
  archived: '已封存',
}

export const TRIP_ENDED_VIEW_HINT =
  '這趟旅程已結束，仍可查看行程、記帳與結算。如需新的旅行，請建立新的旅程。'

type TripLifecycleInput = {
  status?: TripStatus
  endDate?: string
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

export function isTripEnded(trip: TripLifecycleInput): boolean {
  if (isTripArchived(trip)) return false
  if (!trip.endDate) return false
  return getTodayDateString() > trip.endDate
}

export function getTripLifecyclePhase(trip: TripLifecycleInput): TripLifecyclePhase {
  if (isTripArchived(trip)) return 'archived'
  if (isTripEnded(trip)) return 'ended'
  return 'active'
}

/** 進行中才可新增 / 編輯 / 刪除行程與支出 */
export function canEditTripContent(trip: TripLifecycleInput): boolean {
  return getTripLifecyclePhase(trip) === 'active'
}

/** 進行中或已結束可記錄還款；已封存不可 */
export function canRecordRepayment(trip: TripLifecycleInput): boolean {
  const phase = getTripLifecyclePhase(trip)
  return phase === 'active' || phase === 'ended'
}

/** 進行中才可修改旅程日期 */
export function canModifyTripDates(trip: TripLifecycleInput): boolean {
  return getTripLifecyclePhase(trip) === 'active'
}
