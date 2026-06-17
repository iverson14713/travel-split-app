import { useCallback, useEffect, useState } from 'react'
import type { Trip } from '../types'
import { isSupabaseConfigured } from '../lib/supabase'
import { fetchTripByCode } from '../services/tripService'

export function useTrip(code: string | undefined) {
  const [trip, setTripState] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!code) {
      setTripState(null)
      setLoading(false)
      setError(null)
      return
    }

    if (!isSupabaseConfigured) {
      setTripState(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await fetchTripByCode(code)
      setTripState(data)
    } catch (err) {
      setTripState(null)
      setError(err instanceof Error ? err.message : '載入旅行資料失敗')
    } finally {
      setLoading(false)
    }
  }, [code])

  useEffect(() => {
    reload()
  }, [reload])

  useEffect(() => {
    const onFocus = () => reload()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [reload])

  return { trip, loading, error, reload }
}
