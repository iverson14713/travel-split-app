export type EditPermission = 'owner_only' | 'all_members'

export type ExpenseType = 'expense' | 'transfer'

export type TripStatus = 'active' | 'archived'

export type ExchangeRateSource = 'api' | 'fallback'

export interface Member {
  id: string
  nickname: string
  isHost: boolean
  joinedAt: string
}

export interface ItineraryItem {
  id: string
  day: number
  time: string
  title: string
  location: string
  note: string
}

export interface Expense {
  id: string
  type: ExpenseType
  amount: number
  currency: string
  exchangeRateToTwd: number
  payerId: string
  receiverId?: string
  participantIds: string[]
  category: string
  note: string
  createdAt: string
}

export interface Trip {
  id: string
  code: string
  name: string
  destination: string
  startDate: string
  endDate: string
  status: TripStatus
  lastActivityAt: string
  archivedAt?: string
  editPermission: EditPermission
  baseCurrency: string
  jpyToTwdRate: number
  usdToTwdRate: number
  exchangeRateSource: ExchangeRateSource
  exchangeRateFetchedAt?: string
  members: Member[]
  itinerary: ItineraryItem[]
  expenses: Expense[]
  createdAt: string
}

export interface UserSession {
  tripCode: string
  memberId: string
}

export interface RecentTrip {
  tripCode: string
  tripName: string
  destination: string
  memberId: string
  memberName: string
  lastOpenedAt: string
}

export interface SettlementItem {
  fromId?: string
  from: string
  toId?: string
  to: string
  amount: number
  currency: string
}
