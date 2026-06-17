export type EditPermission = 'owner_only' | 'all_members'

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
  amount: number
  currency: string
  payerId: string
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
  editPermission: EditPermission
  members: Member[]
  itinerary: ItineraryItem[]
  expenses: Expense[]
  createdAt: string
}

export interface UserSession {
  tripCode: string
  memberId: string
}

export interface SettlementItem {
  from: string
  to: string
  amount: number
  currency: string
}
