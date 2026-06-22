import { useEffect, useState } from 'react'
import type { ItineraryItem, Trip } from '../../types'
import { getTripDays } from '../../utils/dates'
import { deleteItineraryItem, updateItineraryItem } from '../../services/tripService'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { Select } from '../ui/Select'
import { ARCHIVED_VIEW_ONLY_HINT } from './ArchivedTripBanner'
import { ItineraryDeleteConfirmModal } from './ItineraryDeleteConfirmModal'

interface ItineraryDetailModalProps {
  open: boolean
  onClose: () => void
  item: ItineraryItem | null
  trip: Trip
  tripId: string
  editMode?: 'full' | 'notes' | 'none'
  onSaved: (dayIndex?: number) => Promise<void>
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="expense-detail-row">
      <span className="expense-detail-label">{label}</span>
      <span className="expense-detail-value">{value}</span>
    </div>
  )
}

export function ItineraryDetailModal({
  open,
  onClose,
  item,
  trip,
  tripId,
  editMode = 'none',
  onSaved,
}: ItineraryDetailModalProps) {
  const days = getTripDays(trip.startDate, trip.endDate)
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [selectedDay, setSelectedDay] = useState(1)
  const [time, setTime] = useState('')
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    if (!open || !item) return
    setMode('view')
    setSelectedDay(item.day)
    setTime(item.time)
    setTitle(item.title)
    setLocation(item.location)
    setNote(item.note)
    setError('')
    setShowDeleteConfirm(false)
    setDeleteError('')
  }, [open, item])

  if (!item) return null

  const dayLabel = days.find((d) => d.day === item.day)?.label ?? `Day ${item.day}`

  const handleClose = () => {
    setMode('view')
    setError('')
    setShowDeleteConfirm(false)
    setDeleteError('')
    onClose()
  }

  const canEdit = editMode !== 'none'
  const notesOnly = editMode === 'notes'

  const handleSave = async () => {
    if (!notesOnly && !title.trim()) return

    setSaving(true)
    setError('')
    try {
      await updateItineraryItem(item.id, {
        tripId,
        dayIndex: notesOnly ? item.day : selectedDay,
        time: notesOnly ? item.time : time,
        title: notesOnly ? item.title : title.trim(),
        location: notesOnly ? item.location : location.trim(),
        note: note.trim(),
      })
      await onSaved(notesOnly ? item.day : selectedDay)
      handleClose()
    } catch {
      setError('操作失敗，請稍後再試')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteItineraryItem(item.id, tripId)
      await onSaved()
      setShowDeleteConfirm(false)
      handleClose()
    } catch {
      setDeleteError('操作失敗，請稍後再試')
    } finally {
      setDeleting(false)
    }
  }

  if (mode === 'edit' && canEdit) {
    return (
      <Modal open={open} onClose={handleClose} title={notesOnly ? '編輯備註' : '編輯行程'}>
        <div className="form">
          {!notesOnly && (
            <>
              <Select
                label="日期"
                value={String(selectedDay)}
                onChange={(e) => setSelectedDay(Number(e.target.value))}
                options={days.map((d) => ({ value: String(d.day), label: d.label }))}
              />
              <Input label="時間" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              <Input
                label="標題"
                placeholder="例：清水寺參觀"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Input
                label="地點"
                placeholder="例：清水寺"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </>
          )}
          {notesOnly && (
            <>
              <DetailRow label="標題" value={item.title} />
              <DetailRow label="所屬日期" value={dayLabel} />
            </>
          )}
          <Textarea
            label="備註"
            placeholder="備註事項..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
          />
          {error && <p className="form-error-msg">{error}</p>}
          <Button fullWidth variant="outline" type="button" onClick={() => setMode('view')} disabled={saving}>
            取消
          </Button>
          <Button
            fullWidth
            type="button"
            onClick={handleSave}
            disabled={saving || (!notesOnly && !title.trim())}
          >
            {saving ? '儲存中...' : '儲存'}
          </Button>
        </div>
      </Modal>
    )
  }

  return (
    <>
      <Modal open={open} onClose={handleClose} title="行程詳情">
        <div className="expense-detail">
          <DetailRow label="時間" value={item.time || '全天'} />
          <DetailRow label="標題" value={item.title} />
          <DetailRow label="地點" value={item.location || '—'} />
          <DetailRow label="備註" value={item.note || '—'} />
          <DetailRow label="所屬日期" value={dayLabel} />

          {editMode === 'none' && <p className="settings-hint">{ARCHIVED_VIEW_ONLY_HINT}</p>}

          <div className="itinerary-detail-actions">
            {canEdit && (
              <>
                <Button variant="outline" fullWidth type="button" onClick={() => setMode('edit')}>
                  {notesOnly ? '編輯備註' : '編輯'}
                </Button>
                {editMode === 'full' && (
                  <Button
                    variant="outline"
                    fullWidth
                    type="button"
                    onClick={() => {
                      setDeleteError('')
                      setShowDeleteConfirm(true)
                    }}
                  >
                    刪除
                  </Button>
                )}
              </>
            )}
            <Button variant="outline" fullWidth type="button" onClick={handleClose}>
              關閉
            </Button>
          </div>
        </div>
      </Modal>

      <ItineraryDeleteConfirmModal
        open={showDeleteConfirm}
        deleting={deleting}
        error={deleteError}
        onClose={() => {
          if (deleting) return
          setShowDeleteConfirm(false)
          setDeleteError('')
        }}
        onConfirm={handleDeleteConfirm}
      />
    </>
  )
}
