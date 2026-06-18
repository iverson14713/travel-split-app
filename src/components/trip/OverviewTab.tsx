import { useMemo, useState } from 'react'
import type { Trip } from '../../types'
import {
  calculateMyBalance,
  calculateMyTotalCost,
  formatAmount,
  OVERVIEW_CURRENCIES,
  type CurrencyFilter,
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
  const [currencyFilter, setCurrencyFilter] = useState<CurrencyFilter>('TWD')

  const balances = useMemo(() => {
    if (!currentMemberId) return []
    return calculateMyBalance(trip.expenses, trip.members, currentMemberId, currencyFilter)
  }, [trip.expenses, trip.members, currentMemberId, currencyFilter])

  const totalCosts = useMemo(() => {
    if (!currentMemberId) return []
    return calculateMyTotalCost(trip.expenses, currentMemberId, currencyFilter)
  }, [trip.expenses, currentMemberId, currencyFilter])

  return (
    <div className="tab-panel tab-panel--overview">
      {trip.status === 'archived' && (
        <div className="archived-hint">
          <span>📌</span>
          <p>這趟旅行已封存，新增內容會自動恢復為進行中</p>
        </div>
      )}

      <Select
        label="幣別"
        value={currencyFilter}
        onChange={(e) => setCurrencyFilter(e.target.value as CurrencyFilter)}
        options={OVERVIEW_CURRENCIES}
      />

      <Card className="overview-card overview-card--balance">
        <h3 className="overview-section-title">我的帳務狀態</h3>
        {!currentMemberId ? (
          <p className="overview-card-hint">請先加入旅行後才能查看帳務</p>
        ) : balances.length === 0 ? (
          <BalanceDisplay currency={currencyFilter === 'ALL' ? 'TWD' : currencyFilter} balance={0} />
        ) : currencyFilter === 'ALL' ? (
          <div className="overview-multi-list">
            {balances.map(({ currency, balance }) => (
              <div key={currency} className="overview-multi-item">
                <span className="overview-multi-currency">{currency}</span>
                <BalanceDisplay currency={currency} balance={balance} />
              </div>
            ))}
          </div>
        ) : (
          <BalanceDisplay currency={balances[0].currency} balance={balances[0].balance} />
        )}
      </Card>

      <Card className="overview-card">
        <h3 className="overview-section-title">我的總花費</h3>
        {totalCosts.length === 0 ? (
          <p className="overview-card-value overview-card-value--muted">
            {currencyFilter === 'ALL' ? '—' : `${currencyFilter} 0`}
          </p>
        ) : (
          <div className="overview-amount-list">
            {totalCosts.map(({ currency, total }) => (
              <span key={currency} className="overview-card-value">
                {currency} {formatAmount(total, currency)}
              </span>
            ))}
          </div>
        )}
        <p className="overview-card-hint">你在消費支出中應分攤的金額</p>
      </Card>

      <p className="overview-footnote">依目前已記錄支出自動計算，不含還款/轉帳。</p>
    </div>
  )
}
