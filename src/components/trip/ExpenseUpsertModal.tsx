import { useEffect, useMemo, useState } from 'react'
import type { ExpenseType, Trip } from '../../types'
import { TRAVEL_CURRENCIES } from '../../constants/currencies'
import { addExpense } from '../../services/tripService'
import { buildTwdEstimateHint } from '../../services/exchangeRateService'
import { getExchangeRateForCurrency } from '../../utils/settlement'
import { Modal } from '../ui/Modal'
import { Select } from '../ui/Select'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { Button } from '../ui/Button'

const CURRENCY_OPTIONS = TRAVEL_CURRENCIES.map((c) => ({ value: c.code, label: c.label }))

const CATEGORIES = [
  { value: '交通', label: '交通' },
  { value: '住宿', label: '住宿' },
  { value: '餐飲', label: '餐飲' },
  { value: '門票', label: '門票' },
  { value: '購物', label: '購物' },
  { value: '其他', label: '其他' },
]

const EXPENSE_TYPE_OPTIONS: { value: ExpenseType; label: string; hint: string }[] = [
  { value: 'expense', label: '消費支出', hint: '一般吃飯、交通、購物，會列入分帳' },
  { value: 'transfer', label: '共同預付', hint: '先放一筆共用金，之後可以從共同金扣款' },
]

export interface ExpenseUpsertModalPreset {
  type?: ExpenseType
  amount?: number
  currency?: string
  payerMemberId?: string
  receiverMemberId?: string
}

interface ExpenseUpsertModalProps {
  open: boolean
  onClose: () => void
  title?: string
  trip: Trip
  tripId: string
  currentMemberId?: string
  preset?: ExpenseUpsertModalPreset
  onSaved: () => Promise<void>
}

export function ExpenseUpsertModal({
  open,
  onClose,
  title = '新增支出',
  trip,
  tripId,
  currentMemberId,
  preset,
  onSaved,
}: ExpenseUpsertModalProps) {
  const defaultPayer = currentMemberId ?? trip.members[0]?.id ?? ''

  const memberOptions = useMemo(
    () =>
      trip.members.map((m) => ({
        value: m.id,
        label: m.nickname + (m.isHost ? '（主揪）' : ''),
      })),
    [trip.members],
  )

  const [type, setType] = useState<ExpenseType>('expense')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('TWD')
  const [payerId, setPayerId] = useState(defaultPayer)
  const [receiverId, setReceiverId] = useState('')
  const [participantIds, setParticipantIds] = useState<string[]>(trip.members.map((m) => m.id))
  const [category, setCategory] = useState('餐飲')
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

    setType(preset?.type ?? 'expense')
    setAmount(preset?.amount != null ? String(preset.amount) : '')
    setCurrency((preset?.currency ?? 'TWD').toUpperCase())
    setPayerId(preset?.payerMemberId ?? defaultPayer)
    setReceiverId(preset?.receiverMemberId ?? '')
    setParticipantIds(trip.members.map((m) => m.id))
    setCategory('餐飲')
    setNote('')
    setError('')
    setSubmitting(false)
  }, [open, preset, defaultPayer, trip.members])

  const toggleParticipant = (id: string) => {
    setParticipantIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))
  }

  const handleSave = async () => {
    const parsedAmount = parseFloat(amount)
    if (!parsedAmount || parsedAmount <= 0) return
    if (!payerId) return

    if (type === 'expense') {
      if (participantIds.length === 0) return
    } else {
      if (!receiverId) return
      if (receiverId === payerId) {
        setError('付款人與收款人不能相同')
        return
      }
    }

    setSubmitting(true)
    setError('')
    try {
      await addExpense({
        tripId,
        type,
        payerMemberId: payerId,
        receiverMemberId: type === 'transfer' ? receiverId : undefined,
        amount: parsedAmount,
        currency,
        exchangeRateToTwd: getExchangeRateForCurrency(currency, trip),
        category: type === 'transfer' ? '還款' : category,
        note: note.trim(),
        participantMemberIds: type === 'transfer' ? [] : participantIds,
      })
      await onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '新增失敗')
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
          label="付款人"
          value={payerId}
          onChange={(e) => setPayerId(e.target.value)}
          options={memberOptions}
        />

        {type === 'expense' ? (
          <>
            <div className="form-field">
              <span className="form-label">參與分攤成員</span>
              <div className="checkbox-group">
                {trip.members.map((m) => (
                  <label key={m.id} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={participantIds.includes(m.id)}
                      onChange={() => toggleParticipant(m.id)}
                    />
                    {m.nickname}
                  </label>
                ))}
              </div>
            </div>

            <Select
              label="分類"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={CATEGORIES}
            />
          </>
        ) : (
          <Select
            label="收款人"
            value={receiverId}
            onChange={(e) => setReceiverId(e.target.value)}
            options={memberOptions}
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
