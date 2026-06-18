import { useCallback, useEffect, useState } from 'react'
import type { Trip } from '../types'
import { isSupabaseConfigured } from '../lib/supabase'
import { fetchTripByCode } from '../services/tripService'

export interface ReloadOptions {
  silent?: boolean
}

export function useTrip(code: string | undefined) {
  const [trip, setTripState] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async (options?: ReloadOptions) => {
    const silent = options?.silent === true

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

    if (!silent) {
      setLoading(true)
      setError(null)
    }

    try {
      const data = await fetchTripByCode(code)
      setTripState(data)
    } catch (err) {
      if (!silent) {
        setTripState(null)
        setError(err instanceof Error ? err.message : '載入旅行資料失敗')
      }
    } finally {
      if (!silent) {
        setLoading(false)
      }
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
