import { useState } from 'react'
import type { Expense, Trip } from '../../types'
import { formatAmount, resolveExchangeRateToTwd, toTwdAmount } from '../../utils/settlement'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { ExpenseDetailModal } from './ExpenseDetailModal'
import { ExpenseUpsertModal } from './ExpenseUpsertModal'
import { FreeAppRecommendation } from './FreeAppRecommendation'
import { TripEndedModal } from './TripEndedModal'
import type { ReloadOptions } from '../../hooks/useTrip'
import type { UpgradeReason } from '../../services/tripUnlockService'
import {
  canEditExpense,
  getExpenseEditBlockedReason,
  getTripDisplayStatus,
  TRIP_ARCHIVED_VIEW_HINT,
  TRIP_ENDED_VIEW_HINT,
  TRIP_SETTLING_VIEW_HINT,
  type TripEditBlockReason,
} from '../../utils/tripLifecycle'

interface ExpensesTabProps {
  trip: Trip
  tripId: string
  currentMemberId?: string
  onReload: (options?: ReloadOptions) => Promise<void>
  onUpgradeRequired?: (reason: UpgradeReason) => void
  onEditBlocked?: () => void
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

export function ExpensesTab({
  trip,
  tripId,
  currentMemberId,
  onReload,
  onUpgradeRequired,
  onEditBlocked,
}: ExpensesTabProps) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [showBlockedModal, setShowBlockedModal] = useState(false)
  const [blockedReason, setBlockedReason] = useState<TripEditBlockReason>('ended')

  const sortedExpenses = [...trip.expenses].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  const showEditBlocked = (reason: TripEditBlockReason) => {
    onEditBlocked?.()
    setBlockedReason(reason)
    setShowBlockedModal(true)
  }

  const handleEdit = (expense: Expense) => {
    const blocked = getExpenseEditBlockedReason(trip)
    if (blocked) {
      showEditBlocked(blocked)
      return
    }
    setSelectedExpense(null)
    setEditingExpense(expense)
  }

  const openAddModal = () => {
    const blocked = getExpenseEditBlockedReason(trip)
    if (blocked) {
      showEditBlocked(blocked)
      return
    }
    setShowAddModal(true)
  }

  const tripStatus = getTripDisplayStatus(trip)
  const isArchived = trip.status === 'archived'
  const isSettling = tripStatus === 'settling'
  const isEnded = tripStatus === 'ended'
  const readOnly = !canEditExpense(trip)

  return (
    <div className="tab-panel">
      {isArchived && (
        <div className="archived-hint">
          <span>📌</span>
          <p>{TRIP_ARCHIVED_VIEW_HINT}</p>
        </div>
      )}
      {isSettling && (
        <div className="archived-hint">
          <span>📌</span>
          <p>{TRIP_SETTLING_VIEW_HINT}</p>
        </div>
      )}
      {isEnded && (
        <div className="archived-hint">
          <span>📌</span>
          <p>{TRIP_ENDED_VIEW_HINT}</p>
        </div>
      )}
      <div className="tab-panel-header">
        <h3 className="tab-panel-title">支出紀錄</h3>
        {!isArchived && (
          <Button size="sm" onClick={openAddModal}>
            + 新增支出
          </Button>
        )}
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

      <FreeAppRecommendation trip={trip} />

      <ExpenseDetailModal
        open={selectedExpense != null}
        onClose={() => setSelectedExpense(null)}
        expense={selectedExpense}
        trip={trip}
        onEdit={handleEdit}
        onDeleted={onReload}
        readOnly={readOnly}
      />

      <ExpenseUpsertModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        trip={trip}
        tripId={tripId}
        currentMemberId={currentMemberId}
        onSaved={onReload}
        onUpgradeRequired={onUpgradeRequired}
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
        onUpgradeRequired={onUpgradeRequired}
      />

      <TripEndedModal
        open={showBlockedModal}
        onClose={() => setShowBlockedModal(false)}
        reason={blockedReason}
        context="expense"
      />
    </div>
  )
}
