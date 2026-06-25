import { describe, expect, it } from 'vitest'
import { parseItineraryText } from './parseItineraryText'

const TRIP_START = '2026-07-01'
const TRIP_END = '2026-07-05'

describe('parseItineraryText fallback parser', () => {
  it('parses compact multi-time itinerary text', () => {
    const input =
      '10:45立榮航空11:50到金門，15:30渡輪16:10到廈門，check in後逛街晚餐，住廈門喜來登酒店'

    const result = parseItineraryText(input, TRIP_START, TRIP_END)
    const titles = result.items.map((item) => item.title)

    expect(titles).toEqual([
      '立榮航空',
      '到金門',
      '渡輪',
      '到廈門',
      'check in後逛街晚餐',
      '住廈門喜來登酒店',
    ])
    expect(result.items[0]?.time).toBe('10:45')
    expect(result.items[1]?.time).toBe('11:50')
    expect(result.items[2]?.time).toBe('15:30')
    expect(result.items[3]?.time).toBe('16:10')
    expect(result.items[4]?.time).toBe('')
    expect(result.items[5]?.time).toBe('')
  })

  it('creates a fallback item when text cannot be structured', () => {
    const result = parseItineraryText('隨便寫幾個字', TRIP_START, TRIP_END)
    expect(result.items.length + result.outOfRangeItems.length).toBeGreaterThan(0)
  })
})
