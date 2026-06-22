import { useState } from 'react'
import type { Trip } from '../../types'
import { pickRandomOwnedAppPromo } from '../../constants/appRecommendations'
import { useTripUnlock } from '../../hooks/useTripUnlock'
import { openExternalUrl } from '../../utils/openExternalUrl'
import { Button } from '../ui/Button'

interface FreeAppRecommendationProps {
  trip: Trip
}

export function FreeAppRecommendation({ trip }: FreeAppRecommendationProps) {
  const { unlocked } = useTripUnlock(trip)
  const [promo] = useState(() => pickRandomOwnedAppPromo())

  if (unlocked) return null

  const handleOpen = () => {
    void openExternalUrl(promo.url)
  }

  return (
    <section className="app-recommendation" aria-label="更多 App 推薦">
      <h3 className="app-recommendation-title">你可能也會喜歡</h3>
      <div className="app-recommendation-card">
        <img
          className="app-recommendation-icon-img"
          src={promo.icon}
          alt=""
          width={48}
          height={48}
          loading="lazy"
        />
        <div className="app-recommendation-body">
          <p className="app-recommendation-name">{promo.name}</p>
          <p className="app-recommendation-desc">{promo.description}</p>
        </div>
        <Button size="sm" variant="outline" type="button" onClick={handleOpen}>
          查看
        </Button>
      </div>
    </section>
  )
}
