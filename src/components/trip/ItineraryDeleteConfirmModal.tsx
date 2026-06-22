import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'

interface ItineraryDeleteConfirmModalProps {
  open: boolean
  deleting: boolean
  error: string
  onClose: () => void
  onConfirm: () => void
}

export function ItineraryDeleteConfirmModal({
  open,
  deleting,
  error,
  onClose,
  onConfirm,
}: ItineraryDeleteConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="刪除行程？">
      <div className="form">
        <p className="settings-hint">刪除後，這筆行程會從旅程中移除，其他同伴也會看不到。</p>
        {error && <p className="form-error-msg">{error}</p>}
        <Button fullWidth variant="outline" type="button" onClick={onClose} disabled={deleting}>
          取消
        </Button>
        <Button fullWidth variant="secondary" type="button" onClick={onConfirm} disabled={deleting}>
          {deleting ? '刪除中...' : '刪除'}
        </Button>
      </div>
    </Modal>
  )
}
