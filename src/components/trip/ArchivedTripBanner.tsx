interface ArchivedTripBannerProps {
  compact?: boolean
}

export function ArchivedTripBanner({ compact = false }: ArchivedTripBannerProps) {
  return (
    <div className={`archived-banner${compact ? ' archived-banner--compact' : ''}`}>
      <p className="archived-banner-title">這趟旅行已封存</p>
      <p className="archived-banner-detail">資料仍可查看，但已不再列為進行中的旅行。</p>
    </div>
  )
}

export const ARCHIVED_VIEW_ONLY_HINT = '已封存旅行僅供查看'
