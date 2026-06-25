import { describe, expect, it } from 'vitest'
import { sortItineraryItems } from './itinerarySort'

describe('sortItineraryItems', () => {
  it('places timed items before timeless items', () => {
    const items = [
      { time: '', title: 'check in後逛街晚餐', createdAt: '2026-01-01T04:00:00.000Z' },
      { time: '10:45', title: '立榮航空', createdAt: '2026-01-01T01:00:00.000Z' },
      { time: '', title: '住廈門喜來登酒店', createdAt: '2026-01-01T05:00:00.000Z' },
      { time: '11:50', title: '到金門', createdAt: '2026-01-01T02:00:00.000Z' },
      { time: '15:30', title: '渡輪', createdAt: '2026-01-01T03:00:00.000Z' },
      { time: '16:10', title: '到廈門', createdAt: '2026-01-01T03:30:00.000Z' },
    ]

    expect(sortItineraryItems(items).map((item) => item.title)).toEqual([
      '立榮航空',
      '到金門',
      '渡輪',
      '到廈門',
      'check in後逛街晚餐',
      '住廈門喜來登酒店',
    ])
  })

  it('keeps creation order among timeless items', () => {
    const items = [
      { time: '全天', title: '第二筆無時間' },
      { time: '', title: '第一筆無時間' },
      { time: '', title: '第三筆無時間' },
    ]

    expect(sortItineraryItems(items).map((item) => item.title)).toEqual([
      '第二筆無時間',
      '第一筆無時間',
      '第三筆無時間',
    ])
  })
})
