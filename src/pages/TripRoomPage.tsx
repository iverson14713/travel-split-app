import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { useTrip } from '../hooks/useTrip'
import { useTripUnlock } from '../hooks/useTripUnlock'
import { useSyncTripUnlockFromServer } from '../hooks/useSyncTripUnlockFromServer'
import { recordRecentTrip, setSession, updateRecentTripUnlocked } from '../utils/storage'
import { getTripMemberId } from '../utils/memberIdentity'
import { formatDateRange } from '../utils/dates'
import { getActiveMemberCount, isActiveMember } from '../utils/members'
import { getShareLink } from '../utils/tripCode'
import {
  getTripDisplayStatus,
  TRIP_ENDED_VIEW_HINT,
  TRIP_SETTLING_VIEW_HINT,
} from '../utils/tripLifecycle'
import { isFreeTripRetentionExpired } from '../utils/tripRetention'
import { isTripUnlocked } from '../services/tripUnlockService'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { SyncIndicator } from '../components/ui/SyncIndicator'
import { Toast } from '../components/ui/Toast'
import { ItineraryTab } from '../components/trip/ItineraryTab'
import { ExpensesTab } from '../components/trip/ExpensesTab'
import { OverviewTab } from '../components/trip/OverviewTab'
import { SettlementTab } from '../components/trip/SettlementTab'
import { SettingsPanel } from '../components/trip/SettingsTab'
import { ArchivedTripBanner } from '../components/trip/ArchivedTripBanner'
import { UpgradeModal } from '../components/trip/UpgradeModal'
import { TripMembersModal } from '../components/trip/TripMembersModal'
import { DeveloperModeModal } from '../components/trip/DeveloperModeModal'
import { DeveloperVerifyModal } from '../components/trip/DeveloperVerifyModal'
import { TripEndedModal } from '../components/trip/TripEndedModal'
import { TripRetentionExpiredModal } from '../components/trip/TripRetentionExpiredModal'
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
  const { trip, initialLoading, refreshing, error, reload } = useTrip(code)
  const [activeTab, setActiveTab] = useState<Tab>('itinerary')
  const [copied, setCopied] = useState(false)
  const [showJoinedToast, setShowJoinedToast] = useState(false)
  const [statusToast, setStatusToast] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [titleTapCount, setTitleTapCount] = useState(0)
  const [developerAccessGranted, setDeveloperAccessGranted] = useState(false)
  const [showDeveloperVerify, setShowDeveloperVerify] = useState(false)
  const [showDeveloperModal, setShowDeveloperModal] = useState(false)
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [upgradeReason, setUpgradeReason] = useState<UpgradeReason | null>(null)
  const [showTripEndedModal, setShowTripEndedModal] = useState(false)

  const { refresh: refreshUnlock } = useTripUnlock(trip)
  useSyncTripUnlockFromServer(trip?.id, refreshUnlock)

  const tripCode = code?.toUpperCase() ?? ''
  const memberId = trip ? getTripMemberId(trip.id) : null
  const currentMember = trip?.members.find(
    (member) => member.id === memberId && isActiveMember(member),
  )
  const hasValidSession = !!currentMember

  useEffect(() => {
    if (!trip || !currentMember) return
    setSession({ tripCode: trip.code, memberId: currentMember.id })
    recordRecentTrip({
      tripCode: trip.code,
      tripId: trip.id,
      tripName: trip.name,
      destination: trip.destination,
      memberId: currentMember.id,
      memberName: currentMember.nickname,
      status: trip.status,
      startDate: trip.startDate,
      endDate: trip.endDate,
      memberCount: getActiveMemberCount(trip.members),
      unlocked: isTripUnlocked(trip.id),
      archivedAt: trip.archivedAt,
    })
  }, [trip, currentMember])

  useEffect(() => {
    if (initialLoading) return
    if (!hasValidSession && tripCode) {
      navigate(`/join?code=${tripCode}`, { replace: true })
    }
  }, [initialLoading, hasValidSession, tripCode, navigate])

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
        if (developerAccessGranted) {
          setShowDeveloperModal(true)
        } else {
          setShowDeveloperVerify(true)
        }
        return 0
      }
      return next
    })
  }

  const handleDeveloperVerified = () => {
    setDeveloperAccessGranted(true)
    setShowDeveloperVerify(false)
    setShowDeveloperModal(true)
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
    if (trip) {
      updateRecentTripUnlocked(trip.code, isTripUnlocked(trip.id))
    }
  }

  if (initialLoading && !trip) {
    return (
      <Layout>
        <div className="page page--center">
          <p className="loading-text">載入中...</p>
        </div>
      </Layout>
    )
  }

  if (!initialLoading && !hasValidSession) {
    return (
      <Layout>
        <div className="page page--center">
          <p className="loading-text">載入中...</p>
        </div>
      </Layout>
    )
  }

  if (error && !trip) {
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

  const retentionExpired = isFreeTripRetentionExpired({
    tripId: trip.id,
    endDate: trip.endDate,
    unlocked: isTripUnlocked(trip.id),
  })

  if (hasValidSession && retentionExpired) {
    return (
      <Layout showBack backTo="/">
        <TripRetentionExpiredModal
          open
          onClose={() => navigate('/')}
        />
      </Layout>
    )
  }

  const hasContentEditPermission =
    trip.status !== 'archived' &&
    (trip.editPermission === 'all_members' || currentMember?.isHost === true)

  const tripStatus = getTripDisplayStatus(trip)
  const isArchived = trip.status === 'archived'
  const isActive = tripStatus === 'active'
  const isSettling = tripStatus === 'settling'
  const isEnded = tripStatus === 'ended'
  const isUpcoming = tripStatus === 'upcoming'
  const activeMemberCount = getActiveMemberCount(trip.members)
  const isHost = currentMember?.isHost === true

  return (
    <Layout>
      <Toast
        open={showJoinedToast}
        message="加入成功，已進入旅程"
        duration={2500}
        onClose={() => setShowJoinedToast(false)}
      />
      <Toast
        open={statusToast != null}
        message={statusToast ?? ''}
        duration={2500}
        onClose={() => setStatusToast(null)}
      />
      <div className="trip-room">
        <header className="trip-header">
          <div className="trip-header-top">
            <div className="trip-title-row">
              <h1 className="trip-name" onClick={handleTitleTap}>
                {trip.name}
              </h1>
              {trip.status === 'archived' && <span className="trip-badge">已封存</span>}
              {isActive && <span className="trip-badge trip-badge--active">進行中</span>}
              {isSettling && <span className="trip-badge trip-badge--settling">待整理</span>}
              {isEnded && <span className="trip-badge trip-badge--ended">已結束</span>}
              {isUpcoming && <span className="trip-badge trip-badge--upcoming">即將開始</span>}
            </div>
            <div className="trip-header-actions">
              <SyncIndicator visible={refreshing} />
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
            <span>{formatDateRange(trip.startDate, trip.endDate)}</span>
            <span className="trip-meta-sep" aria-hidden="true">
              ・
            </span>
            <button
              type="button"
              className="trip-meta-members"
              onClick={() => setShowMembersModal(true)}
              aria-label={`查看 ${activeMemberCount} 位旅程成員`}
            >
              👥 {activeMemberCount} 位成員 ›
            </button>
          </p>
          {isArchived && (
            <div className="trip-header-archived">
              <ArchivedTripBanner compact />
            </div>
          )}
          {isSettling && (
            <div className="archived-hint archived-hint--compact">
              <span>📌</span>
              <p>{TRIP_SETTLING_VIEW_HINT}</p>
            </div>
          )}
          {isEnded && (
            <div className="archived-hint archived-hint--compact">
              <span>📌</span>
              <p>{TRIP_ENDED_VIEW_HINT}</p>
            </div>
          )}
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
              canEdit={hasContentEditPermission}
              onReload={reload}
              onEditBlocked={() => setShowTripEndedModal(true)}
            />
          )}
          {activeTab === 'expenses' && (
            <ExpensesTab
              trip={trip}
              tripId={trip.id}
              currentMemberId={currentMember?.id}
              onReload={reload}
              onUpgradeRequired={handleShowUpgrade}
              onEditBlocked={() => setShowTripEndedModal(true)}
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
              onStatusMessage={setStatusToast}
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
          onStatusMessage={setStatusToast}
          onTripDeleted={() => navigate('/')}
          onGoHome={() => {
            setShowSettings(false)
            navigate('/')
          }}
        />
      </Modal>

      <TripMembersModal
        open={showMembersModal}
        onClose={() => setShowMembersModal(false)}
        trip={trip}
        tripId={trip.id}
        isHost={isHost}
        onReload={reload}
        onStatusMessage={setStatusToast}
      />

      <UpgradeModal
        open={upgradeReason != null}
        onClose={() => setUpgradeReason(null)}
        reason={upgradeReason ?? 'manual_unlock'}
        trip={trip}
        onUnlocked={handleUnlockChanged}
      />

      <DeveloperVerifyModal
        open={showDeveloperVerify}
        onClose={() => setShowDeveloperVerify(false)}
        onVerified={handleDeveloperVerified}
      />

      <DeveloperModeModal
        open={showDeveloperModal}
        onClose={() => setShowDeveloperModal(false)}
        tripId={trip.id}
        tripStartDate={trip.startDate}
        onChanged={handleUnlockChanged}
      />

      <TripEndedModal open={showTripEndedModal} onClose={() => setShowTripEndedModal(false)} />
    </Layout>
  )
}
