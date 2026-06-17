import type { UserSession } from '../types'

const SESSION_KEY = 'travel-split-session'

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
