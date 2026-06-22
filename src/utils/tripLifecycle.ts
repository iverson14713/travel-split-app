import type { TripStatus } from '../types'

/** 首頁列表與旅程狀態顯示用 */
export type HomeListPhase = 'active' | 'upcoming' | 'ended' | 'archived'

/** 旅程房內編輯限制等仍用三態（不含即將開始） */
export type TripLifecyclePhase = 'active' | 'ended' | 'archived'

export const TRIP_LIST_PHASE_LABELS: Record<HomeListPhase, string> = {
  active: '進行中',
  upcoming: '即將開始',
  ended: '已結束',
  archived: '已封存',
}

export const TRIP_LIFECYCLE_LABELS: Record<TripLifecyclePhase, string> = {
  active: '進行中',
  ended: '已結束',
  archived: '已封存',
}

export const TRIP_ENDED_VIEW_HINT =
  '這趟旅程已結束，仍可查看行程、記帳與結算。如需新的旅行，請建立新的旅程。'

export type TripLifecycleInput = {
  status?: TripStatus
  startDate?: string
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

export function isTripUpcoming(trip: TripLifecycleInput): boolean {
  if (isTripArchived(trip)) return false
  if (!trip.startDate) return false
  return getTodayDateString() < trip.startDate
}

export function isTripEnded(trip: TripLifecycleInput): boolean {
  if (isTripArchived(trip)) return false
  if (!trip.endDate) return false
  return getTodayDateString() > trip.endDate
}

/** 首頁四區塊分類 */
export function getHomeListPhase(trip: TripLifecycleInput): HomeListPhase {
  if (isTripArchived(trip)) return 'archived'
  if (isTripUpcoming(trip)) return 'upcoming'
  if (isTripEnded(trip)) return 'ended'
  return 'active'
}

/** 旅程房內：進行中 / 已結束 / 已封存（即將開始視同進行中以前，不可編輯內容） */
export function getTripLifecyclePhase(trip: TripLifecycleInput): TripLifecyclePhase {
  if (isTripArchived(trip)) return 'archived'
  if (isTripEnded(trip)) return 'ended'
  return 'active'
}

/** 進行中才可新增 / 編輯 / 刪除行程與支出 */
export function canEditTripContent(trip: TripLifecycleInput): boolean {
  return getTripLifecyclePhase(trip) === 'active' && !isTripUpcoming(trip)
}

/** 進行中或已結束可記錄還款；已封存不可 */
export function canRecordRepayment(trip: TripLifecycleInput): boolean {
  const phase = getTripLifecyclePhase(trip)
  return phase === 'active' || phase === 'ended'
}

/** 進行中才可修改旅程日期 */
export function canModifyTripDates(trip: TripLifecycleInput): boolean {
  return getTripLifecyclePhase(trip) === 'active' && !isTripUpcoming(trip)
}
