import { useMemo, useState } from 'react'
import { TRIP_UNLOCK_PRICE_LABEL } from '../../constants/freeLimits'
import {
  getTripUsageLimits,
  getUpgradeLeadCopy,
  getUpgradeModalTitle,
  getUpgradeReasonCopy,
  mockUnlockTrip,
  type UpgradeReason,
} from '../../services/tripUnlockService'
import type { Trip } from '../../types'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { FreeUsageHint } from './FreeUsageHint'

interface UpgradeModalProps {
  open: boolean
  onClose: () => void
  reason: UpgradeReason
  trip?: Trip | null
  onUnlocked?: () => void
  onUnlockAndProceed?: () => void | Promise<void>
}

const FEATURES = ['不限成員數', '不限行程天數', '不限記帳筆數', '完整統計與結算']

export function UpgradeModal({
  open,
  onClose,
  reason,
  trip,
  onUnlocked,
  onUnlockAndProceed,
}: UpgradeModalProps) {
  const [processing, setProcessing] = useState(false)
  const reasonCopy = getUpgradeReasonCopy(reason)
  const usage = useMemo(() => (trip ? getTripUsageLimits(trip) : null), [trip])
  const canMockUnlock = !!trip?.id || !!onUnlockAndProceed
  const showReasonBlock =
    reason !== 'manual_unlock' &&
    reason !== 'create_member_limit' &&
    reasonCopy.headline

  const handleMockUnlock = async () => {
    if (onUnlockAndProceed) {
      setProcessing(true)
      try {
        await onUnlockAndProceed()
        onUnlocked?.()
        onClose()
      } finally {
        setProcessing(false)
      }
      return
    }
    if (!trip?.id) return
    mockUnlockTrip(trip.id)
    onUnlocked?.()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={getUpgradeModalTitle(reason)}>
      <div className="upgrade-modal">
        {showReasonBlock && (
          <div className="upgrade-reason">
            <p className="upgrade-reason-title">{reasonCopy.headline}</p>
            <p className="upgrade-reason-detail">{reasonCopy.detail}</p>
          </div>
        )}

        <p className="upgrade-lead">{getUpgradeLeadCopy(reason)}</p>

        <ul className="upgrade-features">
          {FEATURES.map((item) => (
            <li key={item}>・{item}</li>
          ))}
        </ul>

        {usage && !usage.isUnlimited && reason !== 'create_member_limit' && (
          <FreeUsageHint usage={usage} compact />
        )}

        <p className="upgrade-price">單趟解鎖 {TRIP_UNLOCK_PRICE_LABEL}</p>

        {canMockUnlock ? (
          <Button fullWidth type="button" onClick={handleMockUnlock} disabled={processing}>
            {processing ? '處理中...' : `${TRIP_UNLOCK_PRICE_LABEL} 解鎖這趟旅程`}
          </Button>
        ) : (
          <Button fullWidth type="button" disabled>
            建立旅程後可解鎖
          </Button>
        )}

        <p className="upgrade-footnote">只解鎖目前這趟旅程，不是訂閱。</p>
      </div>
    </Modal>
  )
}
