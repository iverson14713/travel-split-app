import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import type { TripEditBlockReason, TripItineraryBlockReason } from '../../utils/tripLifecycle'

export type TripBlockModalReason = TripEditBlockReason | TripItineraryBlockReason

interface TripEndedModalProps {
  open: boolean
  onClose: () => void
  reason?: TripBlockModalReason
  /** expense：新增/編輯支出；itinerary：新增/編輯行程 */
  context?: 'expense' | 'itinerary'
}

const COPY: Record<
  TripBlockModalReason,
  { title: string; expense: string; itinerary: string }
> = {
  ended: {
    title: '旅程已結束',
    expense: '旅程已結束，無法再新增支出。',
    itinerary: '這趟旅程已結束，無法再新增或編輯行程。',
  },
  archived: {
    title: '旅程已封存',
    expense: '這趟旅程已封存，僅供查看，無法新增或編輯支出。',
    itinerary: '這趟旅程已封存，僅供查看，無法新增或編輯行程。',
  },
  settling: {
    title: '整理期間',
    expense: '整理期間仍可補記支出。',
    itinerary: '整理期間僅可編輯既有行程備註，無法新增行程。',
  },
}

export function TripEndedModal({
  open,
  onClose,
  reason = 'ended',
  context = 'expense',
}: TripEndedModalProps) {
  const copy = COPY[reason]

  return (
    <Modal open={open} onClose={onClose} title={copy.title}>
      <div className="form">
        <p className="settings-hint">{copy[context]}</p>
        <Button fullWidth type="button" onClick={onClose}>
          我知道了
        </Button>
      </div>
    </Modal>
  )
}
