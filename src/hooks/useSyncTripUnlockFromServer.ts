import { useEffect } from 'react'
import { syncTripUnlockFromServer } from '../services/iapService'

export function useSyncTripUnlockFromServer(
  tripId: string | undefined,
  onSynced?: () => void,
): void {
  useEffect(() => {
    if (!tripId) return

    let cancelled = false

    void syncTripUnlockFromServer(tripId).then((synced) => {
      if (!cancelled && synced) {
        onSynced?.()
      }
    })

    return () => {
      cancelled = true
    }
  }, [tripId, onSynced])
}
