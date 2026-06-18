import { useEffect, useMemo, useState } from 'react'
import type { EditPermission, Trip } from '../../types'
import { archiveTrip, restoreTrip, softDeleteTrip, updateEditPermission, updateExchangeRates, updateMemberName } from '../../services/tripService'
import { fetchLatestExchangeRatesToTwd } from '../../services/exchangeRateService'
import { getShareLink } from '../../utils/tripCode'
import { getLineShareText } from '../../utils/shareText'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'

interface SettingsPanelProps {
  trip: Trip
  tripId: string
  isHost: boolean
  currentMemberId?: string
  onReload: () => Promise<void>
}

export function SettingsPanel({ trip, tripId, isHost, currentMemberId, onReload }: SettingsPanelProps) {
  const [copied, setCopied] = useState(false)
  const [lineCopied, setLineCopied] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState('')
  const [managingTrip, setManagingTrip] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [savingRates, setSavingRates] = useState(false)
  const [refreshingRates, setRefreshingRates] = useState(false)
  const [rateError, setRateError] = useState('')
  const [rateNotice, setRateNotice] = useState('')
  const [jpyPer100Twd, setJpyPer100Twd] = useState(String(Math.round(trip.jpyToTwdRate * 1000) / 10))
  const [usdPerTwd, setUsdPerTwd] = useState(String(trip.usdToTwdRate))
  const shareLink = getShareLink(trip.code)

  const myMember = useMemo(
    () => trip.members.find((m) => m.id === currentMemberId),
    [trip.members, currentMemberId],
  )
  const [myName, setMyName] = useState(myMember?.nickname ?? '')

  useEffect(() => {
    setMyName(myMember?.nickname ?? '')
  }, [myMember?.nickname])

  useEffect(() => {
    setJpyPer100Twd(String(Math.round(trip.jpyToTwdRate * 1000) / 10))
    setUsdPerTwd(String(trip.usdToTwdRate))
  }, [trip.jpyToTwdRate, trip.usdToTwdRate])

  const handlePermissionChange = async (permission: EditPermission) => {
    if (!isHost || trip.editPermission === permission) return

    setUpdating(true)
    try {
      await updateEditPermission(tripId, permission)
      await onReload()
    } finally {
      setUpdating(false)
    }
  }

  const handleSaveMyName = async () => {
    setNameError('')
    if (!currentMemberId) return
    const trimmed = myName.trim()
    if (!trimmed) {
      setNameError('暱稱不能為空')
      return
    }

    setSavingName(true)
    try {
      await updateMemberName(currentMemberId, trimmed)
      await onReload()
    } catch (err) {
      setNameError(err instanceof Error ? err.message : '更新暱稱失敗')
    } finally {
      setSavingName(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyLineText = async () => {
    await navigator.clipboard.writeText(getLineShareText(trip.code))
    setLineCopied(true)
    setTimeout(() => setLineCopied(false), 2000)
  }

  const handleSaveRates = async () => {
    setRateError('')
    setRateNotice('')
    const jpy100 = parseFloat(jpyPer100Twd)
    const usd = parseFloat(usdPerTwd)

    if (!Number.isFinite(jpy100) || jpy100 <= 0) {
      setRateError('請輸入有效的日圓匯率')
      return
    }
    if (!Number.isFinite(usd) || usd <= 0) {
      setRateError('請輸入有效的美元匯率')
      return
    }

    setSavingRates(true)
    try {
      await updateExchangeRates(tripId, {
        jpyToTwdRate: jpy100 / 100,
        usdToTwdRate: usd,
      })
      setRateNotice('匯率已儲存。已建立的舊支出不會自動改變。')
      await onReload()
    } catch (err) {
      setRateError(err instanceof Error ? err.message : '更新匯率失敗')
    } finally {
      setSavingRates(false)
    }
  }

  const handleRefreshRates = async () => {
    setRateError('')
    setRateNotice('')
    setRefreshingRates(true)
    try {
      const rates = await fetchLatestExchangeRatesToTwd()
      await updateExchangeRates(tripId, {
        jpyToTwdRate: rates.jpyToTwdRate,
        usdToTwdRate: rates.usdToTwdRate,
        exchangeRateSource: rates.source,
        exchangeRateFetchedAt: rates.fetchedAt,
      })
      if (rates.source === 'fallback') {
        setRateNotice('無法取得目前匯率，已改用預設估算匯率。已建立的舊支出不會自動改變。')
      } else {
        setRateNotice('已更新估算匯率。已建立的舊支出不會自動改變。')
      }
      await onReload()
    } catch (err) {
      setRateError(err instanceof Error ? err.message : '重新抓取匯率失敗')
    } finally {
      setRefreshingRates(false)
    }
  }

  const handleArchive = async () => {
    setManagingTrip(true)
    try {
      await archiveTrip(tripId)
      await onReload()
    } finally {
      setManagingTrip(false)
    }
  }

  const handleRestore = async () => {
    setManagingTrip(true)
    try {
      await restoreTrip(tripId)
      await onReload()
    } finally {
      setManagingTrip(false)
    }
  }

  const handleSoftDelete = async () => {
    setManagingTrip(true)
    try {
      await softDeleteTrip(tripId)
      // 刪除後讓 UI 自然回到 join 流程（TripRoomPage 會導向 join?code=）
      await onReload()
      setShowDeleteConfirm(false)
    } finally {
      setManagingTrip(false)
    }
  }

  return (
    <div className="settings-panel">
      <section className="settings-section">
        <h3 className="settings-title">我的暱稱</h3>
        <Card className="settings-card">
          <Input
            label="暱稱"
            placeholder="輸入你的暱稱"
            value={myName}
            onChange={(e) => setMyName(e.target.value)}
          />
          {nameError && <p className="form-error-msg">{nameError}</p>}
          <Button
            fullWidth
            onClick={handleSaveMyName}
            disabled={!currentMemberId || savingName || (myMember?.nickname ?? '') === myName.trim()}
          >
            {savingName ? '儲存中...' : '儲存暱稱'}
          </Button>
          {!currentMemberId && <p className="settings-hint">請先加入旅行後才能修改暱稱</p>}
        </Card>
      </section>

      <section className="settings-section">
        <h3 className="settings-title">行程編輯權限</h3>
        <div className="radio-group">
          <label className={`radio-item ${!isHost ? 'radio-item--disabled' : ''}`}>
            <input
              type="radio"
              name="editPermission"
              checked={trip.editPermission === 'owner_only'}
              onChange={() => handlePermissionChange('owner_only')}
              disabled={!isHost || updating}
            />
            <div>
              <strong>只有主揪可編輯</strong>
              <p>行程由主揪統一管理</p>
            </div>
          </label>
          <label className={`radio-item ${!isHost ? 'radio-item--disabled' : ''}`}>
            <input
              type="radio"
              name="editPermission"
              checked={trip.editPermission === 'all_members'}
              onChange={() => handlePermissionChange('all_members')}
              disabled={!isHost || updating}
            />
            <div>
              <strong>所有成員可編輯</strong>
              <p>每位旅伴都能新增與修改行程</p>
            </div>
          </label>
        </div>
        {!isHost && <p className="settings-hint">僅主揪可變更此設定</p>}
      </section>

      <section className="settings-section">
        <h3 className="settings-title">匯率設定</h3>
        <Card className="settings-card">
          <p className="settings-hint">
            台幣金額會依每筆記帳當下的匯率估算。
            <br />
            已建立的舊支出不會自動改變。
          </p>
          <div className="settings-row">
            <span className="settings-label">基準幣別</span>
            <span className="settings-value">TWD 台幣</span>
          </div>
          <div className="exchange-rate-row">
            <span className="exchange-rate-label">100 JPY =</span>
            <Input
              type="number"
              min="0"
              step="0.1"
              value={jpyPer100Twd}
              onChange={(e) => setJpyPer100Twd(e.target.value)}
            />
            <span className="exchange-rate-suffix">TWD</span>
          </div>
          <div className="exchange-rate-row">
            <span className="exchange-rate-label">1 USD =</span>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={usdPerTwd}
              onChange={(e) => setUsdPerTwd(e.target.value)}
            />
            <span className="exchange-rate-suffix">TWD</span>
          </div>
          {rateError && <p className="form-error-msg">{rateError}</p>}
          {rateNotice && <p className="settings-hint">{rateNotice}</p>}
          <Button fullWidth onClick={handleSaveRates} disabled={savingRates || refreshingRates}>
            {savingRates ? '儲存中...' : '儲存匯率'}
          </Button>
          <Button
            fullWidth
            variant="outline"
            onClick={handleRefreshRates}
            disabled={savingRates || refreshingRates}
          >
            {refreshingRates ? '抓取中...' : '重新抓取目前匯率'}
          </Button>
        </Card>
      </section>

      <section className="settings-section">
        <h3 className="settings-title">分享資訊</h3>
        <Card className="settings-card">
          <div className="settings-row">
            <span className="settings-label">旅行代碼</span>
            <span className="settings-value settings-code">{trip.code}</span>
          </div>
          <div className="settings-row">
            <span className="settings-label">分享連結</span>
            <span className="settings-value settings-link">{shareLink}</span>
          </div>
          <Button fullWidth variant="outline" onClick={handleCopy}>
            {copied ? '已複製！' : '複製分享連結'}
          </Button>
          <Button fullWidth variant="outline" onClick={handleCopyLineText}>
            {lineCopied ? '已複製！' : '複製 LINE 分享文字'}
          </Button>
        </Card>
      </section>

      <section className="settings-section">
        <h3 className="settings-title">成員列表（{trip.members.length}）</h3>
        <div className="member-list">
          {trip.members.map((m) => (
            <div key={m.id} className="member-item">
              <span className="member-name">{m.nickname}</span>
              {m.isHost && <span className="member-badge">主揪</span>}
            </div>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <h3 className="settings-title">旅行管理</h3>
        <Card className="settings-card">
          {trip.status === 'archived' ? (
            <>
              <p className="settings-hint">此旅行目前已封存，可恢復為進行中。</p>
              <Button fullWidth onClick={handleRestore} disabled={managingTrip}>
                {managingTrip ? '處理中...' : '恢復旅行'}
              </Button>
            </>
          ) : (
            <>
              <p className="settings-hint">封存後仍可查看，但代表這趟旅行已結束。</p>
              <Button fullWidth variant="outline" onClick={handleArchive} disabled={managingTrip}>
                {managingTrip ? '處理中...' : '封存旅行'}
              </Button>
            </>
          )}

          {isHost && (
            <Button
              fullWidth
              variant="secondary"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={managingTrip}
            >
              刪除旅行
            </Button>
          )}
        </Card>
      </section>

      <Modal open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="確認刪除旅行">
        <div className="form">
          <p className="form-error-msg">
            刪除後，這趟旅行的行程與帳目將不再顯示。此操作無法在 App 內復原。
          </p>
          <Button fullWidth variant="secondary" onClick={handleSoftDelete} disabled={managingTrip}>
            {managingTrip ? '刪除中...' : '確認刪除'}
          </Button>
          <Button fullWidth variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={managingTrip}>
            取消
          </Button>
        </div>
      </Modal>
    </div>
  )
}
