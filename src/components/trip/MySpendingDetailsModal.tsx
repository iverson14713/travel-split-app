import { useMemo } from 'react'
import type { Trip } from '../../types'
import {
  calculateMyTotalCostInTwd,
  formatAmount,
  getMyExpenseShareDetails,
} from '../../utils/settlement'
import { getMemberDisplayLabel } from '../../utils/memberNames'
import { formatDateTime } from '../../utils/dates'
import { Modal } from '../ui/Modal'

interface MySpendingDetailsModalProps {
  open: boolean
  onClose: () => void
  trip: Trip
  currentMemberId: string
}

export function MySpendingDetailsModal({
  open,
  onClose,
  trip,
  currentMemberId,
}: MySpendingDetailsModalProps) {
  const tripRates = useMemo(() => trip.exchangeRatesToTwd, [trip.exchangeRatesToTwd])

  const details = useMemo(
    () => getMyExpenseShareDetails(trip.expenses, currentMemberId, tripRates),
    [trip.expenses, currentMemberId, tripRates],
  )

  const total = useMemo(
    () => calculateMyTotalCostInTwd(trip.expenses, currentMemberId, tripRates),
    [trip.expenses, currentMemberId, tripRates],
  )

  const getPayerLabel = (payerId: string) =>
    getMemberDisplayLabel(trip.members, payerId, currentMemberId)

  return (
    <Modal open={open} onClose={onClose} title="我的花費明細">
      <div className="my-spending-details">
        {details.length === 0 ? (
          <p className="my-spending-details-empty">目前沒有你的花費明細</p>
        ) : (
          <ul className="my-spending-details-list">
            {details.map((item) => (
              <li key={item.id} className="my-spending-details-item">
                <div className="my-spending-details-row">
                  <span className="my-spending-details-name">{item.name}</span>
                  <span className="my-spending-details-share">
                    TWD {formatAmount(item.shareTwd, 'TWD')}
                  </span>
                </div>
                <p className="my-spending-details-meta">
                  {formatDateTime(item.date)} · 付款人 {getPayerLabel(item.payerId)}
                </p>
                <p className="my-spending-details-meta">
                  原始 {item.currency} {formatAmount(item.amount, item.currency)}
                </p>
              </li>
            ))}
          </ul>
        )}
        <div className="my-spending-details-total">
          <span>我的總花費</span>
          <strong>TWD {formatAmount(total, 'TWD')}</strong>
        </div>
      </div>
    </Modal>
  )
}
