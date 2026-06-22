import { useEffect, useState } from 'react'
import { TRIP_UNLOCK_PRICE_LABEL } from '../constants/freeLimits'
import { fetchTripUnlockProductPriceLabel } from '../services/iapService'

export function useTripUnlockPriceLabel(): string {
  const [label, setLabel] = useState(TRIP_UNLOCK_PRICE_LABEL)

  useEffect(() => {
    let cancelled = false
    fetchTripUnlockProductPriceLabel().then((price) => {
      if (!cancelled) setLabel(price)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return label
}
