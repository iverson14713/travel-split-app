import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { useTrip } from '../hooks/useTrip'
import { useTripUnlock } from '../hooks/useTripUnlock'
import { getSession, recordRecentTrip } from '../utils/storage'
import { formatDateRange } from '../utils/dates'
import { getShareLink } from '../utils/tripCode'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Toast } from '../components/ui/Toast'
import { ItineraryTab } from '../components/trip/ItineraryTab'
import { ExpensesTab } from '../components/trip/ExpensesTab'
import { OverviewTab } from '../components/trip/OverviewTab'
import { SettlementTab } from '../components/trip/SettlementTab'
import { SettingsPanel } from '../components/trip/SettingsTab'
import { UpgradeModal } from '../components/trip/UpgradeModal'
import { DeveloperModeModal } from '../components/trip/DeveloperModeModal'
import type { UpgradeReason } from '../services/tripUnlockService'

type Tab = 'itinerary' | 'expenses' | 'overview' | 'settlement'

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'itinerary', label: '行程', icon: '🗓️' },
  { key: 'expenses', label: '記帳', icon: '💰' },
  { key: 'overview', label: '總覽', icon: '📊' },
  { key: 'settlement', label: '結算', icon: '🧾' },
]

export function TripRoomPage() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { trip, loading, error, reload } = useTrip(code)
  const [activeTab, setActiveTab] = useState<Tab>('itinerary')
  const [copied, setCopied] = useState(false)
  const [showJoinedToast, setShowJoinedToast] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [titleTapCount, setTitleTapCount] = useState(0)
  const [showDeveloperModal, setShowDeveloperModal] = useState(false)
  const [upgradeReason, setUpgradeReason] = useState<UpgradeReason | null>(null)

  const { refresh: refreshUnlock } = useTripUnlock(trip)

  const tripCode = code?.toUpperCase() ?? ''
  const session = getSession()
  const sessionMatchesTrip = session?.tripCode === tripCode
  const currentMember = trip?.members.find((m) => m.id === session?.memberId)
  const hasValidSession = sessionMatchesTrip && !!currentMember

  useEffect(() => {
    if (!trip || !currentMember) return
    recordRecentTrip({
      tripCode: trip.code,
      tripName: trip.name,
      destination: trip.destination,
      memberId: currentMember.id,
      memberName: currentMember.nickname,
    })
  }, [trip, currentMember])

  useEffect(() => {
    if (loading) return
    if (!hasValidSession && tripCode) {
      navigate(`/join?code=${tripCode}`, { replace: true })
    }
  }, [loading, hasValidSession, tripCode, navigate])

  useEffect(() => {
    const joined = (location.state as { joined?: boolean } | null)?.joined === true
    if (!joined) return
    setShowJoinedToast(true)
    navigate(location.pathname, { replace: true, state: null })
  }, [location.state, location.pathname, navigate])

  const handleCopyLink = async () => {
    if (!trip) return
    await navigator.clipboard.writeText(getShareLink(trip.code))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleTitleTap = () => {
    setTitleTapCount((count) => {
      const next = count + 1
      if (next >= 7) {
        setShowDeveloperModal(true)
        return 0
      }
      return next
    })
  }

  useEffect(() => {
    if (titleTapCount === 0) return
    const timer = window.setTimeout(() => setTitleTapCount(0), 2000)
    return () => window.clearTimeout(timer)
  }, [titleTapCount])

  const handleShowUpgrade = (reason: UpgradeReason) => {
    setUpgradeReason(reason)
  }

  const handleUnlockChanged = () => {
    refreshUnlock()
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
      <Toast
        open={showJoinedToast}
        message="加入成功，已進入旅程"
        duration={2500}
        onClose={() => setShowJoinedToast(false)}
      />
      <div className="trip-room">
        <header className="trip-header">
          <div className="trip-header-top">
            <div className="trip-title-row">
              <h1 className="trip-name" onClick={handleTitleTap}>
                {trip.name}
              </h1>
              {trip.status === 'archived' && <span className="trip-badge">已封存</span>}
            </div>
            <div className="trip-header-actions">
              <Button size="sm" variant="outline" type="button" onClick={handleCopyLink}>
                {copied ? '已複製' : '分享'}
              </Button>
              <button
                type="button"
                className="trip-header-icon-btn"
                onClick={() => setShowSettings(true)}
                aria-label="設定"
              >
                ⚙️
              </button>
            </div>
          </div>
          <p className="trip-destination">📍 {trip.destination}</p>
          <p className="trip-meta">
            {formatDateRange(trip.startDate, trip.endDate)}・👥 {trip.members.length} 位成員
          </p>
        </header>

        <nav className="tab-nav">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
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
              onUpgradeRequired={handleShowUpgrade}
            />
          )}
          {activeTab === 'overview' && (
            <OverviewTab
              trip={trip}
              currentMemberId={currentMember?.id}
              onGoToSettlement={() => setActiveTab('settlement')}
            />
          )}
          {activeTab === 'settlement' && (
            <SettlementTab
              trip={trip}
              tripId={trip.id}
              currentMemberId={currentMember?.id}
              onReload={reload}
              onUpgradeRequired={handleShowUpgrade}
            />
          )}
        </div>
      </div>

      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="設定">
        <SettingsPanel
          trip={trip}
          tripId={trip.id}
          isHost={currentMember?.isHost ?? false}
          currentMemberId={currentMember?.id}
          onReload={reload}
          onUpgradeRequired={handleShowUpgrade}
        />
      </Modal>

      <UpgradeModal
        open={upgradeReason != null}
        onClose={() => setUpgradeReason(null)}
        reason={upgradeReason ?? 'manual_unlock'}
        trip={trip}
        onUnlocked={handleUnlockChanged}
      />

      <DeveloperModeModal
        open={showDeveloperModal}
        onClose={() => setShowDeveloperModal(false)}
        tripId={trip.id}
        onChanged={handleUnlockChanged}
      />
    </Layout>
  )
}
