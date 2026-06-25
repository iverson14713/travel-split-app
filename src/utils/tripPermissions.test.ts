import { describe, expect, it } from 'vitest'
import type { Member, Trip } from '../types'
import {
  canMemberEditItineraryNotes,
  canMemberFullyEditItinerary,
  getItineraryLockedBlockedReason,
  isTripOwnerMember,
} from './tripPermissions'

function makeMember(overrides: Partial<Member> & Pick<Member, 'id'>): Member {
  return {
    nickname: 'Member',
    isHost: false,
    joinedAt: '2026-01-01T00:00:00.000Z',
    status: 'active',
    ...overrides,
  }
}

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 'trip-1',
    code: 'ABC123',
    name: 'Test Trip',
    destination: 'Tokyo',
    startDate: '2026-07-01',
    endDate: '2026-07-05',
    status: 'active',
    lastActivityAt: '2026-06-01T00:00:00.000Z',
    editPermission: 'all_members',
    itineraryLocked: false,
    baseCurrency: 'TWD',
    jpyToTwdRate: 0.215,
    usdToTwdRate: 32,
    exchangeRateSource: 'fallback',
    exchangeRatesToTwd: { TWD: 1 },
    ownerMemberId: 'owner-1',
    members: [
      makeMember({ id: 'owner-1', nickname: 'Host', isHost: true }),
      makeMember({ id: 'member-2', nickname: 'Guest' }),
    ],
    itinerary: [],
    expenses: [],
    createdAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('tripPermissions', () => {
  it('identifies owner by ownerMemberId', () => {
    const trip = makeTrip()
    expect(isTripOwnerMember('owner-1', trip)).toBe(true)
    expect(isTripOwnerMember('member-2', trip)).toBe(false)
  })

  it('allows all members to edit itinerary when unlocked', () => {
    const trip = makeTrip({ itineraryLocked: false })
    expect(canMemberFullyEditItinerary(trip, 'member-2', { today: '2026-07-02' })).toBe(true)
  })

  it('restricts itinerary edits to owner when locked', () => {
    const trip = makeTrip({ itineraryLocked: true })
    expect(canMemberFullyEditItinerary(trip, 'owner-1', { today: '2026-07-02' })).toBe(true)
    expect(canMemberFullyEditItinerary(trip, 'member-2', { today: '2026-07-02' })).toBe(false)
    expect(getItineraryLockedBlockedReason(trip, 'member-2')).toBe('locked')
  })

  it('keeps expense lifecycle separate from itinerary lock', () => {
    const trip = makeTrip({ itineraryLocked: true })
    expect(canMemberEditItineraryNotes(trip, 'member-2', { today: '2026-07-06' })).toBe(false)
  })
})
