import type { RecentTrip, TripStatus, UserSession } from '../types'
import { getTripMemberId, getTripNickname } from './memberIdentity'

const SESSION_KEY = 'travel-split-session'
/** 本機近期旅程列表（等同 recent_trip_ids 用途） */
export const RECENT_TRIPS_STORAGE_KEY = 'travel-split-recent-trips'
const RECENT_TRIPS_KEY = RECENT_TRIPS_STORAGE_KEY
const ONBOARDING_KEY = 'onboarding_seen'

export function hasSeenOnboarding(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === 'true'
}

export function setOnboardingSeen(): void {
  localStorage.setItem(ONBOARDING_KEY, 'true')
}
const MAX_RECENT_TRIPS = 20

export function getSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setSession(session: UserSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}

export function hasSessionForTrip(tripCode: string, tripId?: string): boolean {
  if (tripId) {
    const memberId = getTripMemberId(tripId)
    if (memberId) return true
  }

  const session = getSession()
  return session?.tripCode === tripCode.toUpperCase() && !!session.memberId
}

export function getRecentTrips(): RecentTrip[] {
  try {
    const raw = localStorage.getItem(RECENT_TRIPS_KEY)
    const trips: RecentTrip[] = raw ? JSON.parse(raw) : []
    return trips.sort(
      (a, b) => new Date(b.lastOpenedAt).getTime() - new Date(a.lastOpenedAt).getTime(),
    )
  } catch {
    return []
  }
}

export function recordRecentTrip(
  entry: Omit<RecentTrip, 'lastOpenedAt'> & { lastOpenedAt?: string },
): void {
  const now = entry.lastOpenedAt ?? new Date().toISOString()
  const existing = getRecentTrips().find((t) => t.tripCode === entry.tripCode.toUpperCase())
  const tripId = entry.tripId ?? existing?.tripId
  const storedMemberId = tripId ? getTripMemberId(tripId) : null
  const storedNickname = tripId ? getTripNickname(tripId) : null
  const normalized: RecentTrip = {
    tripCode: entry.tripCode.toUpperCase(),
    tripId,
    tripName: entry.tripName,
    destination: entry.destination,
    memberId: storedMemberId ?? entry.memberId,
    memberName: storedNickname ?? entry.memberName,
    lastOpenedAt: now,
    status: entry.status ?? existing?.status ?? 'active',
    startDate: entry.startDate ?? existing?.startDate,
    endDate: entry.endDate ?? existing?.endDate,
    memberCount: entry.memberCount ?? existing?.memberCount,
    unlocked: entry.unlocked ?? existing?.unlocked,
    archivedAt: entry.archivedAt ?? existing?.archivedAt,
  }

  const others = getRecentTrips().filter((t) => t.tripCode !== normalized.tripCode)
  const updated = [normalized, ...others].slice(0, MAX_RECENT_TRIPS)

  localStorage.setItem(RECENT_TRIPS_KEY, JSON.stringify(updated))
}

export function updateRecentTripUnlocked(tripCode: string, unlocked: boolean): void {
  const normalizedCode = tripCode.toUpperCase()
  const trips = getRecentTrips()
  if (!trips.some((t) => t.tripCode === normalizedCode)) return

  const updated = trips.map((t) =>
    t.tripCode === normalizedCode ? { ...t, unlocked } : t,
  )
  localStorage.setItem(RECENT_TRIPS_KEY, JSON.stringify(updated))
}

export function updateRecentTripStatus(tripCode: string, status: TripStatus): void {
  const normalizedCode = tripCode.toUpperCase()
  const trips = getRecentTrips()
  if (!trips.some((t) => t.tripCode === normalizedCode)) return

  const updated = trips.map((t) =>
    t.tripCode === normalizedCode
      ? {
          ...t,
          status,
          archivedAt:
            status === 'archived'
              ? t.archivedAt ?? new Date().toISOString()
              : undefined,
        }
      : t,
  )
  localStorage.setItem(RECENT_TRIPS_KEY, JSON.stringify(updated))
}
