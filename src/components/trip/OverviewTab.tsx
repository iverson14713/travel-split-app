import { useMemo, useState } from 'react'
import type { Trip } from '../../types'
import {
  calculateMyBalance,
  calculateMyBalanceInTwd,
  calculateMyTotalCost,
  calculateMyTotalCostInTwd,
  DISPLAY_MODE_OPTIONS,
  formatAmount,
  type DisplayMode,
} from '../../utils/settlement'
import { Card } from '../ui/Card'
import { Select } from '../ui/Select'

interface OverviewTabProps {
  trip: Trip
  currentMemberId?: string
}

function getBalanceLabel(balance: number): string {
  if (balance > 0) return '目前大家還需要給你'
  if (balance < 0) return '你目前還需要付'
  return '目前已平帳'
}

function BalanceDisplay({ currency, balance }: { currency: string; balance: number }) {
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
        {currency} {formatAmount(balance, currency)}
      </p>
    </div>
  )
}

export function OverviewTab({ trip, currentMemberId }: OverviewTabProps) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('twd_estimate')
  const tripRates = useMemo(
    () => ({ jpyToTwdRate: trip.jpyToTwdRate, usdToTwdRate: trip.usdToTwdRate }),
    [trip.jpyToTwdRate, trip.usdToTwdRate],
  )

  const twdBalance = useMemo(() => {
    if (!currentMemberId) return 0
    return calculateMyBalanceInTwd(trip.expenses, trip.members, currentMemberId, tripRates)
  }, [trip.expenses, trip.members, currentMemberId, tripRates])

  const twdTotalCost = useMemo(() => {
    if (!currentMemberId) return 0
    return calculateMyTotalCostInTwd(trip.expenses, currentMemberId, tripRates)
  }, [trip.expenses, currentMemberId, tripRates])

  const originalBalances = useMemo(() => {
    if (!currentMemberId) return []
    return calculateMyBalance(trip.expenses, trip.members, currentMemberId, 'ALL')
  }, [trip.expenses, trip.members, currentMemberId])

  const originalTotalCosts = useMemo(() => {
    if (!currentMemberId) return []
    return calculateMyTotalCost(trip.expenses, currentMemberId, 'ALL')
  }, [trip.expenses, currentMemberId])

  return (
    <div className="tab-panel tab-panel--overview">
      {trip.status === 'archived' && (
        <div className="archived-hint">
          <span>📌</span>
          <p>這趟旅行已封存，新增內容會自動恢復為進行中</p>
        </div>
      )}

      <Select
        label="顯示方式"
        value={displayMode}
        onChange={(e) => setDisplayMode(e.target.value as DisplayMode)}
        options={DISPLAY_MODE_OPTIONS}
      />

      <Card className="overview-card overview-card--balance">
        <h3 className="overview-section-title">我的帳務狀態</h3>
        {!currentMemberId ? (
          <p className="overview-card-hint">請先加入旅行後才能查看帳務</p>
        ) : displayMode === 'twd_estimate' ? (
          <BalanceDisplay currency="TWD" balance={twdBalance} />
        ) : originalBalances.length === 0 ? (
          <BalanceDisplay currency="TWD" balance={0} />
        ) : (
          <div className="overview-multi-list">
            {originalBalances.map(({ currency, balance }) => (
              <div key={currency} className="overview-multi-item">
                <span className="overview-multi-currency">{currency}</span>
                <BalanceDisplay currency={currency} balance={balance} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="overview-card">
        <h3 className="overview-section-title">我的總花費</h3>
        {displayMode === 'twd_estimate' ? (
          <p className="overview-card-value">
            TWD {formatAmount(twdTotalCost, 'TWD')}
          </p>
        ) : originalTotalCosts.length === 0 ? (
          <p className="overview-card-value overview-card-value--muted">—</p>
        ) : (
          <div className="overview-amount-list">
            {originalTotalCosts.map(({ currency, total }) => (
              <span key={currency} className="overview-card-value">
                {currency} {formatAmount(total, currency)}
              </span>
            ))}
          </div>
        )}
        <p className="overview-card-hint">你在消費支出中應分攤的金額</p>
      </Card>

      <p className="overview-footnote">
        {displayMode === 'twd_estimate'
          ? '台幣金額依記帳當下匯率估算，實際刷卡金額可能略有差異。'
          : '依目前已記錄支出自動計算，不含還款/轉帳。'}
      </p>
    </div>
  )
}
