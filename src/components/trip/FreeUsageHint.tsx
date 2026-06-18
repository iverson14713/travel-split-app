import { FREE_LIMITS } from '../../constants/freeLimits'
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
  if (usage.isUnlimited) {
    const label = getUnlockStatusLabel(usage.status)
    if (!label) return null
    return <p className={`free-usage-hint free-usage-hint--unlocked${compact ? ' free-usage-hint--compact' : ''}`}>{label}</p>
  }

  return (
    <div className={`free-usage-hint${compact ? ' free-usage-hint--compact' : ''}`}>
      <p className="free-usage-title">免費版目前使用：</p>
      <ul className="free-usage-list">
        <li>成員：{formatLimit(usage.members, FREE_LIMITS.maxMembers)}</li>
        <li>天數：{formatLimit(usage.days, FREE_LIMITS.maxDays)}</li>
        <li>記帳：{formatLimit(usage.expenses, FREE_LIMITS.maxExpenses)}</li>
      </ul>
    </div>
  )
}
