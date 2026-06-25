import type { Member, Trip } from '../types'
import {
  canEditItinerary,
  canEditItineraryNotes,
  type TripLifecycleInput,
  type TripLifecycleOptions,
} from './tripLifecycle'

export const ITINERARY_LOCKED_MESSAGE = '行程已鎖定，請由主揪修改'

export type TripItineraryPermissionInput = TripLifecycleInput & {
  itineraryLocked?: boolean
  ownerMemberId?: string
  members?: Member[]
}

export function isTripOwnerMember(
  memberId: string | undefined,
  trip: Pick<Trip, 'ownerMemberId' | 'members'>,
): boolean {
  if (!memberId) return false
  if (trip.ownerMemberId) return memberId === trip.ownerMemberId
  const member = trip.members.find((item) => item.id === memberId)
  return member?.isHost === true
}

export function isItineraryLocked(trip: { itineraryLocked?: boolean }): boolean {
  return trip.itineraryLocked === true
}

export function canMemberFullyEditItinerary(
  trip: TripItineraryPermissionInput,
  memberId: string | undefined,
  options?: TripLifecycleOptions,
): boolean {
  if (!memberId) return false
  if (!canEditItinerary(trip, options)) return false
  if (!isItineraryLocked(trip)) return true
  return isTripOwnerMember(memberId, trip as Pick<Trip, 'ownerMemberId' | 'members'>)
}

export function canMemberEditItineraryNotes(
  trip: TripItineraryPermissionInput,
  memberId: string | undefined,
  options?: TripLifecycleOptions,
): boolean {
  if (!memberId) return false
  if (!canEditItineraryNotes(trip, options)) return false
  if (!isItineraryLocked(trip)) return true
  return isTripOwnerMember(memberId, trip as Pick<Trip, 'ownerMemberId' | 'members'>)
}

export function getItineraryLockedBlockedReason(
  trip: TripItineraryPermissionInput,
  memberId: string | undefined,
): 'locked' | null {
  if (!isItineraryLocked(trip)) return null
  if (isTripOwnerMember(memberId, trip as Pick<Trip, 'ownerMemberId' | 'members'>)) return null
  return 'locked'
}
