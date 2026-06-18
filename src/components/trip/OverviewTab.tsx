import { useMemo } from 'react'
import type { Trip } from '../../types'
import {
  calculateMyBalanceInTwd,
  calculateMyTotalCostInTwd,
  formatAmount,
} from '../../utils/settlement'
import { Card } from '../ui/Card'

interface OverviewTabProps {
  trip: Trip
  currentMemberId?: string
}

function getBalanceLabel(balance: number): string {
  if (balance > 0) return '目前大家還需要給你'
  if (balance < 0) return '你目前還需要付'
  return '目前已平帳'
}

function BalanceDisplay({ balance }: { balance: number }) {
  const label = getBalanceLabel(balance)

  if (balance === 0) {
    return (
      <div className="overview-balance-row">
        <p className="overview-card-label">{label}</p>
        <p className="overview-card-value overview-card-value--balanced">已平帳</p>
      </div>
    )
  }

  return (
    <div className="overview-balance-row">
      <p className="overview-card-label">{label}</p>
      <p
        className={`overview-card-value ${
          balance > 0
            ? 'overview-card-value--positive'
            : 'overview-card-value--negative'
        }`}
      >
        TWD {formatAmount(balance, 'TWD')}
      </p>
    </div>
  )
}

export function OverviewTab({ trip, currentMemberId }: OverviewTabProps) {
  const tripRates = useMemo(() => trip.exchangeRatesToTwd, [trip.exchangeRatesToTwd])

  const twdBalance = useMemo(() => {
    if (!currentMemberId) return 0
    return calculateMyBalanceInTwd(trip.expenses, trip.members, currentMemberId, tripRates)
  }, [trip.expenses, trip.members, currentMemberId, tripRates])

  const twdTotalCost = useMemo(() => {
    if (!currentMemberId) return 0
    return calculateMyTotalCostInTwd(trip.expenses, currentMemberId, tripRates)
  }, [trip.expenses, currentMemberId, tripRates])

  return (
    <div className="tab-panel tab-panel--overview">
      {trip.status === 'archived' && (
        <div className="archived-hint">
          <span>📌</span>
          <p>這趟旅行已封存，新增內容會自動恢復為進行中</p>
        </div>
      )}

      <Card className="overview-card overview-card--balance">
        <h3 className="overview-section-title">我的帳務狀態</h3>
        {!currentMemberId ? (
          <p className="overview-card-hint">請先加入旅行後才能查看帳務</p>
        ) : (
          <BalanceDisplay balance={twdBalance} />
        )}
      </Card>

      <Card className="overview-card">
        <h3 className="overview-section-title">我的總花費</h3>
        <p className="overview-card-value">TWD {formatAmount(twdTotalCost, 'TWD')}</p>
        <p className="overview-card-hint">你在消費支出中應分攤的金額</p>
      </Card>

      <p className="overview-footnote">
        台幣金額依記帳當下匯率估算，實際刷卡金額可能略有差異。
      </p>
    </div>
  )
}
