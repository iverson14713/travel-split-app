import { useEffect } from 'react'
import { DB_TABLES } from '../lib/database.tables'
import { isSupabaseConfigured, requireSupabase } from '../lib/supabase'

export function useItineraryRealtime(tripId: string | undefined, onChange: () => void) {
  useEffect(() => {
    if (!tripId || !isSupabaseConfigured) return

    const db = requireSupabase()
    const channel = db
      .channel(`itinerary-${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: DB_TABLES.itineraryItems,
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          onChange()
        },
      )
      .subscribe()

    return () => {
      db.removeChannel(channel)
    }
  }, [tripId, onChange])
}
