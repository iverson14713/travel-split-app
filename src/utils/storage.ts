import type { Trip, UserSession } from '../types'

const TRIPS_KEY = 'travel-split-trips'
const SESSION_KEY = 'travel-split-session'

export function getAllTrips(): Record<string, Trip> {
  try {
    const raw = localStorage.getItem(TRIPS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function saveAllTrips(trips: Record<string, Trip>): void {
  localStorage.setItem(TRIPS_KEY, JSON.stringify(trips))
}

export function getTrip(code: string): Trip | null {
  const trips = getAllTrips()
  return trips[code.toUpperCase()] ?? null
}

export function saveTrip(trip: Trip): void {
  const trips = getAllTrips()
  trips[trip.code] = trip
  saveAllTrips(trips)
}

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

export function getSessionForTrip(tripCode: string) {
  const session = getSession()
  if (!session || session.tripCode !== tripCode.toUpperCase()) return null

  const trip = getTrip(tripCode)
  if (!trip) return null

  const member = trip.members.find((m) => m.id === session.memberId)
  if (!member) return null

  return { session, member, trip }
}
