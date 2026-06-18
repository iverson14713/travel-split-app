import { useEffect, useState } from 'react'
import { DEVELOPER_UNLOCK_CODE } from '../../constants/freeLimits'
import {
  getDeveloperGlobalUnlock,
  getEffectiveTripUnlockStatus,
  getTripUnlockOverride,
  setDeveloperGlobalUnlock,
  setTripUnlockOverride,
  type TripUnlockStatus,
} from '../../services/tripUnlockService'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'

interface DeveloperModeModalProps {
  open: boolean
  onClose: () => void
  tripId: string
  onChanged: () => void
}

export function DeveloperModeModal({ open, onClose, tripId, onChanged }: DeveloperModeModalProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [developerEnabled, setDeveloperEnabled] = useState(false)
  const [override, setOverride] = useState<string | null>(null)
  const [status, setStatus] = useState<TripUnlockStatus>('free')

  useEffect(() => {
    if (!open) return
    setCode('')
    setError('')
    setNotice('')
    setDeveloperEnabled(getDeveloperGlobalUnlock())
    setOverride(getTripUnlockOverride(tripId))
    setStatus(getEffectiveTripUnlockStatus(tripId))
  }, [open, tripId])

  const handleActivateDeveloper = () => {
    setError('')
    setNotice('')
    if (code.trim() !== DEVELOPER_UNLOCK_CODE) {
      setError('解鎖碼錯誤')
      return
    }
    setDeveloperGlobalUnlock(true)
    setDeveloperEnabled(true)
    setNotice('已啟用開發者解鎖')
    onChanged()
  }

  const handleSimulateFree = () => {
    setTripUnlockOverride(tripId, 'free')
    setOverride('free')
    setNotice('已模擬 Free 限制')
    onChanged()
  }

  const handleSimulateUnlocked = () => {
    setTripUnlockOverride(tripId, 'unlocked')
    setOverride('unlocked')
    setNotice('已模擬此旅程已解鎖')
    onChanged()
  }

  const handleClearOverride = () => {
    setTripUnlockOverride(tripId, null)
    setOverride(null)
    setNotice('已清除本趟測試狀態')
    onChanged()
  }

  const handleDisableDeveloper = () => {
    setDeveloperGlobalUnlock(false)
    setDeveloperEnabled(false)
    setNotice('已關閉開發者全功能解鎖')
    onChanged()
  }

  if (!developerEnabled) {
    return (
      <Modal open={open} onClose={onClose} title="開發者模式">
        <div className="form">
          <p className="settings-hint">請輸入開發者解鎖碼</p>
          <Input
            label="解鎖碼"
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="輸入解鎖碼"
          />
          {error && <p className="form-error-msg">{error}</p>}
          {notice && <p className="settings-hint">{notice}</p>}
          <Button fullWidth type="button" onClick={handleActivateDeveloper}>
            啟用開發者解鎖
          </Button>
        </div>
      </Modal>
    )
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
          <Button fullWidth type="button" variant="outline" onClick={handleSimulateFree}>
            模擬 Free
          </Button>
          <Button fullWidth type="button" variant="outline" onClick={handleSimulateUnlocked}>
            模擬已解鎖此旅程
          </Button>
          <Button fullWidth type="button" variant="outline" onClick={handleClearOverride}>
            清除本趟測試狀態
          </Button>
          <Button fullWidth type="button" variant="secondary" onClick={handleDisableDeveloper}>
            關閉開發者全功能解鎖
          </Button>
        </div>
      </div>
    </Modal>
  )
}
