import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { fetchTripByCode, joinTrip } from '../services/tripService'
import { hasSessionForTrip, setSession } from '../utils/storage'

export function JoinTripPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const urlCode = searchParams.get('code')?.toUpperCase() ?? ''
  const [code, setCode] = useState(urlCode)
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [checkingTrip, setCheckingTrip] = useState(!!urlCode)
  const [tripFound, setTripFound] = useState<boolean | null>(null)
  const [tripId, setTripId] = useState<string | null>(null)
  const [tripName, setTripName] = useState('')

  useEffect(() => {
    if (urlCode) setCode(urlCode)
  }, [urlCode])

  useEffect(() => {
    if (!urlCode) return
    if (hasSessionForTrip(urlCode)) {
      navigate(`/trip/${urlCode}`, { replace: true })
    }
  }, [urlCode, navigate])

  useEffect(() => {
    const trimmedCode = code.trim().toUpperCase()
    if (!trimmedCode) {
      setCheckingTrip(false)
      setTripFound(null)
      setTripId(null)
      return
    }

    let cancelled = false
    setCheckingTrip(true)

    fetchTripByCode(trimmedCode)
      .then((trip) => {
        if (cancelled) return
        if (trip) {
          setTripFound(true)
          setTripId(trip.id)
          setTripName(trip.name)
        } else {
          setTripFound(false)
          setTripId(null)
          setTripName('')
        }
      })
      .catch(() => {
        if (cancelled) return
        setTripFound(false)
        setTripId(null)
        setTripName('')
      })
      .finally(() => {
        if (!cancelled) setCheckingTrip(false)
      })

    return () => {
      cancelled = true
    }
  }, [code])

  const handleJoin = async () => {
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

    if (hasSessionForTrip(trimmedCode)) {
      navigate(`/trip/${trimmedCode}`)
      return
    }

    setSubmitting(true)
    try {
      let resolvedTripId = tripId
      if (!resolvedTripId) {
        const trip = await fetchTripByCode(trimmedCode)
        if (!trip) {
          setError('找不到此旅行代碼，請確認是否正確')
          return
        }
        resolvedTripId = trip.id
      }

      const member = await joinTrip(resolvedTripId, trimmedNickname)
      setSession({ tripCode: trimmedCode, memberId: member.id })
      navigate(`/trip/${trimmedCode}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加入旅行失敗，請稍後再試')
    } finally {
      setSubmitting(false)
    }
  }

  const showNotFound = !checkingTrip && tripFound === false && code.trim().length > 0

  return (
    <Layout showBack backTo="/">
      <div className="page">
        <h2 className="page-title">加入旅行</h2>
        <p className="page-desc">
          {urlCode && tripName
            ? `加入「${tripName}」`
            : urlCode
              ? '輸入你的暱稱即可加入這趟旅行'
              : '輸入朋友分享的旅行代碼和你的暱稱'}
        </p>

        {checkingTrip && <p className="loading-text">查詢旅行中...</p>}

        {showNotFound && (
          <p className="form-error-msg">找不到此旅行代碼，請確認是否正確</p>
        )}

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
            disabled={showNotFound}
          />

          {error && <p className="form-error-msg">{error}</p>}

          <Button
            type="submit"
            fullWidth
            size="lg"
            disabled={submitting || checkingTrip || showNotFound}
          >
            {submitting ? '加入中...' : '加入旅行'}
          </Button>
        </form>
      </div>
    </Layout>
  )
}
