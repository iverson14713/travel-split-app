import { useMemo, useState } from 'react'
import { UPGRADE_FEATURES } from '../../constants/freeLimits'
import { useTripUnlockPriceLabel } from '../../hooks/useTripUnlockPriceLabel'
import { unlockTripWithPurchaseOrMock } from '../../services/iapService'
import {
  getTripUsageLimits,
  getUpgradeLeadCopy,
  getUpgradeModalTitle,
  getUpgradeReasonCopy,
  type UpgradeReason,
} from '../../services/tripUnlockService'
import type { Trip } from '../../types'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { FreeUsageHint } from './FreeUsageHint'
import { RestoreTripUnlockButton } from './RestorePurchasesButton'

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
  const [error, setError] = useState('')
  const priceLabel = useTripUnlockPriceLabel()
  const reasonCopy = getUpgradeReasonCopy(reason)
  const usage = useMemo(() => (trip ? getTripUsageLimits(trip) : null), [trip])
  const canUnlock = !!trip?.id || !!onUnlockAndProceed
  const showReasonBlock =
    reason !== 'manual_unlock' &&
    reason !== 'create_member_limit' &&
    reasonCopy.headline

  const handleUnlock = async () => {
    setError('')

    if (onUnlockAndProceed) {
      setProcessing(true)
      try {
        await onUnlockAndProceed()
        onUnlocked?.()
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : '解鎖失敗，請稍後再試')
      } finally {
        setProcessing(false)
      }
      return
    }

    if (!trip?.id || !trip.startDate) return

    setProcessing(true)
    try {
      const result = await unlockTripWithPurchaseOrMock(trip.id, trip.startDate)
      if (result.status === 'cancelled') {
        return
      }
      if (result.status === 'error') {
        setError(result.message)
        return
      }
      onUnlocked?.()
      onClose()
    } finally {
      setProcessing(false)
    }
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

        {canUnlock ? (
          <Button fullWidth type="button" onClick={handleUnlock} disabled={processing}>
            {processing ? '處理中...' : `單趟解鎖 ${priceLabel}`}
          </Button>
        ) : (
          <Button fullWidth type="button" disabled>
            建立旅程後可解鎖
          </Button>
        )}

        {error && <p className="form-error-msg">{error}</p>}

        <p className="upgrade-footnote">只解鎖目前這趟旅程，不是訂閱。</p>

        {trip?.id && (
          <RestoreTripUnlockButton
            tripId={trip.id}
            className="restore-purchases restore-purchases--modal"
            onRestored={() => onUnlocked?.()}
          />
        )}
      </div>
    </Modal>
  )
}
