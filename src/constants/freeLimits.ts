export const FREE_LIMITS = {
  maxMembers: 4,
  maxDays: 5,
  maxExpenses: 30,
} as const

/** 單趟解鎖後的天數上限（含 mock / IAP / 開發者解鎖） */
export const UNLOCKED_LIMITS = {
  maxDays: 30,
} as const

/** 單趟旅程硬性上限，任何方案都不可超過 */
export const ABSOLUTE_MAX_TRIP_DAYS = 30

export const UPGRADE_FEATURES = [
  '最多 30 天旅程',
  '旅程結束後仍可查看與結算',
  '不限成員數',
  '不限記帳筆數',
  '完整統計與結算',
  '移除推薦卡，畫面更清爽',
] as const

export type EstimatedMemberCount = 2 | 3 | 4 | 5

/** 5 代表「5 人以上」 */
export const ESTIMATED_MEMBER_FIVE_PLUS: EstimatedMemberCount = 5

export const ESTIMATED_MEMBER_OPTIONS: { value: EstimatedMemberCount; label: string }[] = [
  { value: 2, label: '2 人' },
  { value: 3, label: '3 人' },
  { value: 4, label: '4 人' },
  { value: 5, label: '5 人以上' },
]

/** mock / IAP 未串接時的預設顯示價格；正式環境以 StoreKit 回傳為準 */
export const TRIP_UNLOCK_PRICE_LABEL = 'NT$60'

export const DEVELOPER_UNLOCK_CODE = 'A126452345'
