import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'

interface TripTooLongModalProps {
  open: boolean
  onClose: () => void
}

export function TripTooLongModal({ open, onClose }: TripTooLongModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="旅程天數太長">
      <div className="trip-too-long-modal">
        <p>
          旅分帳適合管理一趟旅行的行程與分帳。
          <br />
          單趟旅程最長支援 30 天。
          <br />
          如果你有多趟旅行，建議分開建立不同旅程。
        </p>
        <Button fullWidth type="button" onClick={onClose}>
          我知道了
        </Button>
      </div>
    </Modal>
  )
}
