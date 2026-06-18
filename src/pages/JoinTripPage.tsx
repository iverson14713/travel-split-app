import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { MemberJoinBlockedCard } from '../components/trip/MemberJoinBlockedCard'
import { fetchTripByCode, joinTrip } from '../services/tripService'
import { checkMemberLimit } from '../services/tripUnlockService'
import { getSession, hasSessionForTrip, setSession, recordRecentTrip } from '../utils/storage'
import type { Member, Trip } from '../types'

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
  const [tripName, setTripName] = useState('')
  const [tripDestination, setTripDestination] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [duplicateMember, setDuplicateMember] = useState<Member | null>(null)
  const [fetchedTrip, setFetchedTrip] = useState<Trip | null>(null)

  useEffect(() => {
    if (urlCode) setCode(urlCode)
  }, [urlCode])

  useEffect(() => {
    if (!urlCode) return
    const session = getSession()
    if (session?.tripCode === urlCode.toUpperCase() && session.memberId) {
      navigate(`/trip/${urlCode}`, { replace: true })
    }
  }, [urlCode, navigate])

  useEffect(() => {
    const trimmedCode = code.trim().toUpperCase()
    if (!trimmedCode) {
      setCheckingTrip(false)
      setTripFound(null)
      return
    }

    let cancelled = false
    setCheckingTrip(true)

    fetchTripByCode(trimmedCode)
      .then((trip) => {
        if (cancelled) return
        if (!trip) {
          setTripFound(false)
          setTripName('')
          setTripDestination('')
          setMembers([])
          setSelectedMemberId('')
          setFetchedTrip(null)
          return
        }

        setTripFound(true)
        setFetchedTrip(trip)
        setTripName(trip.name)
        setTripDestination(trip.destination)
        setMembers(trip.members)
        setSelectedMemberId(trip.members[0]?.id ?? '')
      })
      .catch(() => {
        if (cancelled) return
        setTripFound(false)
        setTripName('')
        setTripDestination('')
        setMembers([])
        setSelectedMemberId('')
        setFetchedTrip(null)
      })
      .finally(() => {
        if (!cancelled) setCheckingTrip(false)
      })

    return () => {
      cancelled = true
    }
  }, [code])

  const saveAndEnterTrip = (memberId: string, memberName: string, joined = false) => {
    const trimmedCode = code.trim().toUpperCase()
    setSession({ tripCode: trimmedCode, memberId })
    recordRecentTrip({
      tripCode: trimmedCode,
      tripName,
      destination: tripDestination,
      memberId,
      memberName,
    })
    navigate(`/trip/${trimmedCode}`, joined ? { state: { joined: true } } : undefined)
  }

  const isMemberFull = fetchedTrip ? checkMemberLimit(fetchedTrip) != null : false

  const handleJoin = async () => {
    setError('')
    setDuplicateMember(null)
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

    const existing = members.find(
      (m) => m.nickname.trim().toLowerCase() === trimmedNickname.toLowerCase(),
    )
    if (existing) {
      setDuplicateMember(existing)
      return
    }

    if (isMemberFull) {
      return
    }

    setSubmitting(true)
    try {
      const trip = fetchedTrip ?? (await fetchTripByCode(trimmedCode))
      if (!trip) {
        setError('此旅行已不存在或已被刪除')
        return
      }

      if (checkMemberLimit(trip)) {
        return
      }

      const member = await joinTrip(trip.id, trimmedNickname)
      saveAndEnterTrip(member.id, member.nickname, true)
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
        <p className="page-tip">
          第一次使用請輸入暱稱加入。之後從同一個 LINE 公告或同一個瀏覽器打開，會直接進入旅程。
        </p>

        {checkingTrip && <p className="loading-text">查詢旅行中...</p>}

        {showNotFound && <p className="form-error-msg">此旅行已不存在或已被刪除</p>}

        <div className="form">
          <Input
            label="旅行代碼"
            placeholder="例：ABC123"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            readOnly={!!urlCode}
          />
        </div>

        {!showNotFound && tripFound && (
          <>
            <section className="card">
              <h3 className="tab-panel-title">第一次加入</h3>
              <div className="form" style={{ marginTop: '0.75rem' }}>
                {isMemberFull && !duplicateMember ? (
                  <MemberJoinBlockedCard />
                ) : (
                  <>
                    <Input
                      label="你的暱稱"
                      placeholder="例：小明"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      autoFocus={!!urlCode}
                    />

                    {duplicateMember && (
                      <div className="settlement-notice" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary-dark)' }}>
                        <span>👀</span>
                        <p>這個名字已經在旅程中，你是 {duplicateMember.nickname} 嗎？</p>
                      </div>
                    )}

                    {duplicateMember ? (
                      <div className="page-actions" style={{ marginTop: '0.25rem' }}>
                        <Button
                          fullWidth
                          onClick={() => saveAndEnterTrip(duplicateMember.id, duplicateMember.nickname)}
                        >
                          我是 {duplicateMember.nickname}，直接進入
                        </Button>
                        <Button fullWidth variant="outline" onClick={() => { setDuplicateMember(null); setNickname('') }}>
                          不是，我要換名字
                        </Button>
                      </div>
                    ) : (
                      <Button
                        fullWidth
                        size="lg"
                        onClick={handleJoin}
                        disabled={submitting || checkingTrip}
                      >
                        {submitting ? '加入中...' : '加入旅程'}
                      </Button>
                    )}

                    {error && <p className="form-error-msg">{error}</p>}
                  </>
                )}
              </div>
            </section>

            <section className="card">
              <h3 className="tab-panel-title">已經加入過？</h3>
              <p className="settings-hint" style={{ marginTop: '0.25rem' }}>
                若 LINE 內建瀏覽器狀態遺失，你可以在這裡選擇身分直接進入。
              </p>
              <div className="form" style={{ marginTop: '0.75rem' }}>
                <Select
                  label="選擇你的身分"
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  options={members.map((m) => ({ value: m.id, label: m.nickname + (m.isHost ? '（主揪）' : '') }))}
                />
                <Button
                  fullWidth
                  onClick={() => {
                    if (!selectedMemberId) return
                    const member = members.find((m) => m.id === selectedMemberId)
                    if (!member) return
                    saveAndEnterTrip(member.id, member.nickname)
                  }}
                  disabled={!selectedMemberId}
                >
                  用這個身分進入
                </Button>
              </div>
            </section>
          </>
        )}
      </div>
    </Layout>
  )
}
