import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { FREE_TRIP_RETENTION_DAYS } from '../../constants/tripRetention'

interface TripRetentionExpiredModalProps {
  open: boolean
  onClose: () => void
}

export function TripRetentionExpiredModal({ open, onClose }: TripRetentionExpiredModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="免費旅程資料已過期">
      <div className="form">
        <p className="settings-hint">
          免費旅程結束後會保留 {FREE_TRIP_RETENTION_DAYS} 天。
          這趟旅程的免費保存期限已結束。
        </p>
        <Button fullWidth type="button" onClick={onClose}>
          我知道了
        </Button>
      </div>
    </Modal>
  )
}
