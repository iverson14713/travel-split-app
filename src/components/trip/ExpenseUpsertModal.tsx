import { useEffect, useMemo, useState } from 'react'
import type { Expense, ExpenseType, Trip } from '../../types'
import { TRAVEL_CURRENCIES } from '../../constants/currencies'
import { DEFAULT_EXPENSE_CATEGORY, EXPENSE_CATEGORIES } from '../../constants/expenseCategories'
import { addExpense, updateExpense } from '../../services/tripService'
import { buildTwdEstimateHint } from '../../services/exchangeRateService'
import { checkExpenseLimit } from '../../services/tripUnlockService'
import type { UpgradeReason } from '../../services/tripUnlockService'
import { getExchangeRateForCurrency } from '../../utils/settlement'
import { getActiveMembers, getSelectableMembers } from '../../utils/members'
import { buildMemberDisplayLabelMap } from '../../utils/memberNames'
import { Modal } from '../ui/Modal'
import { Select } from '../ui/Select'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { Button } from '../ui/Button'

const CURRENCY_OPTIONS = TRAVEL_CURRENCIES.map((c) => ({ value: c.code, label: c.label }))

const EXPENSE_TYPE_OPTIONS: { value: ExpenseType; label: string; hint: string }[] = [
  { value: 'expense', label: '消費支出', hint: '一般吃飯、交通、購物，會列入分帳' },
  { value: 'transfer', label: '還款/轉帳', hint: '記錄成員之間互相還錢，不會再分攤' },
]

export interface ExpenseUpsertModalPreset {
  type?: ExpenseType
  amount?: number
  currency?: string
  payerMemberId?: string
  receiverMemberId?: string
  note?: string
}

interface ExpenseUpsertModalProps {
  open: boolean
  onClose: () => void
  title?: string
  trip: Trip
  tripId: string
  currentMemberId?: string
  preset?: ExpenseUpsertModalPreset
  expense?: Expense
  onSaved: () => Promise<void>
  onUpgradeRequired?: (reason: UpgradeReason) => void
  onStatusMessage?: (message: string) => void
  savedMessage?: string
}

export function ExpenseUpsertModal({
  open,
  onClose,
  title = '新增支出',
  trip,
  tripId,
  currentMemberId,
  preset,
  expense,
  onSaved,
  onUpgradeRequired,
  onStatusMessage,
  savedMessage,
}: ExpenseUpsertModalProps) {
  const activeMembers = useMemo(() => getActiveMembers(trip.members), [trip.members])
  const selectableMembers = useMemo(
    () => getSelectableMembers(trip.members, expense),
    [trip.members, expense],
  )
  const defaultPayer = currentMemberId ?? ''

  const memberDisplayLabels = useMemo(
    () => buildMemberDisplayLabelMap(trip.members, currentMemberId),
    [trip.members, currentMemberId],
  )

  const memberOptions = useMemo(
    () =>
      selectableMembers.map((m) => {
        const label = memberDisplayLabels.get(m.id) ?? m.nickname
        return {
          value: m.id,
          label: label + (m.isHost ? '（主揪）' : ''),
        }
      }),
    [selectableMembers, memberDisplayLabels],
  )

  const memberSelectOptions = useMemo(
    () => [{ value: '', label: '請選擇' }, ...memberOptions],
    [memberOptions],
  )

  const [type, setType] = useState<ExpenseType>('expense')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('TWD')
  const [payerId, setPayerId] = useState(defaultPayer)
  const [receiverId, setReceiverId] = useState('')
  const [participantIds, setParticipantIds] = useState<string[]>(activeMembers.map((m) => m.id))
  const [category, setCategory] = useState(DEFAULT_EXPENSE_CATEGORY)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const exchangeRateToTwd = useMemo(
    () => getExchangeRateForCurrency(currency, trip),
    [currency, trip],
  )

  const twdEstimateHint = useMemo(() => {
    const parsedAmount = parseFloat(amount)
    return buildTwdEstimateHint(currency, parsedAmount, exchangeRateToTwd)
  }, [amount, currency, exchangeRateToTwd])

  const typeHint = EXPENSE_TYPE_OPTIONS.find((opt) => opt.value === type)?.hint ?? ''

  useEffect(() => {
    if (!open) return

    if (expense) {
      setType(expense.type)
      setAmount(String(expense.amount))
      setCurrency((expense.currency || 'TWD').toUpperCase())
      setPayerId(expense.payerId)
      setReceiverId(expense.receiverId ?? '')
      setParticipantIds(
        expense.participantIds.length > 0 ? expense.participantIds : activeMembers.map((m) => m.id),
      )
      setCategory(expense.type === 'transfer' ? '還款' : expense.category)
      setNote(expense.note ?? '')
    } else {
      setType(preset?.type ?? 'expense')
      setAmount(preset?.amount != null ? String(preset.amount) : '')
      setCurrency((preset?.currency ?? 'TWD').toUpperCase())
      setPayerId(preset?.payerMemberId ?? defaultPayer)
      setReceiverId(preset?.receiverMemberId ?? '')
      setParticipantIds(activeMembers.map((m) => m.id))
      setCategory(DEFAULT_EXPENSE_CATEGORY)
      setNote(preset?.note ?? '')
    }

    setError('')
    setSubmitting(false)
  }, [open, preset, expense, defaultPayer, activeMembers])

  const toggleParticipant = (id: string) => {
    setParticipantIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))
  }

  const validateForm = (): string | null => {
    const parsedAmount = parseFloat(amount)
    if (!amount.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return '請輸入有效金額'
    }
    if (!payerId) {
      return type === 'transfer' ? '請選擇轉出人' : '請選擇付款人'
    }
    if (type === 'transfer') {
      if (!receiverId) return '請選擇轉入人'
      if (receiverId === payerId) return '轉出人與轉入人不能相同'
      return null
    }
    if (participantIds.length === 0) return '請至少選擇一位參與分攤成員'
    return null
  }

  const handleSave = async () => {
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    const parsedAmount = parseFloat(amount)

    setSubmitting(true)
    setError('')
    try {
      if (!expense && type === 'expense') {
        const blocked = checkExpenseLimit(trip)
        if (blocked) {
          if (onUpgradeRequired) {
            onUpgradeRequired(blocked)
          } else {
            setError('已達免費版記帳上限，請解鎖後再新增')
          }
          return
        }
      }

      const exchangeRateToTwd =
        expense && (expense.currency || 'TWD').toUpperCase() === currency
          ? expense.exchangeRateToTwd
          : getExchangeRateForCurrency(currency, trip)

      const payload = {
        tripId,
        type,
        payerMemberId: payerId,
        receiverMemberId: type === 'transfer' ? receiverId : undefined,
        amount: parsedAmount,
        currency,
        exchangeRateToTwd,
        category: type === 'transfer' ? '還款' : category,
        note: note.trim(),
        participantMemberIds: type === 'transfer' ? [] : participantIds,
      }

      if (expense) {
        await updateExpense(expense.id, payload)
      } else {
        await addExpense(payload)
      }
      await onSaved()
      if (savedMessage) {
        onStatusMessage?.(savedMessage)
      } else if (type === 'transfer' && !expense) {
        onStatusMessage?.('已記錄還款')
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存失敗，請稍後再試')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="form">
        <div className="form-field">
          <span className="form-label">支出類型</span>
          <div className="segmented-control" role="group" aria-label="支出類型">
            {EXPENSE_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`segmented-control__option${
                  type === opt.value ? ' segmented-control__option--active' : ''
                }`}
                aria-pressed={type === opt.value}
                onClick={() => setType(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="segmented-control-hint">{typeHint}</p>
        </div>

        <Input
          label="金額"
          type="number"
          min="0"
          step="1"
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <Select
          label="幣別"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          options={CURRENCY_OPTIONS}
        />

        {twdEstimateHint && (
          <div className="expense-rate-hint">
            <p>{twdEstimateHint.amountLine}</p>
            <p>{twdEstimateHint.rateLine}</p>
          </div>
        )}

        <Select
          label={type === 'transfer' ? '轉出人' : '付款人'}
          value={payerId}
          onChange={(e) => setPayerId(e.target.value)}
          options={memberSelectOptions}
        />

        {type === 'expense' ? (
          <>
            <div className="form-field">
              <span className="form-label">參與分攤成員</span>
              <div className="checkbox-group">
                {activeMembers.map((m) => (
                  <label key={m.id} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={participantIds.includes(m.id)}
                      onChange={() => toggleParticipant(m.id)}
                    />
                    {memberDisplayLabels.get(m.id) ?? m.nickname}
                  </label>
                ))}
              </div>
            </div>

            <Select
              label="分類"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={[...EXPENSE_CATEGORIES]}
            />
          </>
        ) : (
          <Select
            label="轉入人"
            value={receiverId}
            onChange={(e) => setReceiverId(e.target.value)}
            options={memberSelectOptions}
          />
        )}

        <Textarea
          label="備註"
          placeholder="備註事項..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
        />

        {error && <p className="form-error-msg">{error}</p>}

        <Button fullWidth onClick={handleSave} disabled={submitting}>
          {submitting ? '儲存中...' : '儲存'}
        </Button>
      </div>
    </Modal>
  )
}
