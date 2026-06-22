import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { UpgradeModal } from '../components/trip/UpgradeModal'
import { TripTooLongModal } from '../components/trip/TripTooLongModal'
import { TripUnlockWindowExceededModal } from '../components/trip/TripUnlockWindowExceededModal'
import { createTrip } from '../services/tripService'
import {
  checkCreateMemberPlan,
  mockUnlockTrip,
  validateTripDates,
} from '../services/tripUnlockService'
import type { UpgradeReason } from '../services/tripUnlockService'
import {
  ESTIMATED_MEMBER_OPTIONS,
  type EstimatedMemberCount,
} from '../constants/freeLimits'
import {
  fetchLatestExchangeRatesToTwd,
  formatRateSummaryLine,
  FALLBACK_RATE_NOTICE,
  type ExchangeRatesResult,
} from '../services/exchangeRateService'
import { getShareLink } from '../utils/tripCode'
import { getLineShareText } from '../utils/shareText'
import { setSession, recordRecentTrip } from '../utils/storage'

export function CreateTripPage() {
  const navigate = useNavigate()
  const [ownerName, setOwnerName] = useState('主揪')
  const [name, setName] = useState('')
  const [destination, setDestination] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [estimatedMembers, setEstimatedMembers] = useState<EstimatedMemberCount>(2)
  const [createdCode, setCreatedCode] = useState<string | null>(null)
  const [createdRates, setCreatedRates] = useState<ExchangeRatesResult | null>(null)
  const [copied, setCopied] = useState(false)
  const [lineCopied, setLineCopied] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [upgradeReason, setUpgradeReason] = useState<UpgradeReason | null>(null)
  const [showTooLongModal, setShowTooLongModal] = useState(false)
  const [unlockWindowMaxEndDate, setUnlockWindowMaxEndDate] = useState<string | null>(null)

  const executeCreate = async (unlockAfterCreate = false) => {
    setSubmitting(true)
    try {
      const rates = await fetchLatestExchangeRatesToTwd()
      const { trip, memberId } = await createTrip({
        ownerName: ownerName.trim() || '主揪',
        name: name.trim(),
        destination: destination.trim(),
        startDate,
        endDate,
        estimatedMemberCount: estimatedMembers,
        exchangeRatesToTwd: rates.ratesToTwd,
        jpyToTwdRate: rates.ratesToTwd.JPY,
        usdToTwdRate: rates.ratesToTwd.USD,
        exchangeRateSource: rates.source,
        exchangeRateFetchedAt: rates.fetchedAt,
      })

      if (unlockAfterCreate) {
        mockUnlockTrip(trip.id, startDate)
      }

      setSession({ tripCode: trip.code, memberId })
      recordRecentTrip({
        tripCode: trip.code,
        tripName: trip.name,
        destination: trip.destination,
        memberId,
        memberName: ownerName.trim() || '主揪',
      })
      setCreatedRates(rates)
      setCreatedCode(trip.code)
    } catch (err) {
      setError(err instanceof Error ? err.message : '建立旅行失敗，請稍後再試')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreate = async () => {
    setError('')
    if (!name.trim()) {
      setError('請輸入旅行名稱')
      return
    }
    if (!destination.trim()) {
      setError('請輸入目的地')
      return
    }
    if (!startDate || !endDate) {
      setError('請選擇開始與結束日期')
      return
    }
    if (new Date(endDate) < new Date(startDate)) {
      setError('結束日期不能早於開始日期')
      return
    }

    const dateValidation = validateTripDates(startDate, endDate)
    if (!dateValidation.ok) {
      if (dateValidation.reason === 'too_long') {
        setShowTooLongModal(true)
      } else if (dateValidation.reason === 'exceeds_unlock_window') {
        setUnlockWindowMaxEndDate(dateValidation.maxEndDate)
      } else {
        setUpgradeReason(dateValidation.upgradeReason)
      }
      return
    }

    const memberBlocked = checkCreateMemberPlan(estimatedMembers)
    if (memberBlocked) {
      setUpgradeReason(memberBlocked)
      return
    }

    await executeCreate(false)
  }

  const handleUnlockAndCreate = async () => {
    await executeCreate(true)
  }

  const shareLink = createdCode ? getShareLink(createdCode) : ''

  const handleCopy = async () => {
    if (!shareLink) return
    await navigator.clipboard.writeText(shareLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyLineText = async () => {
    if (!createdCode) return
    await navigator.clipboard.writeText(getLineShareText(createdCode))
    setLineCopied(true)
    setTimeout(() => setLineCopied(false), 2000)
  }

  if (createdCode) {
    return (
      <Layout showBack backTo="/">
        <div className="page">
          <h2 className="page-title">旅行建立成功！</h2>
          <p className="page-desc">分享以下資訊給旅伴，他們就能加入囉</p>

          <Card className="success-card">
            <div className="success-item">
              <span className="success-label">旅行代碼</span>
              <span className="success-code">{createdCode}</span>
            </div>
            <div className="success-item">
              <span className="success-label">分享連結</span>
              <span className="success-link">{shareLink}</span>
            </div>
          </Card>

          {createdRates && (
            <p className="page-tip">
              目前估算匯率：
              <br />
              {formatRateSummaryLine('JPY', createdRates.ratesToTwd.JPY)}
              <br />
              {formatRateSummaryLine('USD', createdRates.ratesToTwd.USD)}
              {createdRates.source === 'fallback' && (
                <>
                  <br />
                  {FALLBACK_RATE_NOTICE}
                </>
              )}
            </p>
          )}

          <div className="page-actions">
            <Button fullWidth onClick={handleCopy}>
              {copied ? '已複製！' : '複製分享連結'}
            </Button>
            <Button fullWidth variant="outline" onClick={handleCopyLineText}>
              {lineCopied ? '已複製！' : '複製 LINE 分享文字'}
            </Button>
            <Button fullWidth variant="secondary" onClick={() => navigate(`/trip/${createdCode}`)}>
              進入旅行房間
            </Button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout showBack backTo="/">
      <div className="page">
        <h2 className="page-title">建立旅行</h2>
        <p className="page-desc">填寫基本資訊，建立專屬的旅行房間</p>

        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault()
            handleCreate()
          }}
        >
          <Input
            label="你的暱稱"
            placeholder="例：主揪"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
          />
          <Input
            label="旅行名稱"
            placeholder="例：京都賞楓之旅"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label="目的地"
            placeholder="例：日本京都"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          />
          <Input
            label="開始日期"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="結束日期"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />

          <div className="form-field">
            <span className="form-label">預計同行人數</span>
            <div className="segmented-control" role="group" aria-label="預計同行人數">
              {ESTIMATED_MEMBER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`segmented-control__option${
                    estimatedMembers === opt.value ? ' segmented-control__option--active' : ''
                  }`}
                  onClick={() => setEstimatedMembers(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="segmented-control-hint">含你自己在內的預計人數。5 人以上需解鎖後建立。</p>
          </div>

          <div className="page-tip">
            <strong>匯率估算</strong>
            <br />
            建立旅行時會自動帶入目前匯率，用來估算總花費與結算金額。
            <br />
            之後可在設定中調整。
          </div>

          {error && <p className="form-error-msg">{error}</p>}

          <Button type="submit" fullWidth size="lg" disabled={submitting}>
            {submitting ? '建立中...' : '建立旅行'}
          </Button>
        </form>

        <UpgradeModal
          open={upgradeReason != null}
          onClose={() => setUpgradeReason(null)}
          reason={upgradeReason ?? 'day_limit'}
          onUnlockAndProceed={
            upgradeReason === 'create_member_limit' || upgradeReason === 'day_limit'
              ? handleUnlockAndCreate
              : undefined
          }
        />

        <TripTooLongModal open={showTooLongModal} onClose={() => setShowTooLongModal(false)} />

        <TripUnlockWindowExceededModal
          open={unlockWindowMaxEndDate != null}
          maxEndDate={unlockWindowMaxEndDate ?? ''}
          onClose={() => setUnlockWindowMaxEndDate(null)}
        />
      </div>
    </Layout>
  )
}
