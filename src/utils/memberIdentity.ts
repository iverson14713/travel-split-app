const DEVICE_ID_KEY = 'travel-split-device-id'

function tripMemberIdKey(tripId: string): string {
  return `trip_member_id_${tripId}`
}

function tripNicknameKey(tripId: string): string {
  return `trip_nickname_${tripId}`
}

export function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY)
    if (existing) return existing

    const id = crypto.randomUUID()
    localStorage.setItem(DEVICE_ID_KEY, id)
    return id
  } catch {
    return 'unknown-device'
  }
}

export function getTripMemberId(tripId: string): string | null {
  try {
    return localStorage.getItem(tripMemberIdKey(tripId))
  } catch {
    return null
  }
}

export function getTripNickname(tripId: string): string | null {
  try {
    return localStorage.getItem(tripNicknameKey(tripId))
  } catch {
    return null
  }
}

export function setTripMemberIdentity(
  tripId: string,
  memberId: string,
  nickname?: string,
): void {
  try {
    localStorage.setItem(tripMemberIdKey(tripId), memberId)
    if (nickname) {
      localStorage.setItem(tripNicknameKey(tripId), nickname)
    }
  } catch {
    // Ignore storage failures; session fallback may still work for this visit.
  }
}

export function updateTripNickname(tripId: string, nickname: string): void {
  try {
    localStorage.setItem(tripNicknameKey(tripId), nickname)
  } catch {
    // Ignore storage failures.
  }
}

export function clearTripMemberIdentity(tripId: string): void {
  try {
    localStorage.removeItem(tripMemberIdKey(tripId))
    localStorage.removeItem(tripNicknameKey(tripId))
  } catch {
    // Ignore storage failures.
  }
}
