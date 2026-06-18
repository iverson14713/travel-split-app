import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useAppUI } from '../context/AppUIContext'
import { getRecentTrips, setSession } from '../utils/storage'
import type { RecentTrip } from '../types'

function TripCard({ trip, onEnter }: { trip: RecentTrip; onEnter: () => void }) {
  const isArchived = trip.status === 'archived'

  return (
    <article key={trip.tripCode} className={`home-trip-card card${isArchived ? ' home-trip-card--archived' : ''}`}>
      <div className="home-trip-info">
        <div className="home-trip-name-row">
          <h3 className="home-trip-name">{trip.tripName}</h3>
          {isArchived && <span className="home-trip-badge">已封存</span>}
        </div>
        <p className="home-trip-meta">📍 {trip.destination}</p>
        <p className="home-trip-code">代碼 {trip.tripCode}</p>
      </div>
      <Button fullWidth onClick={onEnter}>
        進入旅程
      </Button>
    </article>
  )
}

export function HomePage() {
  const navigate = useNavigate()
  const { requestOnboarding } = useAppUI()
  const [recentTrips, setRecentTrips] = useState<RecentTrip[]>([])
  const [joinCode, setJoinCode] = useState('')
  const [showArchived, setShowArchived] = useState(false)

  useEffect(() => {
    setRecentTrips(getRecentTrips())
  }, [])

  const activeTrips = recentTrips.filter((t) => t.status !== 'archived')
  const archivedTrips = recentTrips.filter((t) => t.status === 'archived')

  const handleEnterTrip = (trip: RecentTrip) => {
    setSession({ tripCode: trip.tripCode, memberId: trip.memberId })
    navigate(`/trip/${trip.tripCode}`)
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
          <h1 className="home-title">旅伴小本本</h1>
          <p className="home-subtitle">朋友旅行，一起看行程、一起記帳、結束一鍵分帳</p>
        </div>

        <section className="home-section">
          <h2 className="home-section-title">進行中的旅行</h2>
          {activeTrips.length > 0 ? (
            <div className="home-trip-list">
              {activeTrips.map((trip) => (
                <TripCard key={trip.tripCode} trip={trip} onEnter={() => handleEnterTrip(trip)} />
              ))}
            </div>
          ) : (
            <p className="home-empty-hint">
              {recentTrips.length > 0
                ? '目前沒有進行中的旅行。已封存的旅行可在下方查看。'
                : '如果朋友已經建立旅程，請從群組公告點連結，或輸入旅程代碼加入。'}
            </p>
          )}
        </section>

        {archivedTrips.length > 0 && (
          <section className="home-section home-section--archived">
            <button
              type="button"
              className="home-section-toggle"
              onClick={() => setShowArchived((open) => !open)}
              aria-expanded={showArchived}
            >
              <h2 className="home-section-title">已封存旅行（{archivedTrips.length}）</h2>
              <span className="home-section-toggle-icon">{showArchived ? '▾' : '▸'}</span>
            </button>
            {showArchived && (
              <div className="home-trip-list">
                {archivedTrips.map((trip) => (
                  <TripCard key={trip.tripCode} trip={trip} onEnter={() => handleEnterTrip(trip)} />
                ))}
              </div>
            )}
          </section>
        )}

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

        <p className="home-hint">不用下載 App、不用註冊，打開連結就能一起用</p>

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
    </Layout>
  )
}
