import type { Trip } from '../../types'
import { Card } from '../ui/Card'

interface SettlementTabProps {
  trip: Trip
}

// 假資料：之後會替換為真實分帳計算
function getMockSettlements(trip: Trip) {
  const members = trip.members
  if (members.length < 2) return []

  const m1 = members[0]
  const m2 = members[1]
  const m3 = members[2]

  const settlements = [
    { from: m2.nickname, to: m1.nickname, amount: 1250, currency: 'TWD' },
    { from: m3?.nickname ?? '旅伴 C', to: m1.nickname, amount: 800, currency: 'TWD' },
    { from: m3?.nickname ?? '旅伴 C', to: m2.nickname, amount: 350, currency: 'TWD' },
  ]

  return settlements.filter((s) => s.from && s.to)
}

export function SettlementTab({ trip }: SettlementTabProps) {
  const settlements = getMockSettlements(trip)

  return (
    <div className="tab-panel">
      <div className="settlement-notice">
        <span>💡</span>
        <p>目前為示範資料，之後會根據實際支出自動計算分帳結果</p>
      </div>

      {settlements.length === 0 ? (
        <div className="empty-state">
          <p className="empty-icon">🧾</p>
          <p>需要至少兩位成員才能顯示結算</p>
        </div>
      ) : (
        <div className="settlement-list">
          {settlements.map((item, i) => (
            <Card key={i} className="settlement-card">
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
      )}
    </div>
  )
}
