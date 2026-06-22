import { useEffect, useState } from 'react'
import {
  getDeveloperGlobalUnlock,
  getEffectiveTripUnlockStatus,
  getTripUnlockOverride,
  recordTripUnlockWindow,
  setDeveloperGlobalUnlock,
  setTripUnlockOverride,
  type TripUnlockStatus,
} from '../../services/tripUnlockService'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'

interface DeveloperModeModalProps {
  open: boolean
  onClose: () => void
  tripId: string
  tripStartDate: string
  onChanged: () => void
}

export function DeveloperModeModal({
  open,
  onClose,
  tripId,
  tripStartDate,
  onChanged,
}: DeveloperModeModalProps) {
  const [notice, setNotice] = useState('')
  const [developerEnabled, setDeveloperEnabled] = useState(false)
  const [override, setOverride] = useState<string | null>(null)
  const [status, setStatus] = useState<TripUnlockStatus>('free')

  useEffect(() => {
    if (!open) return
    setNotice('')
    setDeveloperEnabled(getDeveloperGlobalUnlock())
    setOverride(getTripUnlockOverride(tripId))
    setStatus(getEffectiveTripUnlockStatus(tripId))
  }, [open, tripId])

  const handleEnableDeveloper = () => {
    setDeveloperGlobalUnlock(true)
    setDeveloperEnabled(true)
    setNotice('已啟用開發者全功能解鎖')
    onChanged()
  }

  const handleSimulateFree = () => {
    setTripUnlockOverride(tripId, 'free')
    setOverride('free')
    setStatus(getEffectiveTripUnlockStatus(tripId))
    setNotice('已模擬 Free 限制')
    onChanged()
  }

  const handleSimulateUnlocked = () => {
    setTripUnlockOverride(tripId, 'unlocked')
    recordTripUnlockWindow(tripId, tripStartDate, 'developer')
    setOverride('unlocked')
    setStatus(getEffectiveTripUnlockStatus(tripId))
    setNotice('已模擬此旅程已解鎖')
    onChanged()
  }

  const handleClearOverride = () => {
    setTripUnlockOverride(tripId, null)
    setOverride(null)
    setStatus(getEffectiveTripUnlockStatus(tripId))
    setNotice('已清除本趟測試狀態')
    onChanged()
  }

  const handleDisableDeveloper = () => {
    setDeveloperGlobalUnlock(false)
    setDeveloperEnabled(false)
    setStatus(getEffectiveTripUnlockStatus(tripId))
    setNotice('已關閉開發者全功能解鎖')
    onChanged()
  }

  return (
    <Modal open={open} onClose={onClose} title="開發者模式">
      <div className="developer-mode">
        <p className="settings-hint">
          目前狀態：{status}
          {override ? `（override: ${override}）` : ''}
        </p>
        {notice && <p className="settings-hint">{notice}</p>}
        <div className="developer-mode-actions">
          {!developerEnabled && (
            <Button fullWidth type="button" onClick={handleEnableDeveloper}>
              啟用開發者全功能解鎖
            </Button>
          )}
          <Button fullWidth type="button" variant="outline" onClick={handleSimulateFree}>
            模擬 Free
          </Button>
          <Button fullWidth type="button" variant="outline" onClick={handleSimulateUnlocked}>
            模擬已解鎖此旅程
          </Button>
          <Button fullWidth type="button" variant="outline" onClick={handleClearOverride}>
            清除本趟測試狀態
          </Button>
          {developerEnabled && (
            <Button fullWidth type="button" variant="secondary" onClick={handleDisableDeveloper}>
              關閉開發者全功能解鎖
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
