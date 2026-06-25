export type ItinerarySortable = {
  time: string
  createdAt?: string
}

export function hasScheduledItineraryTime(time: string): boolean {
  const normalized = time.trim()
  if (!normalized) return false
  if (normalized === '全天') return false
  return true
}

export function compareItineraryBySchedule<T extends ItinerarySortable>(
  a: T,
  b: T,
  aOrder = 0,
  bOrder = 0,
): number {
  const aScheduled = hasScheduledItineraryTime(a.time)
  const bScheduled = hasScheduledItineraryTime(b.time)

  if (aScheduled && !bScheduled) return -1
  if (!aScheduled && bScheduled) return 1

  if (aScheduled && bScheduled) {
    const byTime = a.time.localeCompare(b.time)
    if (byTime !== 0) return byTime
  }

  if (a.createdAt && b.createdAt) {
    const byCreated = a.createdAt.localeCompare(b.createdAt)
    if (byCreated !== 0) return byCreated
  }

  return aOrder - bOrder
}

export function sortItineraryItems<T extends ItinerarySortable>(items: T[]): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((left, right) =>
      compareItineraryBySchedule(left.item, right.item, left.index, right.index),
    )
    .map(({ item }) => item)
}

export function sortItineraryItemsByDay<T extends ItinerarySortable & { day: number }>(
  items: T[],
): T[] {
  const byDay = new Map<number, T[]>()

  for (const item of items) {
    const list = byDay.get(item.day) ?? []
    list.push(item)
    byDay.set(item.day, list)
  }

  const result: T[] = []
  for (const day of [...byDay.keys()].sort((a, b) => a - b)) {
    result.push(...sortItineraryItems(byDay.get(day) ?? []))
  }

  return result
}
