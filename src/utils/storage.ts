import type { RecentTrip, TripStatus, UserSession } from '../types'

const SESSION_KEY = 'travel-split-session'
const RECENT_TRIPS_KEY = 'travel-split-recent-trips'
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

export function hasSessionForTrip(tripCode: string): boolean {
  const session = getSession()
  return session?.tripCode === tripCode.toUpperCase()
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
  const normalized: RecentTrip = {
    tripCode: entry.tripCode.toUpperCase(),
    tripName: entry.tripName,
    destination: entry.destination,
    memberId: entry.memberId,
    memberName: entry.memberName,
    lastOpenedAt: now,
    status: entry.status ?? existing?.status ?? 'active',
    startDate: entry.startDate ?? existing?.startDate,
    endDate: entry.endDate ?? existing?.endDate,
    memberCount: entry.memberCount ?? existing?.memberCount,
  }

  const others = getRecentTrips().filter((t) => t.tripCode !== normalized.tripCode)
  const updated = [normalized, ...others].slice(0, MAX_RECENT_TRIPS)

  localStorage.setItem(RECENT_TRIPS_KEY, JSON.stringify(updated))
}

export function updateRecentTripStatus(tripCode: string, status: TripStatus): void {
  const normalizedCode = tripCode.toUpperCase()
  const trips = getRecentTrips()
  if (!trips.some((t) => t.tripCode === normalizedCode)) return

  const updated = trips.map((t) =>
    t.tripCode === normalizedCode ? { ...t, status } : t,
  )
  localStorage.setItem(RECENT_TRIPS_KEY, JSON.stringify(updated))
}
