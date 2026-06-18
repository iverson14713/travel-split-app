import { useState } from 'react'
import type { Trip } from '../../types'
import { Card } from '../ui/Card'
import { calculateSettlementTransfers, formatAmount } from '../../utils/settlement'
import { Button } from '../ui/Button'
import { ExpenseUpsertModal, type ExpenseUpsertModalPreset } from './ExpenseUpsertModal'

interface SettlementTabProps {
  trip: Trip
  tripId: string
  currentMemberId?: string
  onReload: () => Promise<void>
}

export function SettlementTab({ trip, tripId, currentMemberId, onReload }: SettlementTabProps) {
  const byCurrency = calculateSettlementTransfers({
    members: trip.members,
    expenses: trip.expenses,
  })

  const hasAnyExpense = trip.expenses.length > 0
  const hasAnySettlement = byCurrency.some((g) => g.items.length > 0)
  const [showRepayModal, setShowRepayModal] = useState(false)
  const [repayPreset, setRepayPreset] = useState<ExpenseUpsertModalPreset | undefined>(undefined)

  return (
    <div className="tab-panel">
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
            .filter((g) => g.items.length > 0)
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
