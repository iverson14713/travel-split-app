import { useMemo, useState } from 'react'
import type { Trip } from '../../types'
import { Card } from '../ui/Card'
import {
  calculateSettlementTransfersInTwd,
  formatAmount,
} from '../../utils/settlement'
import { Button } from '../ui/Button'
import type { UpgradeReason } from '../../services/tripUnlockService'
import type { ReloadOptions } from '../../hooks/useTrip'
import { ExpenseUpsertModal, type ExpenseUpsertModalPreset } from './ExpenseUpsertModal'
import { FreeAppRecommendation } from './FreeAppRecommendation'
import {
  canSettle,
  getTripDisplayStatus,
  TRIP_ARCHIVED_VIEW_HINT,
  TRIP_ENDED_VIEW_HINT,
  TRIP_SETTLING_VIEW_HINT,
} from '../../utils/tripLifecycle'

interface SettlementTabProps {
  trip: Trip
  tripId: string
  currentMemberId?: string
  onReload: (options?: ReloadOptions) => Promise<void>
  onUpgradeRequired?: (reason: UpgradeReason) => void
}

export function SettlementTab({ trip, tripId, currentMemberId, onReload, onUpgradeRequired }: SettlementTabProps) {
  const [showRepayModal, setShowRepayModal] = useState(false)
  const [repayPreset, setRepayPreset] = useState<ExpenseUpsertModalPreset | undefined>(undefined)

  const tripRates = useMemo(() => trip.exchangeRatesToTwd, [trip.exchangeRatesToTwd])

  const settlementItems = useMemo(() => {
    const groups = calculateSettlementTransfersInTwd({
      members: trip.members,
      expenses: trip.expenses,
      tripRates,
    })
    return groups.flatMap((group) => group.items)
  }, [trip.members, trip.expenses, tripRates])

  const hasAnyExpense = trip.expenses.length > 0
  const hasAnySettlement = settlementItems.length > 0
  const tripStatus = getTripDisplayStatus(trip)
  const isArchived = trip.status === 'archived'
  const isSettling = tripStatus === 'settling'
  const isEnded = tripStatus === 'ended'
  const canRepay = canSettle(trip)

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
          {settlementItems.map((item, i) => (
            <Card key={`${item.fromId}-${item.toId}-${i}`} className="settlement-card">
              <div className="settlement-flow">
                <span className="settlement-from">{item.from}</span>
                <span className="settlement-arrow">→ 付給 →</span>
                <span className="settlement-to">{item.to}</span>
              </div>
              <div className="settlement-bottom">
                <p className="settlement-amount">TWD {formatAmount(item.amount, 'TWD')}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setRepayPreset({
                      type: 'transfer',
                      amount: item.amount,
                      currency: 'TWD',
                      payerMemberId: item.fromId,
                      receiverMemberId: item.toId,
                    })
                    setShowRepayModal(true)
                  }}
                  disabled={!canRepay || !item.fromId || !item.toId}
                >
                  記錄已還款
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {hasAnyExpense && (
        <p className="overview-footnote">台幣金額依記帳當下匯率估算，實際刷卡金額可能略有差異。</p>
      )}

      <FreeAppRecommendation trip={trip} />

      <ExpenseUpsertModal
        open={showRepayModal}
        onClose={() => setShowRepayModal(false)}
        title="記錄還款/轉帳"
        trip={trip}
        tripId={tripId}
        currentMemberId={currentMemberId}
        preset={repayPreset}
        onSaved={onReload}
        onUpgradeRequired={onUpgradeRequired}
      />
    </div>
  )
}
