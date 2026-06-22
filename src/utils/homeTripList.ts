import type { RecentTrip } from '../types'
import {
  getHomeListPhase,
  type HomeListPhase,
  TRIP_LIST_PHASE_LABELS,
} from './tripLifecycle'
import { isFreeTripRetentionExpired } from './tripRetention'

export { TRIP_LIST_PHASE_LABELS }
export type { HomeListPhase }

export interface GroupedRecentTrips {
  active: RecentTrip[]
  upcoming: RecentTrip[]
  ended: RecentTrip[]
  archived: RecentTrip[]
  expired: RecentTrip[]
}

function compareDateAsc(a?: string, b?: string): number {
  return (a ?? '9999-99-99').localeCompare(b ?? '9999-99-99')
}

function compareDateDesc(a?: string, b?: string): number {
  return (b ?? '').localeCompare(a ?? '')
}

function sortActiveTrips(trips: RecentTrip[]): RecentTrip[] {
  return [...trips].sort((a, b) => compareDateAsc(a.endDate, b.endDate))
}

function sortUpcomingTrips(trips: RecentTrip[]): RecentTrip[] {
  return [...trips].sort((a, b) => compareDateAsc(a.startDate, b.startDate))
}

function sortEndedTrips(trips: RecentTrip[]): RecentTrip[] {
  return [...trips].sort((a, b) => compareDateDesc(a.endDate, b.endDate))
}

function sortArchivedTrips(trips: RecentTrip[]): RecentTrip[] {
  return [...trips].sort((a, b) => {
    const aKey = a.archivedAt ?? a.endDate ?? a.lastOpenedAt
    const bKey = b.archivedAt ?? b.endDate ?? b.lastOpenedAt
    return compareDateDesc(aKey, bKey)
  })
}

export function groupAndSortRecentTrips(trips: RecentTrip[]): GroupedRecentTrips {
  const groups: GroupedRecentTrips = {
    active: [],
    upcoming: [],
    ended: [],
    archived: [],
    expired: [],
  }

  for (const trip of trips) {
    if (isFreeTripRetentionExpired(trip)) {
      groups.expired.push(trip)
      continue
    }
    groups[getHomeListPhase(trip)].push(trip)
  }

  groups.active = sortActiveTrips(groups.active)
  groups.upcoming = sortUpcomingTrips(groups.upcoming)
  groups.ended = sortEndedTrips(groups.ended)
  groups.archived = sortArchivedTrips(groups.archived)

  return groups
}

export function countVisibleTrips(groups: GroupedRecentTrips): number {
  return groups.active.length + groups.upcoming.length + groups.ended.length + groups.archived.length
}
