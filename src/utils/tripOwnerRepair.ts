export interface RepairableMember {
  id: string
  role: 'owner' | 'member'
  status?: string | null
  removed_at?: string | null
  created_at: string
}

export interface OwnerRepairPlan {
  ownerMemberId: string | null
  ownerMemberIdChanged: boolean
  roleUpdates: Array<{ id: string; role: 'owner' | 'member' }>
  needsUpdate: boolean
}

function isActiveMemberRow(member: RepairableMember): boolean {
  return member.status !== 'removed' && member.removed_at == null
}

export function computeOwnerRepair(
  currentOwnerMemberId: string | null | undefined,
  members: RepairableMember[],
): OwnerRepairPlan {
  const activeMembers = members
    .filter(isActiveMemberRow)
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )

  if (activeMembers.length === 0) {
    return {
      ownerMemberId: currentOwnerMemberId ?? null,
      ownerMemberIdChanged: false,
      roleUpdates: [],
      needsUpdate: false,
    }
  }

  const canonicalOwnerId = activeMembers[0].id
  const roleUpdates: Array<{ id: string; role: 'owner' | 'member' }> = []

  for (const member of members) {
    if (!isActiveMemberRow(member)) continue

    const expectedRole = member.id === canonicalOwnerId ? 'owner' : 'member'
    if (member.role !== expectedRole) {
      roleUpdates.push({ id: member.id, role: expectedRole })
    }
  }

  const ownerMemberIdChanged = currentOwnerMemberId !== canonicalOwnerId
  const needsUpdate = ownerMemberIdChanged || roleUpdates.length > 0

  return {
    ownerMemberId: canonicalOwnerId,
    ownerMemberIdChanged,
    roleUpdates,
    needsUpdate,
  }
}
