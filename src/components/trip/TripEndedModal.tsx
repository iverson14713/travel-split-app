import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'

interface TripEndedModalProps {
  open: boolean
  onClose: () => void
}

export function TripEndedModal({ open, onClose }: TripEndedModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="旅程已結束">
      <div className="form">
        <p className="settings-hint">
          這趟旅程已結束，資料仍可查看與結算，但不能再新增或編輯行程與支出。
          如果是新的旅行，請建立新的旅程。
        </p>
        <Button fullWidth type="button" onClick={onClose}>
          我知道了
        </Button>
      </div>
    </Modal>
  )
}
