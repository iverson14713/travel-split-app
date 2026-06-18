import { useState } from 'react'
import {
  getRestorePurchasesUserMessage,
  restorePurchases,
} from '../../services/iapService'

interface RestorePurchasesButtonProps {
  className?: string
  onMessage?: (message: string) => void
  onRestored?: (tripIds: string[]) => void
}

export function RestorePurchasesButton({
  className,
  onMessage,
  onRestored,
}: RestorePurchasesButtonProps) {
  const [loading, setLoading] = useState(false)
  const [inlineMessage, setInlineMessage] = useState<string | null>(null)

  const handleClick = async () => {
    setLoading(true)
    setInlineMessage(null)

    try {
      const result = await restorePurchases()
      const message = getRestorePurchasesUserMessage(result)

      setInlineMessage(message)
      onMessage?.(message)

      if (result.status === 'success' && result.restoredTripIds.length > 0) {
        onRestored?.(result.restoredTripIds)
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
        {loading ? '恢復中...' : '恢復購買'}
      </button>
      {inlineMessage && <p className="restore-purchases-message">{inlineMessage}</p>}
    </div>
  )
}
