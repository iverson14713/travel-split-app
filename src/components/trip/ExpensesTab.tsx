import { useState } from 'react'
import type { Trip } from '../../types'
import { createId } from '../../utils/id'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { Select } from '../ui/Select'
import { Modal } from '../ui/Modal'
import { Card } from '../ui/Card'

const CURRENCIES = [
  { value: 'TWD', label: 'TWD 新台幣' },
  { value: 'JPY', label: 'JPY 日圓' },
  { value: 'USD', label: 'USD 美元' },
  { value: 'EUR', label: 'EUR 歐元' },
  { value: 'KRW', label: 'KRW 韓元' },
]

const CATEGORIES = [
  { value: '交通', label: '交通' },
  { value: '住宿', label: '住宿' },
  { value: '餐飲', label: '餐飲' },
  { value: '門票', label: '門票' },
  { value: '購物', label: '購物' },
  { value: '其他', label: '其他' },
]

interface ExpensesTabProps {
  trip: Trip
  updateTrip: (updater: (prev: Trip) => Trip) => void
  currentMemberId?: string
}

export function ExpensesTab({ trip, updateTrip, currentMemberId }: ExpensesTabProps) {
  const [showModal, setShowModal] = useState(false)
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('TWD')
  const [payerId, setPayerId] = useState(currentMemberId ?? trip.members[0]?.id ?? '')
  const [participantIds, setParticipantIds] = useState<string[]>(
    trip.members.map((m) => m.id),
  )
  const [category, setCategory] = useState('餐飲')
  const [note, setNote] = useState('')

  const getMemberName = (id: string) =>
    trip.members.find((m) => m.id === id)?.nickname ?? '未知'

  const toggleParticipant = (id: string) => {
    setParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    )
  }

  const resetForm = () => {
    setAmount('')
    setCurrency('TWD')
    setPayerId(currentMemberId ?? trip.members[0]?.id ?? '')
    setParticipantIds(trip.members.map((m) => m.id))
    setCategory('餐飲')
    setNote('')
  }

  const handleAdd = () => {
    const parsedAmount = parseFloat(amount)
    if (!parsedAmount || parsedAmount <= 0) return
    if (!payerId || participantIds.length === 0) return

    updateTrip((prev) => ({
      ...prev,
      expenses: [
        ...prev.expenses,
        {
          id: createId(),
          amount: parsedAmount,
          currency,
          payerId,
          participantIds: [...participantIds],
          category,
          note: note.trim(),
          createdAt: new Date().toISOString(),
        },
      ],
    }))
    setShowModal(false)
    resetForm()
  }

  const sortedExpenses = [...trip.expenses].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  return (
    <div className="tab-panel">
      <div className="tab-panel-header">
        <h3 className="tab-panel-title">支出紀錄</h3>
        <Button size="sm" onClick={() => { resetForm(); setShowModal(true) }}>
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
                <span className="expense-category">{expense.category}</span>
              </div>
              <p className="expense-payer">付款人：{getMemberName(expense.payerId)}</p>
              <p className="expense-participants">
                參與：
                {expense.participantIds.map((id) => getMemberName(id)).join('、')}
              </p>
              {expense.note && <p className="expense-note">{expense.note}</p>}
            </Card>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="新增支出">
        <div className="form">
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
            options={CURRENCIES}
          />
          <Select
            label="付款人"
            value={payerId}
            onChange={(e) => setPayerId(e.target.value)}
            options={trip.members.map((m) => ({
              value: m.id,
              label: m.nickname + (m.isHost ? '（主揪）' : ''),
            }))}
          />
          <div className="form-field">
            <span className="form-label">參與成員</span>
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
          <Textarea
            label="備註"
            placeholder="備註事項..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
          />
          <Button fullWidth onClick={handleAdd}>
            新增支出
          </Button>
        </div>
      </Modal>
    </div>
  )
}
