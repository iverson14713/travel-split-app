import type { Member } from '../types'

export const DUPLICATE_NICKNAME_ERROR = '這個名稱已有人使用，請換一個'

export function normalizeMemberNickname(name: string): string {
  return name.trim().toLowerCase()
}

function isNameEligibleMember(member: Member): boolean {
  return member.status !== 'removed'
}

export function isDuplicateNickname(
  members: Member[],
  nickname: string,
  excludeMemberId?: string,
): boolean {
  const normalized = normalizeMemberNickname(nickname)
  if (!normalized) return false

  return members.some(
    (member) =>
      isNameEligibleMember(member) &&
      member.id !== excludeMemberId &&
      normalizeMemberNickname(member.nickname) === normalized,
  )
}

export function buildMemberDisplayLabelMap(
  members: Member[],
  currentMemberId?: string,
): Map<string, string> {
  const eligible = members.filter(isNameEligibleMember)
  const byNormalized = new Map<string, Member[]>()

  for (const member of eligible) {
    const key = normalizeMemberNickname(member.nickname)
    const list = byNormalized.get(key) ?? []
    list.push(member)
    byNormalized.set(key, list)
  }

  const labels = new Map<string, string>()

  for (const group of byNormalized.values()) {
    const sorted = [...group].sort((a, b) => a.joinedAt.localeCompare(b.joinedAt))

    if (sorted.length === 1) {
      const member = sorted[0]!
      labels.set(member.id, formatMemberLabel(member.nickname, member.leftAt))
      continue
    }

    sorted.forEach((member, index) => {
      const suffix = member.id === currentMemberId ? '（你）' : `（成員 ${index + 1}）`
      labels.set(member.id, formatMemberLabel(`${member.nickname}${suffix}`, member.leftAt))
    })
  }

  return labels
}

function formatMemberLabel(base: string, leftAt?: string): string {
  return leftAt ? `${base}（已退出）` : base
}

export function getMemberDisplayLabel(
  members: Member[],
  memberId: string,
  currentMemberId?: string,
): string {
  const map = buildMemberDisplayLabelMap(members, currentMemberId)
  const fromMap = map.get(memberId)
  if (fromMap) return fromMap
  const member = members.find((item) => item.id === memberId)
  if (!member) return '未知'
  return formatMemberLabel(member.nickname, member.leftAt)
}
