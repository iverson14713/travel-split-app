import type { Expense, Member, Trip } from '../types'

export function isActiveMember(member: Member): boolean {
  return member.status !== 'removed' && !member.leftAt
}

export function isTripOwner(member: Member, trip: Pick<Trip, 'ownerMemberId' | 'members'>): boolean {
  if (trip.ownerMemberId) return member.id === trip.ownerMemberId
  return member.isHost
}

export function getActiveMembers(members: Member[]): Member[] {
  return members.filter(isActiveMember)
}

/** Join-page identity recovery: active members except the trip owner. */
export function getJoinClaimableMembers(members: Member[]): Member[] {
  return getActiveMembers(members).filter((member) => !member.isHost)
}

export function getActiveMemberCount(members: Member[]): number {
  return getActiveMembers(members).length
}

/** Active members plus anyone referenced by an existing expense (for edit forms). */
export function getSelectableMembers(members: Member[], expense?: Expense): Member[] {
  const active = getActiveMembers(members)
  if (!expense) return active

  const referencedIds = new Set(
    [expense.payerId, expense.receiverId, ...expense.participantIds].filter(Boolean) as string[],
  )
  const extras = members.filter((m) => referencedIds.has(m.id) && !isActiveMember(m))
  const activeIds = new Set(active.map((m) => m.id))
  return [...active, ...extras.filter((m) => !activeIds.has(m.id))]
}
