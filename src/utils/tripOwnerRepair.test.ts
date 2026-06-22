import { describe, expect, it } from 'vitest'
import { computeOwnerRepair } from './tripOwnerRepair'

describe('computeOwnerRepair', () => {
  it('keeps the earliest active member as owner when owner_member_id is missing', () => {
    const plan = computeOwnerRepair(null, [
      {
        id: 'wayne',
        role: 'member',
        status: 'active',
        created_at: '2026-06-01T00:00:00.000Z',
      },
      {
        id: 'mom',
        role: 'owner',
        status: 'active',
        created_at: '2026-06-02T00:00:00.000Z',
      },
    ])

    expect(plan.needsUpdate).toBe(true)
    expect(plan.ownerMemberId).toBe('wayne')
    expect(plan.roleUpdates).toEqual([
      { id: 'wayne', role: 'owner' },
      { id: 'mom', role: 'member' },
    ])
  })

  it('does not change trips that already have the correct owner', () => {
    const plan = computeOwnerRepair('wayne', [
      {
        id: 'wayne',
        role: 'owner',
        status: 'active',
        created_at: '2026-06-01T00:00:00.000Z',
      },
      {
        id: 'mom',
        role: 'member',
        status: 'active',
        created_at: '2026-06-02T00:00:00.000Z',
      },
    ])

    expect(plan.needsUpdate).toBe(false)
    expect(plan.ownerMemberId).toBe('wayne')
    expect(plan.roleUpdates).toEqual([])
  })

  it('demotes extra owners and keeps only the earliest creator', () => {
    const plan = computeOwnerRepair('mom', [
      {
        id: 'wayne',
        role: 'member',
        status: 'active',
        created_at: '2026-06-01T00:00:00.000Z',
      },
      {
        id: 'mom',
        role: 'owner',
        status: 'active',
        created_at: '2026-06-02T00:00:00.000Z',
      },
      {
        id: 'friend',
        role: 'owner',
        status: 'active',
        created_at: '2026-06-03T00:00:00.000Z',
      },
    ])

    expect(plan.ownerMemberIdChanged).toBe(true)
    expect(plan.ownerMemberId).toBe('wayne')
    expect(plan.roleUpdates).toEqual([
      { id: 'wayne', role: 'owner' },
      { id: 'mom', role: 'member' },
      { id: 'friend', role: 'member' },
    ])
  })

  it('ignores removed members when choosing the canonical owner', () => {
    const plan = computeOwnerRepair(null, [
      {
        id: 'removed',
        role: 'owner',
        status: 'removed',
        removed_at: '2026-06-02T00:00:00.000Z',
        created_at: '2026-06-01T00:00:00.000Z',
      },
      {
        id: 'wayne',
        role: 'member',
        status: 'active',
        created_at: '2026-06-02T00:00:00.000Z',
      },
    ])

    expect(plan.ownerMemberId).toBe('wayne')
    expect(plan.roleUpdates).toEqual([{ id: 'wayne', role: 'owner' }])
  })
})
