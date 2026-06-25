import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { MemberJoinBlockedCard } from '../components/trip/MemberJoinBlockedCard'
import { fetchTripByCode, joinTrip, reactivateMember } from '../services/tripService'
import { checkMemberLimit, isTripUnlocked } from '../services/tripUnlockService'
import {
  clearTripLeftLocally,
  getTripMemberId,
  setTripMemberIdentity,
} from '../utils/memberIdentity'
import { getActiveMembers, getJoinClaimableMembers, isActiveMember } from '../utils/members'
import { DUPLICATE_NICKNAME_ERROR, isDuplicateNickname } from '../utils/memberNames'
import { recordRecentTrip, setSession } from '../utils/storage'
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
  const [members, setMembers] = useState<Member[]>([])
  const [joinableMembers, setJoinableMembers] = useState<Member[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [duplicateMember, setDuplicateMember] = useState<Member | null>(null)
  const [fetchedTrip, setFetchedTrip] = useState<Trip | null>(null)

  const saveAndEnterTrip = useCallback(async (
    trip: Trip,
    memberId: string,
    memberName: string,
    joined = false,
  ) => {
    const member = trip.members.find((item) => item.id === memberId)
    if (member?.leftAt) {
      await reactivateMember(memberId, trip.id)
    }

    const trimmedCode = trip.code.toUpperCase()
    clearTripLeftLocally(trip.id)
    setTripMemberIdentity(trip.id, memberId, memberName)
    setSession({ tripCode: trimmedCode, memberId })
    recordRecentTrip({
      tripCode: trimmedCode,
      tripName: trip.name,
      destination: trip.destination,
      memberId,
      memberName,
      status: trip.status,
      tripId: trip.id,
      startDate: trip.startDate,
      endDate: trip.endDate,
      memberCount: getActiveMembers(trip.members).length,
      unlocked: isTripUnlocked(trip.id),
    })
    navigate(`/trip/${trimmedCode}`, joined ? { state: { joined: true } } : undefined)
  }, [navigate])

  useEffect(() => {
    if (urlCode) setCode(urlCode)
  }, [urlCode])

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
          setMembers([])
          setJoinableMembers([])
          setSelectedMemberId('')
          setFetchedTrip(null)
          return
        }

        const localMemberId = getTripMemberId(trip.id)
        const localMember = localMemberId
          ? trip.members.find((member) => member.id === localMemberId && isActiveMember(member))
          : undefined

        if (localMember && !localMember.leftAt) {
          void saveAndEnterTrip(trip, localMember.id, localMember.nickname)
          return
        }

        setTripFound(true)
        setFetchedTrip(trip)
        setTripName(trip.name)
        const activeMembers = getActiveMembers(trip.members)
        setMembers(activeMembers)
        setJoinableMembers(getJoinClaimableMembers(trip.members))
        setSelectedMemberId('')
      })
      .catch(() => {
        if (cancelled) return
        setTripFound(false)
        setTripName('')
        setMembers([])
        setJoinableMembers([])
        setSelectedMemberId('')
        setFetchedTrip(null)
      })
      .finally(() => {
        if (!cancelled) setCheckingTrip(false)
      })

    return () => {
      cancelled = true
    }
  }, [code, saveAndEnterTrip])

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

    if (fetchedTrip) {
      const localMemberId = getTripMemberId(fetchedTrip.id)
      if (localMemberId) {
        const localMember = fetchedTrip.members.find(
          (member) => member.id === localMemberId && isActiveMember(member),
        )
        if (localMember && !localMember.leftAt) {
          void saveAndEnterTrip(fetchedTrip, localMember.id, localMember.nickname)
          return
        }
      }
    }

    if (isDuplicateNickname(members, trimmedNickname)) {
      const matched = members.find(
        (member) => member.nickname.trim().toLowerCase() === trimmedNickname.toLowerCase(),
      )
      if (matched) {
        if (matched.isHost) {
          setError(DUPLICATE_NICKNAME_ERROR)
          return
        }
        setDuplicateMember(matched)
        return
      }
      setError(DUPLICATE_NICKNAME_ERROR)
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
      await saveAndEnterTrip(trip, member.id, member.nickname, true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加入旅行失敗，請稍後再試')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReclaimIdentity = async () => {
    if (!duplicateMember || !fetchedTrip || duplicateMember.isHost) return
    await saveAndEnterTrip(fetchedTrip, duplicateMember.id, duplicateMember.nickname)
  }

  const handleEnterWithSelectedIdentity = async () => {
    if (!selectedMemberId || !fetchedTrip) return
    const member = joinableMembers.find((item) => item.id === selectedMemberId)
    if (!member || member.isHost) return
    await saveAndEnterTrip(fetchedTrip, member.id, member.nickname)
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
          每台裝置會記住你在這趟旅程的身分。第一次加入請輸入暱稱；之後從同一台裝置打開會自動進入。
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
                        <Button fullWidth onClick={handleReclaimIdentity}>
                          我是 {duplicateMember.nickname}，直接進入
                        </Button>
                        <Button
                          fullWidth
                          variant="outline"
                          onClick={() => {
                            setDuplicateMember(null)
                            setNickname('')
                          }}
                        >
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

            {joinableMembers.length > 0 && (
            <section className="card">
              <h3 className="tab-panel-title">已經加入過？</h3>
              <p className="settings-hint" style={{ marginTop: '0.25rem' }}>
                若這台裝置遺失了身分紀錄，可以從既有成員中選擇你的身分進入。主揪身分無法在此選擇。
              </p>
              <div className="form" style={{ marginTop: '0.75rem' }}>
                <Select
                  label="選擇你的身分"
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  options={[
                    { value: '', label: '請選擇你的身分' },
                    ...joinableMembers.map((member) => ({
                      value: member.id,
                      label: member.nickname,
                    })),
                  ]}
                />
                <Button
                  fullWidth
                  onClick={handleEnterWithSelectedIdentity}
                  disabled={!selectedMemberId}
                >
                  用這個身分進入
                </Button>
              </div>
            </section>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
