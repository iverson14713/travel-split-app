import { useEffect, useMemo, useState } from 'react'
import type { EditPermission, Trip } from '../../types'
import { archiveTrip, restoreTrip, softDeleteTrip, updateEditPermission, updateMemberName } from '../../services/tripService'
import { getShareLink } from '../../utils/tripCode'
import { getLineShareText } from '../../utils/shareText'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'

interface SettingsTabProps {
  trip: Trip
  tripId: string
  isHost: boolean
  currentMemberId?: string
  onReload: () => Promise<void>
}

export function SettingsTab({ trip, tripId, isHost, currentMemberId, onReload }: SettingsTabProps) {
  const [copied, setCopied] = useState(false)
  const [lineCopied, setLineCopied] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState('')
  const [managingTrip, setManagingTrip] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const shareLink = getShareLink(trip.code)

  const myMember = useMemo(
    () => trip.members.find((m) => m.id === currentMemberId),
    [trip.members, currentMemberId],
  )
  const [myName, setMyName] = useState(myMember?.nickname ?? '')

  useEffect(() => {
    setMyName(myMember?.nickname ?? '')
  }, [myMember?.nickname])

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
    <div className="tab-panel">
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
