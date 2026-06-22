/** Supabase table names for 旅分帳 (prefixed to avoid conflicts in shared projects) */
export const DB_TABLES = {
  trips: 'travel_trips',
  members: 'travel_members',
  itineraryItems: 'travel_itinerary_items',
  expenses: 'travel_expenses',
  tripUnlocks: 'trip_unlocks',
} as const

export type DbTableName = (typeof DB_TABLES)[keyof typeof DB_TABLES]
