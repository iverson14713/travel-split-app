import { useCallback, useMemo, useState } from 'react'
import type { Trip } from '../types'
import {
  getEffectiveTripUnlockStatus,
  getTripUsageLimits,
  isTripUnlocked,
  type TripUsageSnapshot,
  type TripUnlockStatus,
} from '../services/tripUnlockService'

export function useTripUnlock(trip: Trip | null | undefined) {
  const [version, setVersion] = useState(0)

  const refresh = useCallback(() => {
    setVersion((v) => v + 1)
  }, [])

  const tripId = trip?.id ?? ''

  const status: TripUnlockStatus = useMemo(() => {
    if (!tripId) return 'free'
    return getEffectiveTripUnlockStatus(tripId)
  }, [tripId, version])

  const unlocked = useMemo(() => {
    if (!tripId) return false
    return isTripUnlocked(tripId)
  }, [tripId, version])

  const usage: TripUsageSnapshot | null = useMemo(() => {
    if (!trip) return null
    return getTripUsageLimits(trip)
  }, [trip, version])

  return { status, unlocked, usage, refresh }
}
