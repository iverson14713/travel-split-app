import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useAppUI } from '../context/AppUIContext'
import { APP_NAME, APP_TAGLINE } from '../constants/app'
import { formatDateRange } from '../utils/dates'
import { getRecentTrips, setSession, updateRecentTripUnlocked } from '../utils/storage'
import {
  getTripLifecyclePhase,
  TRIP_LIFECYCLE_LABELS,
  type TripLifecyclePhase,
} from '../utils/tripLifecycle'
import {
  formatRetentionUntilLabel,
  FREE_RETENTION_UNLOCK_HINT,
  isFreeTripRetentionExpired,
  resolveTripUnlocked,
  shouldShowFreeRetentionHint,
  UNLOCKED_LONG_TERM_HINT,
  UNLOCKED_LONG_TERM_LABEL,
} from '../utils/tripRetention'
import { fetchTripByCode } from '../services/tripService'
import { UpgradeModal } from '../components/trip/UpgradeModal'
import { TripRetentionExpiredModal } from '../components/trip/TripRetentionExpiredModal'
import type { RecentTrip, Trip } from '../types'

function TripCard({
  trip,
  onEnter,
  onUnlockRetention,
  expired = false,
}: {
  trip: RecentTrip
  onEnter: () => void
  onUnlockRetention?: () => void
  expired?: boolean
}) {
  const phase = getTripLifecyclePhase(trip)
  const unlocked = resolveTripUnlocked(trip)
  const dateRange =
    trip.startDate && trip.endDate ? formatDateRange(trip.startDate, trip.endDate) : null
  const showRetentionHint = shouldShowFreeRetentionHint(trip)
  const showUnlockedLongTerm =
    unlocked && (phase === 'ended' || phase === 'archived')

  return (
    <article
      className={`home-trip-card card home-trip-card--${phase}${expired ? ' home-trip-card--expired' : ''}`}
    >
      <div className="home-trip-info">
        <div className="home-trip-name-row">
          <h3 className="home-trip-name">{trip.tripName}</h3>
          {expired ? (
            <span className="home-trip-badge home-trip-badge--expired">已過期</span>
          ) : showUnlockedLongTerm ? (
            <span className="home-trip-badge home-trip-badge--unlocked">{UNLOCKED_LONG_TERM_LABEL}</span>
          ) : (
            <span className={`home-trip-badge home-trip-badge--${phase}`}>
              {TRIP_LIFECYCLE_LABELS[phase]}
            </span>
          )}
        </div>
        <p className="home-trip-meta">📍 {trip.destination}</p>
        {dateRange && <p className="home-trip-meta">📅 {dateRange}</p>}
        <p className="home-trip-meta">
          {trip.memberCount != null ? `👥 ${trip.memberCount} 位成員` : `代碼 ${trip.tripCode}`}
        </p>
        {showRetentionHint && trip.endDate && (
          <p className="home-trip-retention">
            免費旅程，資料保留至 {formatRetentionUntilLabel(trip.endDate)}
          </p>
        )}
        {showRetentionHint && (
          <p className="home-trip-retention-hint">{FREE_RETENTION_UNLOCK_HINT}</p>
        )}
        {showUnlockedLongTerm && (
          <p className="home-trip-retention-hint home-trip-retention-hint--positive">
            {UNLOCKED_LONG_TERM_HINT}
          </p>
        )}
        {expired && (
          <p className="home-trip-retention-hint">免費保存期限已結束，無法再進入此旅程。</p>
        )}
      </div>
      {expired ? (
        <Button fullWidth variant="outline" type="button" disabled>
          已過期
        </Button>
      ) : (
        <>
          {showRetentionHint && onUnlockRetention && (
            <Button fullWidth variant="outline" type="button" onClick={onUnlockRetention}>
              解鎖長期保存
            </Button>
          )}
          <Button fullWidth onClick={onEnter}>
            進入旅程
          </Button>
        </>
      )}
    </article>
  )
}

function TripSection({
  title,
  trips,
  onEnter,
  onUnlockRetention,
  collapsible = false,
  defaultOpen = true,
  expired = false,
}: {
  title: string
  trips: RecentTrip[]
  onEnter: (trip: RecentTrip) => void
  onUnlockRetention?: (trip: RecentTrip) => void
  collapsible?: boolean
  defaultOpen?: boolean
  expired?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  if (trips.length === 0) return null

  return (
    <section className={`home-section${collapsible ? ' home-section--collapsible' : ''}`}>
      {collapsible ? (
        <button
          type="button"
          className="home-section-toggle"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          <h2 className="home-section-title">
            {title}（{trips.length}）
          </h2>
          <span className="home-section-toggle-icon">{open ? '▾' : '▸'}</span>
        </button>
      ) : (
        <h2 className="home-section-title">{title}</h2>
      )}
      {(!collapsible || open) && (
        <div className="home-trip-list">
          {trips.map((trip) => (
            <TripCard
              key={trip.tripCode}
              trip={trip}
              expired={expired}
              onEnter={() => onEnter(trip)}
              onUnlockRetention={
                onUnlockRetention ? () => onUnlockRetention(trip) : undefined
              }
            />
          ))}
        </div>
      )}
    </section>
  )
}

function groupRecentTrips(trips: RecentTrip[]): Record<TripLifecyclePhase, RecentTrip[]> {
  const groups: Record<TripLifecyclePhase, RecentTrip[]> = {
    active: [],
    ended: [],
    archived: [],
  }

  for (const trip of trips) {
    if (isFreeTripRetentionExpired(trip)) continue
    groups[getTripLifecyclePhase(trip)].push(trip)
  }

  return groups
}

export function HomePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { requestOnboarding } = useAppUI()
  const [recentTrips, setRecentTrips] = useState<RecentTrip[]>([])
  const [joinCode, setJoinCode] = useState('')
  const [showExpiredModal, setShowExpiredModal] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradeTrip, setUpgradeTrip] = useState<Trip | null>(null)
  const [upgradeTripCode, setUpgradeTripCode] = useState<string | null>(null)

  const refreshRecentTrips = () => {
    setRecentTrips(getRecentTrips())
  }

  useEffect(() => {
    refreshRecentTrips()
  }, [location.pathname])

  useEffect(() => {
    const handleFocus = () => refreshRecentTrips()
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  const expiredTrips = useMemo(
    () => recentTrips.filter((trip) => isFreeTripRetentionExpired(trip)),
    [recentTrips],
  )

  const { active: activeTrips, ended: endedTrips, archived: archivedTrips } = useMemo(
    () => groupRecentTrips(recentTrips),
    [recentTrips],
  )

  const visibleTripCount = activeTrips.length + endedTrips.length + archivedTrips.length

  const handleEnterTrip = (trip: RecentTrip) => {
    if (isFreeTripRetentionExpired(trip)) {
      setShowExpiredModal(true)
      return
    }
    setSession({ tripCode: trip.tripCode, memberId: trip.memberId })
    navigate(`/trip/${trip.tripCode}`)
  }

  const handleUnlockRetention = async (trip: RecentTrip) => {
    setUpgradeTripCode(trip.tripCode)
    const fetched = await fetchTripByCode(trip.tripCode)
    setUpgradeTrip(fetched)
    setShowUpgradeModal(true)
  }

  const handleUpgradeUnlocked = () => {
    if (upgradeTripCode) {
      updateRecentTripUnlocked(upgradeTripCode, true)
      refreshRecentTrips()
    }
  }

  const handleJoinByCode = () => {
    const code = joinCode.trim().toUpperCase()
    if (!code) return
    navigate(`/join?code=${code}`)
  }

  return (
    <Layout>
      <div className="home">
        <div className="home-hero">
          <div className="home-icon" aria-hidden="true">
            ✈️
          </div>
          <h1 className="home-title">{APP_NAME}</h1>
          <p className="home-subtitle">{APP_TAGLINE}</p>
        </div>

        <section className="home-section">
          <h2 className="home-section-title">進行中的旅行</h2>
          {activeTrips.length > 0 ? (
            <div className="home-trip-list">
              {activeTrips.map((trip) => (
                <TripCard
                  key={trip.tripCode}
                  trip={trip}
                  onEnter={() => handleEnterTrip(trip)}
                  onUnlockRetention={() => handleUnlockRetention(trip)}
                />
              ))}
            </div>
          ) : (
            <p className="home-empty-hint">
              {visibleTripCount > 0 || expiredTrips.length > 0
                ? '目前沒有進行中的旅行。已結束或已封存的旅行可在下方查看。'
                : '如果朋友已經建立旅程，請從群組公告點連結，或輸入旅程代碼加入。同一裝置會記住近期旅程；換裝置需重新點連結或輸入代碼。'}
            </p>
          )}
        </section>

        <TripSection
          title="已結束旅行"
          trips={endedTrips}
          onEnter={handleEnterTrip}
          onUnlockRetention={handleUnlockRetention}
        />

        <TripSection
          title="已封存旅行"
          trips={archivedTrips}
          onEnter={handleEnterTrip}
          collapsible
          defaultOpen={false}
        />

        <TripSection
          title="已過期旅程"
          trips={expiredTrips}
          onEnter={handleEnterTrip}
          collapsible
          defaultOpen={false}
          expired
        />

        <section className="home-section">
          <h2 className="home-section-title">輸入旅程代碼</h2>
          <div className="form">
            <Input
              label="旅程代碼"
              placeholder="例：ABC123"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            />
            <Button fullWidth size="lg" onClick={handleJoinByCode} disabled={!joinCode.trim()}>
              加入旅程
            </Button>
          </div>
        </section>

        <section className="home-section">
          <h2 className="home-section-title">建立新旅程</h2>
          <Link to="/create">
            <Button fullWidth size="lg">
              建立旅行
            </Button>
          </Link>
        </section>

        <p className="home-hint">
          不用下載 App、不用註冊，打開連結就能一起用。旅程列表保存在本裝置，清除瀏覽資料後需重新加入。
        </p>

        <footer className="home-about">
          <a href="/privacy" className="home-about-link">
            隱私權政策
          </a>
          <span className="home-about-sep" aria-hidden="true">
            ·
          </span>
          <a href="/terms" className="home-about-link">
            服務條款
          </a>
          <span className="home-about-sep" aria-hidden="true">
            ·
          </span>
          <button type="button" className="home-about-link home-about-button" onClick={requestOnboarding}>
            重新查看導覽
          </button>
        </footer>
      </div>

      <TripRetentionExpiredModal
        open={showExpiredModal}
        onClose={() => setShowExpiredModal(false)}
      />

      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => {
          setShowUpgradeModal(false)
          setUpgradeTrip(null)
          setUpgradeTripCode(null)
        }}
        reason="manual_unlock"
        trip={upgradeTrip}
        onUnlocked={handleUpgradeUnlocked}
      />
    </Layout>
  )
}
