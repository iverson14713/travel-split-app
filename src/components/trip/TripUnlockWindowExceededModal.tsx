import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { formatUnlockMaxEndDate } from '../../services/tripUnlockService'

interface TripUnlockWindowExceededModalProps {
  open: boolean
  maxEndDate: string
  onClose: () => void
}

export function TripUnlockWindowExceededModal({
  open,
  maxEndDate,
  onClose,
}: TripUnlockWindowExceededModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="超過此趟旅程可用日期">
      <div className="trip-too-long-modal">
        <p>
          單趟解鎖適用於一趟旅行。
          <br />
          此旅程最多可設定至 {formatUnlockMaxEndDate(maxEndDate)}。
          <br />
          如果是新的旅行，建議另外建立一趟旅程。
        </p>
        <Button fullWidth type="button" onClick={onClose}>
          我知道了
        </Button>
      </div>
    </Modal>
  )
}
