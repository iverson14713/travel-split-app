import { useState } from 'react'
import type { Expense, Trip } from '../../types'
import { formatAmount, resolveExchangeRateToTwd, toTwdAmount } from '../../utils/settlement'
import { Card } from '../ui/Card'
import { ExpenseDetailModal } from './ExpenseDetailModal'
import { ExpenseUpsertModal } from './ExpenseUpsertModal'
import { Button } from '../ui/Button'

interface ExpensesTabProps {
  trip: Trip
  tripId: string
  currentMemberId?: string
  onReload: () => Promise<void>
}

function ExpenseCompactCard({
  expense,
  trip,
  onOpen,
}: {
  expense: Expense
  trip: Trip
  onOpen: () => void
}) {
  const getMemberName = (id: string) => trip.members.find((m) => m.id === id)?.nickname ?? '未知'
  const currency = (expense.currency || 'TWD').toUpperCase()
  const twdEstimate =
    currency !== 'TWD'
      ? toTwdAmount(expense.amount, resolveExchangeRateToTwd(expense, trip.exchangeRatesToTwd))
      : null

  if (expense.type === 'transfer') {
    return (
      <Card className="expense-card expense-card--compact" onClick={onOpen}>
        <div className="expense-card-row">
          <span className="expense-card-amount">
            {currency} {formatAmount(expense.amount, currency)}
          </span>
          <span className="expense-category">還款/轉帳</span>
        </div>
        <p className="expense-card-meta">
          {getMemberName(expense.payerId)} → {getMemberName(expense.receiverId ?? '')}
        </p>
      </Card>
    )
  }

  const participantCount = expense.participantIds.length

  return (
    <Card className="expense-card expense-card--compact" onClick={onOpen}>
      <div className="expense-card-row">
        <span className="expense-card-amount">
          {currency} {formatAmount(expense.amount, currency)}
        </span>
        <span className="expense-category">{expense.category}</span>
      </div>
      {twdEstimate != null && (
        <p className="expense-card-meta">約 TWD {formatAmount(twdEstimate, 'TWD')}</p>
      )}
      <p className="expense-card-meta">
        {getMemberName(expense.payerId)} 支付・{participantCount} 人分攤
      </p>
      {expense.note && <p className="expense-card-note">{expense.note}</p>}
    </Card>
  )
}

export function ExpensesTab({ trip, tripId, currentMemberId, onReload }: ExpensesTabProps) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

  const sortedExpenses = [...trip.expenses].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  const handleEdit = (expense: Expense) => {
    setSelectedExpense(null)
    setEditingExpense(expense)
  }

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
        <Button size="sm" onClick={() => setShowAddModal(true)}>
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
            <ExpenseCompactCard
              key={expense.id}
              expense={expense}
              trip={trip}
              onOpen={() => setSelectedExpense(expense)}
            />
          ))}
        </div>
      )}

      <ExpenseDetailModal
        open={selectedExpense != null}
        onClose={() => setSelectedExpense(null)}
        expense={selectedExpense}
        trip={trip}
        onEdit={handleEdit}
        onDeleted={onReload}
      />

      <ExpenseUpsertModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        trip={trip}
        tripId={tripId}
        currentMemberId={currentMemberId}
        onSaved={onReload}
      />

      <ExpenseUpsertModal
        open={editingExpense != null}
        onClose={() => setEditingExpense(null)}
        title="編輯支出"
        trip={trip}
        tripId={tripId}
        currentMemberId={currentMemberId}
        expense={editingExpense ?? undefined}
        onSaved={onReload}
      />
    </div>
  )
}
