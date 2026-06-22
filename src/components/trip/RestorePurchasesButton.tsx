import { useState } from 'react'
import {
  getRestoreTripUnlockMessage,
  restoreTripUnlock,
} from '../../services/iapService'

interface RestoreTripUnlockButtonProps {
  tripId: string
  className?: string
  onMessage?: (message: string) => void
  onRestored?: () => void
}

export function RestoreTripUnlockButton({
  tripId,
  className,
  onMessage,
  onRestored,
}: RestoreTripUnlockButtonProps) {
  const [loading, setLoading] = useState(false)
  const [inlineMessage, setInlineMessage] = useState<string | null>(null)

  const handleClick = async () => {
    setLoading(true)
    setInlineMessage(null)

    try {
      const result = await restoreTripUnlock(tripId)
      const message = getRestoreTripUnlockMessage(result)

      setInlineMessage(message)
      onMessage?.(message)

      if (result.status === 'success') {
        onRestored?.()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={className ?? 'restore-purchases'}>
      <button
        type="button"
        className="restore-purchases-btn"
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? '檢查中...' : '恢復此旅程解鎖'}
      </button>
      {inlineMessage && <p className="restore-purchases-message">{inlineMessage}</p>}
    </div>
  )
}

/** @deprecated 使用 RestoreTripUnlockButton */
export const RestorePurchasesButton = RestoreTripUnlockButton
