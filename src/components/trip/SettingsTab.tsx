import { useState } from 'react'
import type { EditPermission, Trip } from '../../types'
import { getShareLink } from '../../utils/tripCode'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

interface SettingsTabProps {
  trip: Trip
  updateTrip: (updater: (prev: Trip) => Trip) => void
  isHost: boolean
}

export function SettingsTab({ trip, updateTrip, isHost }: SettingsTabProps) {
  const [copied, setCopied] = useState(false)
  const shareLink = getShareLink(trip.code)

  const handlePermissionChange = (permission: EditPermission) => {
    if (!isHost) return
    updateTrip((prev) => ({ ...prev, editPermission: permission }))
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="tab-panel">
      <section className="settings-section">
        <h3 className="settings-title">行程編輯權限</h3>
        <div className="radio-group">
          <label className={`radio-item ${!isHost ? 'radio-item--disabled' : ''}`}>
            <input
              type="radio"
              name="editPermission"
              checked={trip.editPermission === 'host_only'}
              onChange={() => handlePermissionChange('host_only')}
              disabled={!isHost}
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
              disabled={!isHost}
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
        </Card>
      </section>

      <section className="settings-section">
        <h3 className="settings-title">成員列表</h3>
        <div className="member-list">
          {trip.members.map((m) => (
            <div key={m.id} className="member-item">
              <span className="member-name">{m.nickname}</span>
              {m.isHost && <span className="member-badge">主揪</span>}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
