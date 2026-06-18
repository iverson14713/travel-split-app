import { useMemo, useState } from 'react'
import type { Trip } from '../../types'
import { Card } from '../ui/Card'
import {
  calculateSettlementTransfers,
  calculateSettlementTransfersInTwd,
  DISPLAY_MODE_OPTIONS,
  formatAmount,
  type DisplayMode,
} from '../../utils/settlement'
import { Button } from '../ui/Button'
import { Select } from '../ui/Select'
import { ExpenseUpsertModal, type ExpenseUpsertModalPreset } from './ExpenseUpsertModal'

interface SettlementTabProps {
  trip: Trip
  tripId: string
  currentMemberId?: string
  onReload: () => Promise<void>
}

export function SettlementTab({ trip, tripId, currentMemberId, onReload }: SettlementTabProps) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('twd_estimate')
  const [showRepayModal, setShowRepayModal] = useState(false)
  const [repayPreset, setRepayPreset] = useState<ExpenseUpsertModalPreset | undefined>(undefined)

  const tripRates = useMemo(
    () => ({ jpyToTwdRate: trip.jpyToTwdRate, usdToTwdRate: trip.usdToTwdRate }),
    [trip.jpyToTwdRate, trip.usdToTwdRate],
  )

  const byCurrency = useMemo(() => {
    if (displayMode === 'twd_estimate') {
      return calculateSettlementTransfersInTwd({
        members: trip.members,
        expenses: trip.expenses,
        tripRates,
      })
    }
    return calculateSettlementTransfers({
      members: trip.members,
      expenses: trip.expenses,
    })
  }, [displayMode, trip.members, trip.expenses, tripRates])

  const hasAnyExpense = trip.expenses.length > 0
  const hasAnySettlement = byCurrency.some((group) => group.items.length > 0)

  return (
    <div className="tab-panel">
      <Select
        label="顯示方式"
        value={displayMode}
        onChange={(e) => setDisplayMode(e.target.value as DisplayMode)}
        options={DISPLAY_MODE_OPTIONS}
      />

      {!hasAnyExpense ? (
        <div className="empty-state">
          <p className="empty-icon">🧾</p>
          <p>目前還沒有支出，新增支出後會自動計算分帳結果</p>
        </div>
      ) : !hasAnySettlement ? (
        <div className="empty-state">
          <p className="empty-icon">✅</p>
          <p>目前大家已經平帳</p>
        </div>
      ) : (
        <div className="settlement-list">
          {byCurrency
            .filter((group) => group.items.length > 0)
            .map((group) => (
              <div key={group.currency} className="settlement-currency">
                <div className="settlement-currency-title">{group.currency}</div>
                <div className="settlement-currency-items">
                  {group.items.map((item, i) => (
                    <Card key={`${group.currency}-${i}`} className="settlement-card">
                      <div className="settlement-flow">
                        <span className="settlement-from">{item.from}</span>
                        <span className="settlement-arrow">→ 付給 →</span>
                        <span className="settlement-to">{item.to}</span>
                      </div>
                      <div className="settlement-bottom">
                        <p className="settlement-amount">
                          {item.currency} {formatAmount(item.amount, item.currency)}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRepayPreset({
                              type: 'transfer',
                              amount: item.amount,
                              currency: item.currency,
                              payerMemberId: item.fromId,
                              receiverMemberId: item.toId,
                            })
                            setShowRepayModal(true)
                          }}
                          disabled={!item.fromId || !item.toId}
                        >
                          記錄已還款
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {displayMode === 'twd_estimate' && hasAnyExpense && (
        <p className="overview-footnote">台幣金額依記帳當下匯率估算，實際刷卡金額可能略有差異。</p>
      )}

      <ExpenseUpsertModal
        open={showRepayModal}
        onClose={() => setShowRepayModal(false)}
        title="記錄還款/轉帳"
        trip={trip}
        tripId={tripId}
        currentMemberId={currentMemberId}
        preset={repayPreset}
        onSaved={onReload}
      />
    </div>
  )
}
