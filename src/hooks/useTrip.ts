import { useCallback, useEffect, useRef, useState } from 'react'
import type { Trip } from '../types'
import { isSupabaseConfigured } from '../lib/supabase'
import { fetchTripByCode } from '../services/tripService'

export interface ReloadOptions {
  /** Background refresh – keep current UI visible */
  silent?: boolean
  /** Force full initial load even when trip data already exists */
  forceInitial?: boolean
}

export function useTrip(code: string | undefined) {
  const [trip, setTripState] = useState<Trip | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const tripRef = useRef<Trip | null>(null)

  useEffect(() => {
    tripRef.current = trip
  }, [trip])

  const reload = useCallback(async (options?: ReloadOptions) => {
    if (!code) {
      tripRef.current = null
      setTripState(null)
      setInitialLoading(false)
      setRefreshing(false)
      setError(null)
      return
    }

    if (!isSupabaseConfigured) {
      tripRef.current = null
      setTripState(null)
      setInitialLoading(false)
      setRefreshing(false)
      return
    }

    const hasData = tripRef.current != null
    const isBackground =
      options?.silent === true || (hasData && options?.forceInitial !== true)

    if (isBackground) {
      setRefreshing(true)
    } else {
      setInitialLoading(true)
      setError(null)
    }

    try {
      const data = await fetchTripByCode(code)
      setTripState(data)
      tripRef.current = data
    } catch (err) {
      if (!isBackground) {
        tripRef.current = null
        setTripState(null)
        setError(err instanceof Error ? err.message : '載入旅行資料失敗')
      }
    } finally {
      if (isBackground) {
        setRefreshing(false)
      } else {
        setInitialLoading(false)
      }
    }
  }, [code])

  useEffect(() => {
    tripRef.current = null
    setTripState(null)
    setInitialLoading(true)
    setRefreshing(false)
    setError(null)
  }, [code])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    const onResume = () => {
      if (document.visibilityState !== 'visible') return
      void reload({ silent: true })
    }

    window.addEventListener('focus', onResume)
    document.addEventListener('visibilitychange', onResume)
    return () => {
      window.removeEventListener('focus', onResume)
      document.removeEventListener('visibilitychange', onResume)
    }
  }, [reload])

  return {
    trip,
    initialLoading,
    refreshing,
    error,
    reload,
  }
}
