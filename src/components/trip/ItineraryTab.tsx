import { useState } from 'react'
import type { Trip } from '../../types'
import { getTripDays } from '../../utils/dates'
import { addItineraryItem } from '../../services/tripService'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { Select } from '../ui/Select'
import { Modal } from '../ui/Modal'
import { Card } from '../ui/Card'

interface ItineraryTabProps {
  trip: Trip
  tripId: string
  memberId?: string
  canEdit: boolean
  onReload: () => Promise<void>
}

export function ItineraryTab({ trip, tripId, memberId, canEdit, onReload }: ItineraryTabProps) {
  const days = getTripDays(trip.startDate, trip.endDate)
  const [showModal, setShowModal] = useState(false)
  const [selectedDay, setSelectedDay] = useState(1)
  const [time, setTime] = useState('')
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const resetForm = () => {
    setTime('')
    setTitle('')
    setLocation('')
    setNote('')
    setError('')
  }

  const openAdd = (day: number) => {
    setSelectedDay(day)
    resetForm()
    setShowModal(true)
  }

  const handleAdd = async () => {
    if (!title.trim()) return

    setSubmitting(true)
    setError('')
    try {
      await addItineraryItem({
        tripId,
        dayIndex: selectedDay,
        time,
        title: title.trim(),
        location: location.trim(),
        note: note.trim(),
        createdBy: memberId,
      })
      await onReload()
      setShowModal(false)
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : '新增行程失敗')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="tab-panel">
      {days.map((day) => {
        const items = trip.itinerary
          .filter((item) => item.day === day.day)
          .sort((a, b) => a.time.localeCompare(b.time))

        return (
          <section key={day.day} className="day-section">
            <div className="day-header">
              <h3 className="day-title">{day.label}</h3>
              {canEdit && (
                <Button size="sm" variant="ghost" onClick={() => openAdd(day.day)}>
                  + 新增
                </Button>
              )}
            </div>

            {items.length === 0 ? (
              <p className="day-empty">尚無行程</p>
            ) : (
              <div className="day-items">
                {items.map((item) => (
                  <Card key={item.id} className="itinerary-card">
                    <div className="itinerary-time">{item.time || '全天'}</div>
                    <div className="itinerary-body">
                      <h4 className="itinerary-title">{item.title}</h4>
                      {item.location && (
                        <p className="itinerary-location">📍 {item.location}</p>
                      )}
                      {item.note && <p className="itinerary-note">{item.note}</p>}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        )
      })}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="新增行程">
        <div className="form">
          <Select
            label="日期"
            value={String(selectedDay)}
            onChange={(e) => setSelectedDay(Number(e.target.value))}
            options={days.map((d) => ({ value: String(d.day), label: d.label }))}
          />
          <Input
            label="時間"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
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
          <Textarea
            label="備註"
            placeholder="備註事項..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
          />
          {error && <p className="form-error-msg">{error}</p>}
          <Button fullWidth onClick={handleAdd} disabled={submitting}>
            {submitting ? '新增中...' : '新增行程'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
