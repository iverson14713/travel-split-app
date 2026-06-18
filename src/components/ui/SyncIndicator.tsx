interface SyncIndicatorProps {
  visible: boolean
  label?: string
}

export function SyncIndicator({ visible, label = '同步中...' }: SyncIndicatorProps) {
  if (!visible) return null

  return (
    <span className="sync-indicator" role="status" aria-live="polite">
      {label}
    </span>
  )
}
