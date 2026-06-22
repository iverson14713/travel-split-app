import { useEffect, useMemo, useState } from 'react'
import type { EditPermission, Trip } from '../../types'
import type { ReloadOptions } from '../../hooks/useTrip'
import {
  archiveTrip,
  restoreTrip,
  softDeleteTrip,
  updateEditPermission,
  updateMemberName,
  updateTripDates,
} from '../../services/tripService'
import { getActiveMembers } from '../../utils/members'
import { useRemoveMember } from '../../hooks/useRemoveMember'
import { useTripUnlock } from '../../hooks/useTripUnlock'
import type { UpgradeReason } from '../../services/tripUnlockService'
import {
  formatUnlockMaxEndDate,
  validateTripDates,
} from '../../services/tripUnlockService'
import { FREE_LIMITS } from '../../constants/freeLimits'
import { ExchangeRateSettings } from './ExchangeRateSettings'
import { ArchivedTripBanner } from './ArchivedTripBanner'
import { FreeUsageHint } from './FreeUsageHint'
import { MemberLimitBanner } from './MemberLimitBanner'
import { ActiveMemberList } from './ActiveMemberList'
import { RemoveMemberConfirmModal } from './RemoveMemberConfirmModal'
import { RestoreTripUnlockButton } from './RestorePurchasesButton'
import { TripTooLongModal } from './TripTooLongModal'
import { TripUnlockWindowExceededModal } from './TripUnlockWindowExceededModal'
import { getShareLink } from '../../utils/tripCode'
import { updateTripNickname } from '../../utils/memberIdentity'
import { getLineShareText } from '../../utils/shareText'
import { updateRecentTripStatus } from '../../utils/storage'
import { useAppUI } from '../../context/AppUIContext'
import {
  canModifyTripDates,
  getTripDisplayStatus,
  isTripPastEndDate,
} from '../../utils/tripLifecycle'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'

interface SettingsPanelProps {
  trip: Trip
  tripId: string
  isHost: boolean
  currentMemberId?: string
  onReload: (options?: ReloadOptions) => Promise<void>
  onUpgradeRequired?: (reason: UpgradeReason) => void
  onStatusMessage?: (message: string) => void
  onTripDeleted?: () => void
  onGoHome?: () => void
}

export function SettingsPanel({
  trip,
  tripId,
  isHost,
  currentMemberId,
  onReload,
  onUpgradeRequired,
  onStatusMessage,
  onTripDeleted,
  onGoHome,
}: SettingsPanelProps) {
  const [copied, setCopied] = useState(false)
  const [lineCopied, setLineCopied] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState('')
  const [managingTrip, setManagingTrip] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showTooLongModal, setShowTooLongModal] = useState(false)
  const [unlockWindowMaxEndDate, setUnlockWindowMaxEndDate] = useState<string | null>(null)
  const [tripStartDate, setTripStartDate] = useState(trip.startDate)
  const [tripEndDate, setTripEndDate] = useState(trip.endDate)
  const [savingDates, setSavingDates] = useState(false)
  const [dateError, setDateError] = useState('')
  const { requestOnboarding } = useAppUI()
  const shareLink = getShareLink(trip.code)
  const { usage, refresh: refreshUnlock } = useTripUnlock(trip)
  const activeMembers = useMemo(() => getActiveMembers(trip.members), [trip.members])
  const {
    memberToRemove,
    removingMember,
    removeError,
    requestRemove,
    cancelRemove,
    confirmRemove,
  } = useRemoveMember({
    tripId,
    onReload,
    onRemoved: (member) => onStatusMessage?.(`已移除 ${member.nickname}`),
  })
  const showMemberFullBanner =
    usage != null &&
    !usage.isUnlimited &&
    usage.members >= FREE_LIMITS.maxMembers

  const myMember = useMemo(
    () => trip.members.find((m) => m.id === currentMemberId),
    [trip.members, currentMemberId],
  )
  const [myName, setMyName] = useState(myMember?.nickname ?? '')

  useEffect(() => {
    setMyName(myMember?.nickname ?? '')
  }, [myMember?.nickname])

  useEffect(() => {
    setTripStartDate(trip.startDate)
    setTripEndDate(trip.endDate)
  }, [trip.startDate, trip.endDate])

  const handleSaveTripDates = async () => {
    setDateError('')
    if (!canModifyTripDates(trip)) {
      setDateError('旅程已結束，無法修改日期。請建立新的旅程。')
      return
    }
    if (!tripStartDate || !tripEndDate) {
      setDateError('請選擇開始與結束日期')
      return
    }
    if (new Date(tripEndDate) < new Date(tripStartDate)) {
      setDateError('結束日期不能早於開始日期')
      return
    }
    if (isTripPastEndDate(trip) && tripEndDate > trip.endDate) {
      setDateError('旅程已結束，無法將結束日期往後延長。請建立新的旅程。')
      return
    }

    const dateValidation = validateTripDates(tripStartDate, tripEndDate, {
      tripId,
      fallbackBaseStartDate: trip.startDate,
    })
    if (!dateValidation.ok) {
      if (dateValidation.reason === 'too_long') {
        setShowTooLongModal(true)
      } else if (dateValidation.reason === 'exceeds_unlock_window') {
        setUnlockWindowMaxEndDate(dateValidation.maxEndDate)
      } else {
        onUpgradeRequired?.(dateValidation.upgradeReason)
      }
      return
    }

    setSavingDates(true)
    try {
      await updateTripDates(tripId, tripStartDate, tripEndDate)
      await onReload({ silent: true })
      onStatusMessage?.('已更新旅程日期')
    } catch (err) {
      setDateError(err instanceof Error ? err.message : '更新日期失敗')
    } finally {
      setSavingDates(false)
    }
  }

  const handlePermissionChange = async (permission: EditPermission) => {
    if (!isHost || isArchived || isEnded || trip.editPermission === permission) return

    setUpdating(true)
    try {
      await updateEditPermission(tripId, permission)
      await onReload({ silent: true })
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
      updateTripNickname(tripId, trimmed)
      await onReload({ silent: true })
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
      updateRecentTripStatus(trip.code, 'archived')
      await onReload({ silent: true })
      onStatusMessage?.('已封存這趟旅行')
    } finally {
      setManagingTrip(false)
    }
  }

  const handleRestore = async () => {
    setManagingTrip(true)
    try {
      await restoreTrip(tripId)
      updateRecentTripStatus(trip.code, 'active')
      await onReload({ silent: true })
      onStatusMessage?.('已取消封存，旅行恢復為進行中')
    } finally {
      setManagingTrip(false)
    }
  }

  const handleSoftDelete = async () => {
    setManagingTrip(true)
    try {
      await softDeleteTrip(tripId)
      setShowDeleteConfirm(false)
      onTripDeleted?.()
    } finally {
      setManagingTrip(false)
    }
  }

  const isArchived = trip.status === 'archived'
  const isEnded = getTripDisplayStatus(trip) === 'ended'
  const datesEditable = canModifyTripDates(trip)

  return (
    <div className="settings-panel">
      {onGoHome && (
        <section className="settings-section settings-section--home">
          <Button fullWidth variant="outline" type="button" onClick={onGoHome}>
            回到首頁
          </Button>
          <p className="settings-hint">查看本裝置上的旅程列表</p>
        </section>
      )}

      {isArchived && (
        <section className="settings-section">
          <ArchivedTripBanner />
        </section>
      )}

      {usage && (
        <section className="settings-section settings-section--usage">
          <FreeUsageHint usage={usage} />
          {!usage.isUnlimited && onUpgradeRequired && (
            <Button
              size="sm"
              variant="outline"
              type="button"
              fullWidth
              onClick={() =>
                onUpgradeRequired(showMemberFullBanner ? 'member_limit_full' : 'manual_unlock')
              }
            >
              解鎖這趟旅程
            </Button>
          )}
          <RestoreTripUnlockButton
            tripId={tripId}
            className="restore-purchases restore-purchases--settings"
            onMessage={onStatusMessage}
            onRestored={() => refreshUnlock()}
          />
        </section>
      )}

      {isHost && (
        <section className="settings-section">
          <h3 className="settings-title">旅程日期</h3>
          <Card className="settings-card">
            <Input
              label="開始日期"
              type="date"
              value={tripStartDate}
              onChange={(e) => setTripStartDate(e.target.value)}
              disabled={!datesEditable}
            />
            <Input
              label="結束日期"
              type="date"
              value={tripEndDate}
              onChange={(e) => setTripEndDate(e.target.value)}
              disabled={!datesEditable}
            />
            {dateError && <p className="form-error-msg">{dateError}</p>}
            <Button
              fullWidth
              onClick={handleSaveTripDates}
              disabled={
                !datesEditable ||
                savingDates ||
                (tripStartDate === trip.startDate && tripEndDate === trip.endDate)
              }
            >
              {savingDates ? '儲存中...' : '儲存日期'}
            </Button>
            {isArchived && <p className="settings-hint">已封存旅行無法修改日期</p>}
            {isEnded && !isArchived && (
              <p className="settings-hint">旅程已結束，無法修改日期。請建立新的旅程。</p>
            )}
            {!isArchived && !isEnded && !usage?.isUnlimited && (
              <p className="settings-hint">
                免費版最多 5 天；解鎖後此趟旅程最多 30 天。旅程結束後仍可查看與結算。
              </p>
            )}
            {!isArchived && !isEnded && usage?.isUnlimited && usage.unlockMaxEndDate && (
              <p className="settings-hint">
                此旅程已解鎖，最多可設定至 {formatUnlockMaxEndDate(usage.unlockMaxEndDate)}。
              </p>
            )}
          </Card>
        </section>
      )}

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
          <label className={`radio-item ${!isHost || isArchived || isEnded ? 'radio-item--disabled' : ''}`}>
            <input
              type="radio"
              name="editPermission"
              checked={trip.editPermission === 'owner_only'}
              onChange={() => handlePermissionChange('owner_only')}
              disabled={!isHost || isArchived || isEnded || updating}
            />
            <div>
              <strong>只有主揪可編輯</strong>
              <p>行程由主揪統一管理</p>
            </div>
          </label>
          <label className={`radio-item ${!isHost || isArchived || isEnded ? 'radio-item--disabled' : ''}`}>
            <input
              type="radio"
              name="editPermission"
              checked={trip.editPermission === 'all_members'}
              onChange={() => handlePermissionChange('all_members')}
              disabled={!isHost || isArchived || isEnded || updating}
            />
            <div>
              <strong>所有成員可編輯</strong>
              <p>每位旅伴都能新增與修改行程</p>
            </div>
          </label>
        </div>
        {!isHost && <p className="settings-hint">僅主揪可變更此設定</p>}
        {isArchived && <p className="settings-hint">已封存旅行無法變更編輯權限</p>}
      </section>

      <section className="settings-section">
        <h3 className="settings-title">匯率設定</h3>
        <ExchangeRateSettings trip={trip} tripId={tripId} onReload={onReload} />
      </section>

      <section className="settings-section">
        <h3 className="settings-title">分享資訊</h3>
        {showMemberFullBanner && onUpgradeRequired && (
          <MemberLimitBanner
            memberCount={usage!.members}
            maxMembers={FREE_LIMITS.maxMembers}
            onUpgrade={() => onUpgradeRequired('member_limit_full')}
          />
        )}
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
        <h3 className="settings-title">成員列表（{activeMembers.length}）</h3>
        <ActiveMemberList
          members={activeMembers}
          showRemove={isHost && !isArchived}
          onRemove={requestRemove}
        />
      </section>

      <section className="settings-section">
        <h3 className="settings-title">旅行管理</h3>
        <Card className="settings-card">
          <div className="settings-manage-block">
            <p className="settings-manage-label">封存旅行</p>
            <p className="settings-hint">
              封存後會保留所有資料，並從進行中的旅行移到已封存旅行。封存後僅供查看，可隨時取消封存。
            </p>
            {isArchived ? (
              <Button fullWidth onClick={handleRestore} disabled={managingTrip}>
                {managingTrip ? '處理中...' : '取消封存'}
              </Button>
            ) : (
              <Button fullWidth variant="outline" onClick={handleArchive} disabled={managingTrip}>
                {managingTrip ? '處理中...' : '封存旅行'}
              </Button>
            )}
          </div>

          {isHost && (
            <div className="settings-manage-block settings-manage-block--danger">
              <p className="settings-manage-label">刪除旅行</p>
              <p className="settings-hint">
                刪除後會永久移除這趟旅行與相關資料，無法復原。
              </p>
              <Button
                fullWidth
                variant="secondary"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={managingTrip}
              >
                刪除旅行
              </Button>
            </div>
          )}
        </Card>
      </section>

      <section className="settings-section">
        <h3 className="settings-title">關於</h3>
        <Card className="settings-about-card">
          <a href="/privacy" className="settings-about-link">
            隱私權政策
          </a>
          <a href="/terms" className="settings-about-link">
            服務條款
          </a>
          <button type="button" className="settings-about-link" onClick={requestOnboarding}>
            重新查看導覽
          </button>
        </Card>
      </section>

      <TripTooLongModal open={showTooLongModal} onClose={() => setShowTooLongModal(false)} />

      <TripUnlockWindowExceededModal
        open={unlockWindowMaxEndDate != null}
        maxEndDate={unlockWindowMaxEndDate ?? ''}
        onClose={() => setUnlockWindowMaxEndDate(null)}
      />

      <RemoveMemberConfirmModal
        member={memberToRemove}
        open={memberToRemove != null}
        removing={removingMember}
        error={removeError}
        onClose={cancelRemove}
        onConfirm={confirmRemove}
      />

      <Modal open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="刪除旅行？">
        <div className="form">
          <p className="settings-hint">
            刪除後會永久移除這趟旅行與相關資料，無法復原。
          </p>
          <Button fullWidth variant="secondary" onClick={handleSoftDelete} disabled={managingTrip}>
            {managingTrip ? '刪除中...' : '永久刪除'}
          </Button>
          <Button fullWidth variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={managingTrip}>
            取消
          </Button>
        </div>
      </Modal>
    </div>
  )
}
