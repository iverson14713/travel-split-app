import type { Member } from '../../types'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'

interface RemoveMemberConfirmModalProps {
  member: Member | null
  open: boolean
  removing: boolean
  error: string
  onClose: () => void
  onConfirm: () => void
}

export function RemoveMemberConfirmModal({
  member,
  open,
  removing,
  error,
  onClose,
  onConfirm,
}: RemoveMemberConfirmModalProps) {
  if (!member) return null

  return (
    <Modal open={open} onClose={onClose} title="移除成員？">
      <div className="form">
        <p className="settings-hint">
          移除後，該成員將無法再以這個身分進入旅程。
          <br />
          既有行程與記帳紀錄會保留，不會刪除歷史資料。
        </p>
        {error && <p className="form-error-msg">{error}</p>}
        <Button fullWidth variant="outline" type="button" onClick={onClose} disabled={removing}>
          取消
        </Button>
        <Button fullWidth variant="secondary" type="button" onClick={onConfirm} disabled={removing}>
          {removing ? '移除中...' : '移除成員'}
        </Button>
      </div>
    </Modal>
  )
}
