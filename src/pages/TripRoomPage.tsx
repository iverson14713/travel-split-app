import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { useTrip } from '../hooks/useTrip'
import { getSession } from '../utils/storage'
import { formatDateRange } from '../utils/dates'
import { getShareLink } from '../utils/tripCode'
import { Button } from '../components/ui/Button'
import { ItineraryTab } from '../components/trip/ItineraryTab'
import { ExpensesTab } from '../components/trip/ExpensesTab'
import { SettlementTab } from '../components/trip/SettlementTab'
import { SettingsTab } from '../components/trip/SettingsTab'

type Tab = 'itinerary' | 'expenses' | 'settlement' | 'settings'

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'itinerary', label: '行程', icon: '🗓️' },
  { key: 'expenses', label: '記帳', icon: '💰' },
  { key: 'settlement', label: '結算', icon: '🧾' },
  { key: 'settings', label: '設定', icon: '⚙️' },
]

export function TripRoomPage() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { trip, loading, error, reload } = useTrip(code)
  const [activeTab, setActiveTab] = useState<Tab>('itinerary')
  const [copied, setCopied] = useState(false)

  const tripCode = code?.toUpperCase() ?? ''
  const session = getSession()
  const sessionMatchesTrip = session?.tripCode === tripCode
  const currentMember = trip?.members.find((m) => m.id === session?.memberId)
  const hasValidSession = sessionMatchesTrip && !!currentMember

  useEffect(() => {
    if (loading) return
    if (!hasValidSession && tripCode) {
      navigate(`/join?code=${tripCode}`, { replace: true })
    }
  }, [loading, hasValidSession, tripCode, navigate])

  const handleCopyLink = async () => {
    if (!trip) return
    await navigator.clipboard.writeText(getShareLink(trip.code))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading || !hasValidSession) {
    return (
      <Layout>
        <div className="page page--center">
          <p className="loading-text">載入中...</p>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout showBack backTo="/">
        <div className="page page--center">
          <p className="empty-icon">⚠️</p>
          <h2 className="page-title">載入失敗</h2>
          <p className="page-desc">{error}</p>
        </div>
      </Layout>
    )
  }

  if (!trip) {
    return (
      <Layout showBack backTo="/">
        <div className="page page--center">
          <p className="empty-icon">🧳</p>
          <h2 className="page-title">找不到旅行房間</h2>
          <p className="page-desc">請確認連結或代碼是否正確</p>
        </div>
      </Layout>
    )
  }

  const canEditItinerary =
    trip.editPermission === 'all_members' || currentMember?.isHost === true

  return (
    <Layout>
      <div className="trip-room">
        <header className="trip-header">
          <div className="trip-header-info">
            <h1 className="trip-name">{trip.name}</h1>
            <p className="trip-destination">📍 {trip.destination}</p>
            <p className="trip-dates">{formatDateRange(trip.startDate, trip.endDate)}</p>
            <p className="trip-members">👥 {trip.members.length} 位成員</p>
          </div>
          <Button size="sm" variant="outline" onClick={handleCopyLink}>
            {copied ? '已複製' : '分享連結'}
          </Button>
        </header>

        <nav className="tab-nav">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`tab-nav-item ${activeTab === tab.key ? 'tab-nav-item--active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="tab-nav-icon">{tab.icon}</span>
              <span className="tab-nav-label">{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="tab-content">
          {activeTab === 'itinerary' && (
            <ItineraryTab
              trip={trip}
              tripId={trip.id}
              memberId={currentMember?.id}
              canEdit={canEditItinerary}
              onReload={reload}
            />
          )}
          {activeTab === 'expenses' && (
            <ExpensesTab
              trip={trip}
              tripId={trip.id}
              currentMemberId={currentMember?.id}
              onReload={reload}
            />
          )}
          {activeTab === 'settlement' && <SettlementTab trip={trip} />}
          {activeTab === 'settings' && (
            <SettingsTab
              trip={trip}
              tripId={trip.id}
              isHost={currentMember?.isHost ?? false}
              onReload={reload}
            />
          )}
        </div>
      </div>
    </Layout>
  )
}
