import type { Trip } from '../../types'
import { Card } from '../ui/Card'
import { computeSettlementsByCurrency } from '../../utils/settlement'

interface SettlementTabProps {
  trip: Trip
}

export function SettlementTab({ trip }: SettlementTabProps) {
  const byCurrency = computeSettlementsByCurrency({
    members: trip.members,
    expenses: trip.expenses,
  })

  const hasAnyExpense = trip.expenses.length > 0
  const hasAnySettlement = byCurrency.some((g) => g.items.length > 0)

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
                      <p className="settlement-amount">
                        {item.currency} {item.amount.toLocaleString()}
                      </p>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
