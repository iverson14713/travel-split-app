import { useState } from 'react'
import type { Member } from '../types'
import type { ReloadOptions } from './useTrip'
import { removeMember } from '../services/tripService'

interface UseRemoveMemberOptions {
  tripId: string
  onReload: (options?: ReloadOptions) => Promise<void>
  onRemoved?: (member: Member) => void
}

export function useRemoveMember({ tripId, onReload, onRemoved }: UseRemoveMemberOptions) {
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null)
  const [removingMember, setRemovingMember] = useState(false)
  const [removeError, setRemoveError] = useState('')

  const requestRemove = (member: Member) => {
    setRemoveError('')
    setMemberToRemove(member)
  }

  const cancelRemove = () => {
    if (removingMember) return
    setMemberToRemove(null)
    setRemoveError('')
  }

  const confirmRemove = async () => {
    if (!memberToRemove) return
    setRemoveError('')
    setRemovingMember(true)
    try {
      await removeMember(memberToRemove.id, tripId)
      await onReload({ silent: true })
      onRemoved?.(memberToRemove)
      setMemberToRemove(null)
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : '移除成員失敗')
    } finally {
      setRemovingMember(false)
    }
  }

  return {
    memberToRemove,
    removingMember,
    removeError,
    requestRemove,
    cancelRemove,
    confirmRemove,
  }
}
