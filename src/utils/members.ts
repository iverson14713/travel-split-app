import type { Expense, Member } from '../types'

export function isActiveMember(member: Member): boolean {
  return member.status !== 'removed'
}

export function getActiveMembers(members: Member[]): Member[] {
  return members.filter(isActiveMember)
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
