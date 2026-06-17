import { useCallback, useEffect, useState } from 'react'
import type { Trip } from '../types'
import { getTrip, saveTrip } from '../utils/storage'

const TRIPS_KEY = 'travel-split-trips'

export function useTrip(code: string | undefined) {
  const [trip, setTripState] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(() => {
    if (!code) {
      setTripState(null)
      setLoading(false)
      return
    }
    const found = getTrip(code)
    setTripState(found)
    setLoading(false)
  }, [code])

  useEffect(() => {
    reload()
  }, [reload])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === TRIPS_KEY) reload()
    }
    const onFocus = () => reload()

    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)

    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [reload])

  const updateTrip = useCallback(
    (updater: (prev: Trip) => Trip) => {
      if (!code) return
      const current = getTrip(code)
      if (!current) return
      const updated = updater(current)
      saveTrip(updated)
      setTripState(updated)
    },
    [code],
  )

  return { trip, loading, updateTrip, reload }
}
