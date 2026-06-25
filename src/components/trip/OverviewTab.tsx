import { useMemo, useState } from 'react'
import type { Trip } from '../../types'
import {
  calculateCategoryTotalsInTwd,
  calculateMemberSharesInTwd,
  calculateMyBalanceInTwd,
  calculateMyTotalCostInTwd,
  calculateTripTotalExpenseInTwd,
  countExpenseItems,
  formatAmount,
} from '../../utils/settlement'
import { buildMemberDisplayLabelMap } from '../../utils/memberNames'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { ARCHIVED_VIEW_ONLY_HINT } from './ArchivedTripBanner'
import { FreeAppRecommendation } from './FreeAppRecommendation'
import { MySpendingDetailsModal } from './MySpendingDetailsModal'

interface OverviewTabProps {
  trip: Trip
  currentMemberId?: string
  onGoToSettlement?: () => void
}

function getBalanceCardContent(balance: number) {
  if (balance > 0) {
    return {
      title: '你目前應收',
      hint: '這是其他旅伴目前尚未還你的差額',
      valueClass: 'overview-card-value--positive',
    }
  }
  if (balance < 0) {
    return {
      title: '你目前應付',
      hint: '這是你目前應付給其他旅伴的差額',
      valueClass: 'overview-card-value--negative',
    }
  }
  return {
    title: '目前已平帳',
    hint: '目前沒有未結清的差額',
    valueClass: 'overview-card-value--balanced',
  }
}

export function OverviewTab({ trip, currentMemberId, onGoToSettlement }: OverviewTabProps) {
  const [showSpendingDetails, setShowSpendingDetails] = useState(false)
  const tripRates = useMemo(() => trip.exchangeRatesToTwd, [trip.exchangeRatesToTwd])

  const twdBalance = useMemo(() => {
    if (!currentMemberId) return 0
    return calculateMyBalanceInTwd(trip.expenses, trip.members, currentMemberId, tripRates)
  }, [trip.expenses, trip.members, currentMemberId, tripRates])

  const twdTotalCost = useMemo(() => {
    if (!currentMemberId) return 0
    return calculateMyTotalCostInTwd(trip.expenses, currentMemberId, tripRates)
  }, [trip.expenses, currentMemberId, tripRates])

  const tripTotalExpense = useMemo(
    () => calculateTripTotalExpenseInTwd(trip.expenses, tripRates),
    [trip.expenses, tripRates],
  )

  const expenseCount = useMemo(() => countExpenseItems(trip.expenses), [trip.expenses])

  const memberShares = useMemo(
    () => calculateMemberSharesInTwd(trip.expenses, trip.members, tripRates),
    [trip.expenses, trip.members, tripRates],
  )

  const memberDisplayLabels = useMemo(
    () => buildMemberDisplayLabelMap(trip.members, currentMemberId),
    [trip.members, currentMemberId],
  )

  const categoryTotals = useMemo(
    () => calculateCategoryTotalsInTwd(trip.expenses, tripRates),
    [trip.expenses, tripRates],
  )

  const maxMemberShare = useMemo(
    () => Math.max(...memberShares.map((m) => m.total), 1),
    [memberShares],
  )

  const balanceCard = getBalanceCardContent(twdBalance)

  return (
    <div className="tab-panel tab-panel--overview">
      {trip.status === 'archived' && (
        <div className="archived-hint">
          <span>📌</span>
          <p>{ARCHIVED_VIEW_ONLY_HINT}</p>
        </div>
      )}

      <Card className="overview-card overview-card--balance overview-card--action">
        <h3 className="overview-section-title">我的帳務狀態</h3>
        {!currentMemberId ? (
          <p className="overview-card-hint">請先加入旅行後才能查看帳務</p>
        ) : (
          <>
            <p className="overview-balance-title">{balanceCard.title}</p>
            {twdBalance === 0 ? (
              <p className={`overview-card-value ${balanceCard.valueClass}`}>已平帳</p>
            ) : (
              <p className={`overview-card-value ${balanceCard.valueClass}`}>
                TWD {formatAmount(Math.abs(twdBalance), 'TWD')}
              </p>
            )}
            <p className="overview-card-hint">{balanceCard.hint}</p>
            {onGoToSettlement && (
              <div className="overview-card-action">
                <Button size="sm" variant="outline" type="button" onClick={onGoToSettlement}>
                  查看結算明細
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      <Card className="overview-card overview-card--compact overview-card--action">
        <h3 className="overview-section-title">我的總花費</h3>
        <p className="overview-card-value overview-card-value--amount">
          TWD {formatAmount(twdTotalCost, 'TWD')}
        </p>
        <p className="overview-card-hint">你在消費支出中應分攤的金額</p>
        {currentMemberId && (
          <div className="overview-card-action">
            <Button
              size="sm"
              variant="outline"
              type="button"
              onClick={() => setShowSpendingDetails(true)}
            >
              查看明細
            </Button>
          </div>
        )}
      </Card>

      <Card className="overview-card overview-card--compact">
        <h3 className="overview-section-title">旅程總支出</h3>
        <p className="overview-card-value overview-card-value--amount">
          TWD {formatAmount(tripTotalExpense, 'TWD')}
        </p>
        <p className="overview-card-hint">共 {expenseCount} 筆消費支出（不含還款/轉帳）</p>
      </Card>

      {memberShares.length > 0 && (
        <section className="overview-block">
          <h3 className="overview-block-title">成員花費概況</h3>
          <Card className="overview-card overview-card--list">
            <ul className="overview-member-list">
              {memberShares.map((member) => (
                <li key={member.memberId} className="overview-member-item">
                  <div className="overview-member-row">
                    <span className="overview-member-name">
                      {memberDisplayLabels.get(member.memberId) ?? member.nickname}
                    </span>
                    <span className="overview-member-amount">
                      TWD {formatAmount(member.total, 'TWD')}
                    </span>
                  </div>
                  <div className="overview-progress-track">
                    <div
                      className="overview-progress-fill"
                      style={{ width: `${Math.max((member.total / maxMemberShare) * 100, member.total > 0 ? 8 : 0)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      {categoryTotals.length > 0 && (
        <section className="overview-block">
          <h3 className="overview-block-title">分類花費</h3>
          <div className="overview-category-grid">
            {categoryTotals.map(({ category, total }) => (
              <div key={category} className="overview-category-chip">
                <span className="overview-category-name">{category}</span>
                <span className="overview-category-amount">TWD {formatAmount(total, 'TWD')}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="overview-footnote">
        台幣金額依記帳當下匯率估算，實際刷卡金額可能略有差異。
      </p>

      <FreeAppRecommendation trip={trip} />

      {currentMemberId && (
        <MySpendingDetailsModal
          open={showSpendingDetails}
          onClose={() => setShowSpendingDetails(false)}
          trip={trip}
          currentMemberId={currentMemberId}
        />
      )}
    </div>
  )
}
