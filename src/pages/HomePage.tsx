import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useAppUI } from '../context/AppUIContext'
import { APP_NAME, APP_TAGLINE } from '../constants/app'
import { formatDateRange } from '../utils/dates'
import { getRecentTrips, setSession, updateRecentTripUnlocked } from '../utils/storage'
import { getTripMemberId } from '../utils/memberIdentity'
import { TRIP_LIST_PHASE_LABELS, type HomeListPhase } from '../utils/tripLifecycle'
import {
  countVisibleTrips,
  groupAndSortRecentTrips,
} from '../utils/homeTripList'
import {
  formatRetentionUntilLabel,
  isFreeTripRetentionExpired,
  resolveTripUnlocked,
  shouldShowFreeRetentionHint,
} from '../utils/tripRetention'
import { fetchTripByCode } from '../services/tripService'
import { UpgradeModal } from '../components/trip/UpgradeModal'
import { TripRetentionExpiredModal } from '../components/trip/TripRetentionExpiredModal'
import type { RecentTrip, Trip } from '../types'

const ENDED_PREVIEW_LIMIT = 2

function TripCard({
  trip,
  phase,
  onEnter,
  onUnlockRetention,
  expired = false,
}: {
  trip: RecentTrip
  phase: HomeListPhase
  onEnter: () => void
  onUnlockRetention?: (e: MouseEvent) => void
  expired?: boolean
}) {
  const unlocked = resolveTripUnlocked(trip)
  const dateRange =
    trip.startDate && trip.endDate ? formatDateRange(trip.startDate, trip.endDate) : null
  const showRetentionHint = shouldShowFreeRetentionHint(trip)

  return (
    <article
      className={`home-trip-card home-trip-card--compact card home-trip-card--${phase}${expired ? ' home-trip-card--expired' : ''}`}
      onClick={expired ? undefined : onEnter}
      role={expired ? undefined : 'button'}
      tabIndex={expired ? undefined : 0}
      onKeyDown={
        expired
          ? undefined
          : (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onEnter()
              }
            }
      }
    >
      <div className="home-trip-card-body">
        <div className="home-trip-name-row">
          <h3 className="home-trip-name">{trip.tripName}</h3>
          <div className="home-trip-badges">
            {expired ? (
              <span className="home-trip-badge home-trip-badge--expired">已過期</span>
            ) : (
              <span className={`home-trip-badge home-trip-badge--${phase}`}>
                {TRIP_LIST_PHASE_LABELS[phase]}
              </span>
            )}
            {unlocked && !expired && (
              <span className="home-trip-badge home-trip-badge--unlocked-sm">已解鎖</span>
            )}
          </div>
        </div>
        <p className="home-trip-meta home-trip-meta--compact">
          <span>📍 {trip.destination}</span>
          {dateRange && <span>📅 {dateRange}</span>}
          <span>
            {trip.memberCount != null ? `👥 ${trip.memberCount} 位` : `代碼 ${trip.tripCode}`}
          </span>
        </p>
        {showRetentionHint && trip.endDate && (
          <p className="home-trip-retention home-trip-retention--compact">
            免費資料保留至 {formatRetentionUntilLabel(trip.endDate)}
          </p>
        )}
        {expired && (
          <p className="home-trip-retention-hint">免費保存期限已結束，無法再進入。</p>
        )}
        {showRetentionHint && onUnlockRetention && (
          <button
            type="button"
            className="home-trip-unlock-link"
            onClick={(e) => {
              e.stopPropagation()
              onUnlockRetention(e)
            }}
          >
            解鎖長期保存
          </button>
        )}
      </div>
      {!expired && <span className="home-trip-card-chevron" aria-hidden="true">›</span>}
    </article>
  )
}

function TripSection({
  title,
  trips,
  phase,
  onEnter,
  onUnlockRetention,
  collapsible = false,
  defaultOpen = true,
  limit,
  expired = false,
}: {
  title: string
  trips: RecentTrip[]
  phase: HomeListPhase
  onEnter: (trip: RecentTrip) => void
  onUnlockRetention?: (trip: RecentTrip) => void
  collapsible?: boolean
  defaultOpen?: boolean
  limit?: number
  expired?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [showAll, setShowAll] = useState(false)

  if (trips.length === 0) return null

  const hasLimit = limit != null && trips.length > limit
  const visibleTrips = hasLimit && !showAll ? trips.slice(0, limit) : trips

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
        <h2 className="home-section-title">
          {title}（{trips.length}）
        </h2>
      )}
      {(!collapsible || open) && (
        <>
          <div className="home-trip-list home-trip-list--compact">
            {visibleTrips.map((trip) => (
              <TripCard
                key={trip.tripCode}
                trip={trip}
                phase={phase}
                expired={expired}
                onEnter={() => onEnter(trip)}
                onUnlockRetention={
                  onUnlockRetention ? () => onUnlockRetention(trip) : undefined
                }
              />
            ))}
          </div>
          {hasLimit && !showAll && (
            <button type="button" className="home-section-more" onClick={() => setShowAll(true)}>
              查看全部（{trips.length}）
            </button>
          )}
        </>
      )}
    </section>
  )
}

export function HomePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { requestOnboarding } = useAppUI()
  const [recentTrips, setRecentTrips] = useState<RecentTrip[]>([])
  const [joinCode, setJoinCode] = useState('')
  const [showJoinForm, setShowJoinForm] = useState(false)
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

  const grouped = useMemo(() => groupAndSortRecentTrips(recentTrips), [recentTrips])
  const hasAnyTrips = countVisibleTrips(grouped) > 0 || grouped.expired.length > 0

  const handleEnterTrip = (trip: RecentTrip) => {
    if (isFreeTripRetentionExpired(trip)) {
      setShowExpiredModal(true)
      return
    }

    const memberId = trip.tripId
      ? getTripMemberId(trip.tripId) ?? trip.memberId
      : trip.memberId

    if (!memberId) {
      navigate(`/join?code=${trip.tripCode}`)
      return
    }

    setSession({ tripCode: trip.tripCode, memberId })
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

        {!hasAnyTrips ? (
          <section className="home-section home-section--empty">
            <p className="home-empty-hint">
              如果朋友已經建立旅程，請從群組公告點連結，或輸入旅程代碼加入。
              同一裝置會記住近期旅程；換裝置需重新點連結或輸入代碼。
            </p>
            <div className="home-empty-actions">
              <Button fullWidth size="lg" onClick={() => setShowJoinForm(true)}>
                加入旅程
              </Button>
              <Link to="/create">
                <Button fullWidth size="lg" variant="outline">
                  建立新旅程
                </Button>
              </Link>
            </div>
            {showJoinForm && (
              <div className="form home-join-form">
                <Input
                  label="旅程代碼"
                  placeholder="例：ABC123"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                />
                <Button fullWidth onClick={handleJoinByCode} disabled={!joinCode.trim()}>
                  確認加入
                </Button>
              </div>
            )}
          </section>
        ) : (
          <>
            <TripSection
              title="進行中的旅行"
              trips={grouped.active}
              phase="active"
              onEnter={handleEnterTrip}
            />

            <TripSection
              title="即將開始"
              trips={grouped.upcoming}
              phase="upcoming"
              onEnter={handleEnterTrip}
            />

            <TripSection
              title="待整理"
              trips={grouped.settling}
              phase="settling"
              onEnter={handleEnterTrip}
            />

            <TripSection
              title="已結束"
              trips={grouped.ended}
              phase="ended"
              onEnter={handleEnterTrip}
              onUnlockRetention={handleUnlockRetention}
              limit={ENDED_PREVIEW_LIMIT}
            />

            <TripSection
              title="已封存旅行"
              trips={grouped.archived}
              phase="archived"
              onEnter={handleEnterTrip}
              collapsible
              defaultOpen={false}
            />

            <TripSection
              title="已過期旅程"
              trips={grouped.expired}
              phase="ended"
              onEnter={handleEnterTrip}
              collapsible
              defaultOpen={false}
              expired
            />
          </>
        )}

        {hasAnyTrips && (
          <section className="home-section home-section--actions">
            <div className="home-action-row">
              <Button
                fullWidth
                variant="outline"
                type="button"
                onClick={() => setShowJoinForm((open) => !open)}
              >
                {showJoinForm ? '收合加入旅程' : '加入旅程'}
              </Button>
              <Link to="/create" className="home-action-link">
                <Button fullWidth variant="outline" type="button">
                  建立新旅程
                </Button>
              </Link>
            </div>
            {showJoinForm && (
              <div className="form home-join-form">
                <Input
                  label="旅程代碼"
                  placeholder="例：ABC123"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                />
                <Button fullWidth onClick={handleJoinByCode} disabled={!joinCode.trim()}>
                  確認加入
                </Button>
              </div>
            )}
          </section>
        )}

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
