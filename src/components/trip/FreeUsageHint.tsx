import {
  getUnlockStatusLabel,
  type TripUsageSnapshot,
} from '../../services/tripUnlockService'

interface FreeUsageHintProps {
  usage: TripUsageSnapshot
  compact?: boolean
}

function formatLimit(value: number, max: number): string {
  if (!Number.isFinite(max)) return String(value)
  return `${value} / ${max}`
}

export function FreeUsageHint({ usage, compact = false }: FreeUsageHintProps) {
  const statusLabel = usage.isUnlimited ? getUnlockStatusLabel(usage.status) : null

  return (
    <div className={`free-usage-hint${usage.isUnlimited ? ' free-usage-hint--unlocked' : ''}${compact ? ' free-usage-hint--compact' : ''}`}>
      {statusLabel && <p className="free-usage-title">{statusLabel}</p>}
      {!statusLabel && <p className="free-usage-title">免費版目前使用：</p>}
      <ul className="free-usage-list">
        <li>成員：{formatLimit(usage.members, usage.maxMembers)}</li>
        <li>天數：{formatLimit(usage.days, usage.maxDays)}</li>
        <li>記帳：{formatLimit(usage.expenses, usage.maxExpenses)}</li>
      </ul>
    </div>
  )
}
