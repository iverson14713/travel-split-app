import { useMemo } from 'react'
import type { Trip } from '../../types'
import type { ReloadOptions } from '../../hooks/useTrip'
import { useRemoveMember } from '../../hooks/useRemoveMember'
import { useTripUnlock } from '../../hooks/useTripUnlock'
import { FREE_LIMITS } from '../../constants/freeLimits'
import { getActiveMembers } from '../../utils/members'
import { Modal } from '../ui/Modal'
import { ActiveMemberList } from './ActiveMemberList'
import { RemoveMemberConfirmModal } from './RemoveMemberConfirmModal'

interface TripMembersModalProps {
  open: boolean
  onClose: () => void
  trip: Trip
  tripId: string
  isHost: boolean
  onReload: (options?: ReloadOptions) => Promise<void>
  onStatusMessage?: (message: string) => void
}

export function TripMembersModal({
  open,
  onClose,
  trip,
  tripId,
  isHost,
  onReload,
  onStatusMessage,
}: TripMembersModalProps) {
  const activeMembers = useMemo(() => getActiveMembers(trip.members), [trip.members])
  const { usage } = useTripUnlock(trip)
  const isArchived = trip.status === 'archived'
  const canRemove = isHost && !isArchived

  const {
    memberToRemove,
    removingMember,
    removeError,
    requestRemove,
    cancelRemove,
    confirmRemove,
  } = useRemoveMember({
    tripId,
    onReload,
    onRemoved: (member) => onStatusMessage?.(`已移除 ${member.nickname}`),
  })

  const footerHint = useMemo(() => {
    if (!usage) return null
    if (usage.isUnlimited) return '此旅程已解鎖，可加入更多成員。'
    if (usage.members >= FREE_LIMITS.maxMembers) {
      return '免費版最多 4 位成員，解鎖後可邀請更多同伴。'
    }
    return null
  }, [usage])

  return (
    <>
      <Modal open={open} onClose={onClose} title="旅程成員">
        <div className="trip-members-modal">
          <ActiveMemberList
            members={activeMembers}
            showRemove={canRemove}
            onRemove={requestRemove}
          />
          {footerHint && <p className="trip-members-modal-hint">{footerHint}</p>}
        </div>
      </Modal>

      <RemoveMemberConfirmModal
        member={memberToRemove}
        open={memberToRemove != null}
        removing={removingMember}
        error={removeError}
        onClose={cancelRemove}
        onConfirm={confirmRemove}
      />
    </>
  )
}
