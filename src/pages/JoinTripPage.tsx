import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { getTrip, getSessionForTrip, saveTrip, setSession } from '../utils/storage'
import { createId } from '../utils/id'

export function JoinTripPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const urlCode = searchParams.get('code')?.toUpperCase() ?? ''
  const [code, setCode] = useState(urlCode)
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (urlCode) setCode(urlCode)
  }, [urlCode])

  useEffect(() => {
    if (!urlCode) return
    const existing = getSessionForTrip(urlCode)
    if (existing) {
      navigate(`/trip/${existing.trip.code}`, { replace: true })
    }
  }, [urlCode, navigate])

  const handleJoin = () => {
    setError('')
    const trimmedCode = code.trim().toUpperCase()
    const trimmedNickname = nickname.trim()

    if (!trimmedCode) {
      setError('請輸入旅行代碼')
      return
    }
    if (!trimmedNickname) {
      setError('請輸入暱稱')
      return
    }

    const trip = getTrip(trimmedCode)
    if (!trip) {
      setError('找不到此旅行代碼，請確認是否正確')
      return
    }

    const existingSession = getSessionForTrip(trimmedCode)
    if (existingSession) {
      navigate(`/trip/${trip.code}`)
      return
    }

    const memberId = createId()
    trip.members.push({
      id: memberId,
      nickname: trimmedNickname,
      isHost: false,
      joinedAt: new Date().toISOString(),
    })
    saveTrip(trip)
    setSession({ tripCode: trip.code, memberId })
    navigate(`/trip/${trip.code}`)
  }

  return (
    <Layout showBack backTo="/">
      <div className="page">
        <h2 className="page-title">加入旅行</h2>
        <p className="page-desc">
          {urlCode ? '輸入你的暱稱即可加入這趟旅行' : '輸入朋友分享的旅行代碼和你的暱稱'}
        </p>

        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault()
            handleJoin()
          }}
        >
          <Input
            label="旅行代碼"
            placeholder="例：ABC123"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            readOnly={!!urlCode}
          />
          <Input
            label="你的暱稱"
            placeholder="例：小明"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            autoFocus={!!urlCode}
          />

          {error && <p className="form-error-msg">{error}</p>}

          <Button type="submit" fullWidth size="lg">
            加入旅行
          </Button>
        </form>
      </div>
    </Layout>
  )
}
