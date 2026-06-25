import { describe, expect, it } from 'vitest'
import type { Member } from '../types'
import {
  DUPLICATE_NICKNAME_ERROR,
  buildMemberDisplayLabelMap,
  isDuplicateNickname,
  normalizeMemberNickname,
} from './memberNames'

function makeMember(overrides: Partial<Member> & Pick<Member, 'id' | 'nickname'>): Member {
  return {
    isHost: false,
    joinedAt: '2026-01-01T00:00:00.000Z',
    status: 'active',
    ...overrides,
  }
}

describe('memberNames', () => {
  it('normalizes nicknames case-insensitively', () => {
    expect(normalizeMemberNickname(' Wayne ')).toBe('wayne')
  })

  it('detects duplicate nicknames', () => {
    const members = [
      makeMember({ id: '1', nickname: 'Wayne' }),
      makeMember({ id: '2', nickname: 'Amy' }),
    ]
    expect(isDuplicateNickname(members, 'wayne')).toBe(true)
    expect(isDuplicateNickname(members, 'wayne', '1')).toBe(false)
    expect(isDuplicateNickname(members, 'Bob')).toBe(false)
  })

  it('disambiguates duplicate display labels', () => {
    const members = [
      makeMember({ id: '1', nickname: 'Wayne', joinedAt: '2026-01-01T00:00:00.000Z' }),
      makeMember({ id: '2', nickname: 'Wayne', joinedAt: '2026-01-02T00:00:00.000Z' }),
    ]
    const labels = buildMemberDisplayLabelMap(members, '2')
    expect(labels.get('1')).toBe('Wayne（成員 1）')
    expect(labels.get('2')).toBe('Wayne（你）')
  })

  it('exports duplicate error message', () => {
    expect(DUPLICATE_NICKNAME_ERROR).toBe('這個名稱已有人使用，請換一個')
  })
})
