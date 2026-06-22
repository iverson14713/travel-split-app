import { describe, expect, it } from 'vitest'
import { calculateSettlementTransfersInTwd } from './settlement'
import type { Expense, Member } from '../types'

const members: Member[] = [
  {
    id: 'dad',
    nickname: '老爸',
    isHost: false,
    joinedAt: '2026-06-01T00:00:00.000Z',
    status: 'active',
  },
  {
    id: 'wayne',
    nickname: 'Wayne',
    isHost: true,
    joinedAt: '2026-06-01T00:00:00.000Z',
    status: 'active',
  },
]

describe('transfer settlement', () => {
  it('reduces outstanding balance after a repayment transfer is recorded', () => {
    const expenses: Expense[] = [
      {
        id: '1',
        type: 'expense',
        amount: 4000,
        currency: 'TWD',
        exchangeRateToTwd: 1,
        payerId: 'wayne',
        participantIds: ['dad', 'wayne'],
        category: '餐飲',
        note: '',
        createdAt: '2026-06-02T00:00:00.000Z',
      },
    ]

    const before = calculateSettlementTransfersInTwd({ members, expenses })
    expect(before[0]?.items).toEqual([
      expect.objectContaining({
        fromId: 'dad',
        toId: 'wayne',
        amount: 2000,
        currency: 'TWD',
      }),
    ])

    const afterExpenses: Expense[] = [
      ...expenses,
      {
        id: '2',
        type: 'transfer',
        amount: 2000,
        currency: 'TWD',
        exchangeRateToTwd: 1,
        payerId: 'dad',
        receiverId: 'wayne',
        participantIds: [],
        category: '還款',
        note: '結算還款',
        createdAt: '2026-06-03T00:00:00.000Z',
      },
    ]

    const after = calculateSettlementTransfersInTwd({ members, expenses: afterExpenses })
    expect(after[0]?.items).toEqual([])
  })

  it('keeps partial repayment balance', () => {
    const expenses: Expense[] = [
      {
        id: '1',
        type: 'expense',
        amount: 4000,
        currency: 'TWD',
        exchangeRateToTwd: 1,
        payerId: 'wayne',
        participantIds: ['dad', 'wayne'],
        category: '餐飲',
        note: '',
        createdAt: '2026-06-02T00:00:00.000Z',
      },
      {
        id: '2',
        type: 'transfer',
        amount: 1000,
        currency: 'TWD',
        exchangeRateToTwd: 1,
        payerId: 'dad',
        receiverId: 'wayne',
        participantIds: [],
        category: '還款',
        note: '',
        createdAt: '2026-06-03T00:00:00.000Z',
      },
    ]

    const result = calculateSettlementTransfersInTwd({ members, expenses })
    expect(result[0]?.items).toEqual([
      expect.objectContaining({
        fromId: 'dad',
        toId: 'wayne',
        amount: 1000,
      }),
    ])
  })
})
