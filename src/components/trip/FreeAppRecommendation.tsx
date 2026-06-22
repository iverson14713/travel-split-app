import { useMemo } from 'react'
import type { Trip } from '../../types'
import { pickAppRecommendation } from '../../constants/appRecommendations'
import { useTripUnlock } from '../../hooks/useTripUnlock'
import { Button } from '../ui/Button'

interface FreeAppRecommendationProps {
  trip: Trip
}

export function FreeAppRecommendation({ trip }: FreeAppRecommendationProps) {
  const { unlocked } = useTripUnlock(trip)
  const recommendation = useMemo(() => pickAppRecommendation(trip.id), [trip.id])

  if (unlocked) return null

  const handleOpen = () => {
    window.open(recommendation.url, '_blank', 'noopener,noreferrer')
  }

  return (
    <section className="app-recommendation" aria-label="更多 App 推薦">
      <h3 className="app-recommendation-title">你可能也會喜歡</h3>
      <div className="app-recommendation-card">
        <span className="app-recommendation-icon" aria-hidden="true">
          {recommendation.icon}
        </span>
        <div className="app-recommendation-body">
          <p className="app-recommendation-name">{recommendation.name}</p>
          <p className="app-recommendation-desc">{recommendation.description}</p>
        </div>
        <Button size="sm" variant="outline" type="button" onClick={handleOpen}>
          查看
        </Button>
      </div>
    </section>
  )
}
