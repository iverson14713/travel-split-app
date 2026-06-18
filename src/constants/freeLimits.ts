export const FREE_LIMITS = {
  maxMembers: 4,
  maxDays: 5,
  maxExpenses: 30,
} as const

export type EstimatedMemberCount = 2 | 3 | 4 | 5

/** 5 代表「5 人以上」 */
export const ESTIMATED_MEMBER_FIVE_PLUS: EstimatedMemberCount = 5

export const ESTIMATED_MEMBER_OPTIONS: { value: EstimatedMemberCount; label: string }[] = [
  { value: 2, label: '2 人' },
  { value: 3, label: '3 人' },
  { value: 4, label: '4 人' },
  { value: 5, label: '5 人以上' },
]

export const TRIP_UNLOCK_PRICE_LABEL = 'NT$49'

export const DEVELOPER_UNLOCK_CODE = 'A126452345'
