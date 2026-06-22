import { useMemo, useState } from 'react'
import { UPGRADE_FEATURES } from '../../constants/freeLimits'
import { useTripUnlockPriceLabel } from '../../hooks/useTripUnlockPriceLabel'
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
import { RestorePurchasesButton } from './RestorePurchasesButton'

interface UpgradeModalProps {
  open: boolean
  onClose: () => void
  reason: UpgradeReason
  trip?: Trip | null
  onUnlocked?: () => void
  onUnlockAndProceed?: () => void | Promise<void>
}

export function UpgradeModal({
  open,
  onClose,
  reason,
  trip,
  onUnlocked,
  onUnlockAndProceed,
}: UpgradeModalProps) {
  const [processing, setProcessing] = useState(false)
  const priceLabel = useTripUnlockPriceLabel()
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
    if (!trip?.id || !trip.startDate) return
    mockUnlockTrip(trip.id, trip.startDate)
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
          {UPGRADE_FEATURES.map((item) => (
            <li key={item}>・{item}</li>
          ))}
        </ul>

        {usage && !usage.isUnlimited && reason !== 'create_member_limit' && (
          <FreeUsageHint usage={usage} compact />
        )}

        <p className="upgrade-price">單趟解鎖 {priceLabel}</p>

        {canMockUnlock ? (
          <Button fullWidth type="button" onClick={handleMockUnlock} disabled={processing}>
            {processing ? '處理中...' : `${priceLabel} 解鎖這趟旅程`}
          </Button>
        ) : (
          <Button fullWidth type="button" disabled>
            建立旅程後可解鎖
          </Button>
        )}

        <p className="upgrade-footnote">
          只解鎖目前這趟旅程，不是訂閱。旅程結束後資料仍可查看與結算。
        </p>

        <RestorePurchasesButton
          className="restore-purchases restore-purchases--modal"
          onRestored={() => onUnlocked?.()}
        />
      </div>
    </Modal>
  )
}
