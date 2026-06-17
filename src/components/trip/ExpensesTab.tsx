import { useState } from 'react'
import type { Trip } from '../../types'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { ExpenseUpsertModal } from './ExpenseUpsertModal'

interface ExpensesTabProps {
  trip: Trip
  tripId: string
  currentMemberId?: string
  onReload: () => Promise<void>
}

export function ExpensesTab({ trip, tripId, currentMemberId, onReload }: ExpensesTabProps) {
  const [showModal, setShowModal] = useState(false)

  const getMemberName = (id: string) =>
    trip.members.find((m) => m.id === id)?.nickname ?? '未知'

  const sortedExpenses = [...trip.expenses].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  return (
    <div className="tab-panel">
      {trip.status === 'archived' && (
        <div className="archived-hint">
          <span>📌</span>
          <p>這趟旅行已封存，新增內容會自動恢復為進行中</p>
        </div>
      )}
      <div className="tab-panel-header">
        <h3 className="tab-panel-title">支出紀錄</h3>
        <Button size="sm" onClick={() => setShowModal(true)}>
          + 新增支出
        </Button>
      </div>

      {sortedExpenses.length === 0 ? (
        <div className="empty-state">
          <p className="empty-icon">💸</p>
          <p>尚無支出紀錄</p>
        </div>
      ) : (
        <div className="expense-list">
          {sortedExpenses.map((expense) => (
            <Card key={expense.id} className="expense-card">
              <div className="expense-top">
                <span className="expense-amount">
                  {expense.currency} {expense.amount.toLocaleString()}
                </span>
                <span className="expense-category">
                  {expense.type === 'transfer' ? '還款/轉帳' : expense.category}
                </span>
              </div>
              {expense.type === 'transfer' ? (
                <p className="expense-payer">
                  {getMemberName(expense.payerId)} → {getMemberName(expense.receiverId ?? '')}
                </p>
              ) : (
                <>
                  <p className="expense-payer">付款人：{getMemberName(expense.payerId)}</p>
                  <p className="expense-participants">
                    參與：
                    {expense.participantIds.map((id) => getMemberName(id)).join('、')}
                  </p>
                </>
              )}
              {expense.note && <p className="expense-note">{expense.note}</p>}
            </Card>
          ))}
        </div>
      )}

      <ExpenseUpsertModal
        open={showModal}
        onClose={() => setShowModal(false)}
        trip={trip}
        tripId={tripId}
        currentMemberId={currentMemberId}
        onSaved={onReload}
      />
    </div>
  )
}
