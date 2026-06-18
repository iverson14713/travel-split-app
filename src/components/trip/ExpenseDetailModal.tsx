import type { Expense, Trip } from '../../types'
import { formatRateEstimateLine } from '../../constants/currencies'
import { formatDateTime } from '../../utils/dates'
import { deleteExpense } from '../../services/tripService'
import { formatAmount, resolveExchangeRateToTwd, roundAmount, toTwdAmount } from '../../utils/settlement'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'

interface ExpenseDetailModalProps {
  open: boolean
  onClose: () => void
  expense: Expense | null
  trip: Trip
  onEdit: (expense: Expense) => void
  onDeleted: () => Promise<void>
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="expense-detail-row">
      <span className="expense-detail-label">{label}</span>
      <span className="expense-detail-value">{value}</span>
    </div>
  )
}

export function ExpenseDetailModal({
  open,
  onClose,
  expense,
  trip,
  onEdit,
  onDeleted,
}: ExpenseDetailModalProps) {
  if (!expense) return null

  const getMemberName = (id: string) => trip.members.find((m) => m.id === id)?.nickname ?? '未知'
  const currency = (expense.currency || 'TWD').toUpperCase()
  const rateToTwd = resolveExchangeRateToTwd(expense, trip.exchangeRatesToTwd)
  const twdAmount = toTwdAmount(expense.amount, rateToTwd)
  const isTransfer = expense.type === 'transfer'
  const participantCount = expense.participantIds.length
  const sharePerPerson =
    !isTransfer && participantCount > 0
      ? roundAmount(expense.amount / participantCount, currency)
      : null

  const handleDelete = async () => {
    if (!window.confirm('確定要刪除這筆支出嗎？')) return
    try {
      await deleteExpense(expense.id, trip.id)
      await onDeleted()
      onClose()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : '刪除失敗')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isTransfer ? '還款/轉帳詳情' : '支出詳情'}>
      <div className="expense-detail">
        <DetailRow label="金額" value={`${currency} ${formatAmount(expense.amount, currency)}`} />
        <DetailRow label="約台幣" value={`TWD ${formatAmount(twdAmount, 'TWD')}`} />

        {isTransfer ? (
          <>
            <DetailRow label="類型" value="還款/轉帳" />
            <DetailRow
              label="流向"
              value={`${getMemberName(expense.payerId)} → ${getMemberName(expense.receiverId ?? '')}`}
            />
          </>
        ) : (
          <>
            <DetailRow label="分類" value={expense.category} />
            <DetailRow label="付款人" value={getMemberName(expense.payerId)} />
            <DetailRow
              label="參與成員"
              value={expense.participantIds.map((id) => getMemberName(id)).join('、') || '—'}
            />
            {sharePerPerson != null && (
              <DetailRow
                label="每人分攤"
                value={`${currency} ${formatAmount(sharePerPerson, currency)}`}
              />
            )}
          </>
        )}

        {expense.note && <DetailRow label="備註" value={expense.note} />}

        {currency !== 'TWD' && (
          <DetailRow label="匯率" value={formatRateEstimateLine(currency, rateToTwd)} />
        )}

        <DetailRow label="建立時間" value={formatDateTime(expense.createdAt)} />

        <div className="expense-detail-actions">
          <Button variant="outline" fullWidth onClick={() => onEdit(expense)}>
            編輯
          </Button>
          <Button variant="outline" fullWidth onClick={handleDelete}>
            刪除
          </Button>
        </div>
      </div>
    </Modal>
  )
}
