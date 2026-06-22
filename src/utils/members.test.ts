import { describe, expect, it } from 'vitest'
import { getJoinClaimableMembers } from './members'
import type { Member } from '../types'

describe('getJoinClaimableMembers', () => {
  const members: Member[] = [
    {
      id: 'owner',
      nickname: 'Wayne',
      isHost: true,
      joinedAt: '2026-06-01T00:00:00.000Z',
      status: 'active',
    },
    {
      id: 'member',
      nickname: '老媽',
      isHost: false,
      joinedAt: '2026-06-02T00:00:00.000Z',
      status: 'active',
    },
  ]

  it('excludes the trip owner from join identity recovery', () => {
    expect(getJoinClaimableMembers(members)).toEqual([members[1]])
  })
})
