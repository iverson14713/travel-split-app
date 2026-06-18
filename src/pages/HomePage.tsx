import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { getRecentTrips, setSession } from '../utils/storage'
import type { RecentTrip } from '../types'

export function HomePage() {
  const navigate = useNavigate()
  const [recentTrips, setRecentTrips] = useState<RecentTrip[]>([])
  const [joinCode, setJoinCode] = useState('')

  useEffect(() => {
    setRecentTrips(getRecentTrips())
  }, [])

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
          <h2 className="home-section-title">我的旅程</h2>
          {recentTrips.length > 0 ? (
            <div className="home-trip-list">
              {recentTrips.map((trip) => (
                <article key={trip.tripCode} className="home-trip-card card">
                  <div className="home-trip-info">
                    <h3 className="home-trip-name">{trip.tripName}</h3>
                    <p className="home-trip-meta">📍 {trip.destination}</p>
                    <p className="home-trip-code">代碼 {trip.tripCode}</p>
                  </div>
                  <Button fullWidth onClick={() => handleEnterTrip(trip)}>
                    進入旅程
                  </Button>
                </article>
              ))}
            </div>
          ) : (
            <p className="home-empty-hint">
              如果朋友已經建立旅程，請從群組公告點連結，或輸入旅程代碼加入。
            </p>
          )}
        </section>

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
      </div>
    </Layout>
  )
}
