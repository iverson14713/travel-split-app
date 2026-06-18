import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

function getDefaultExpandedDay(days: ReturnType<typeof getTripDays>, itinerary: Trip['itinerary']): number {
  const firstWithItems = days.find((day) => itinerary.some((item) => item.day === day.day))
  return firstWithItems?.day ?? 1
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
  const [activeDay, setActiveDay] = useState(() => getDefaultExpandedDay(days, trip.itinerary))
  const [expandedDays, setExpandedDays] = useState<Set<number>>(
    () => new Set([getDefaultExpandedDay(days, trip.itinerary)]),
  )

  const dayRefs = useRef<Map<number, HTMLElement>>(new Map())
  const chipRefs = useRef<Map<number, HTMLButtonElement>>(new Map())
  const scrollAfterAddRef = useRef<number | null>(null)

  const itemsByDay = useMemo(() => {
    const map = new Map<number, Trip['itinerary']>()
    for (const day of days) {
      const items = trip.itinerary
        .filter((item) => item.day === day.day)
        .sort((a, b) => a.time.localeCompare(b.time))
      map.set(day.day, items)
    }
    return map
  }, [days, trip.itinerary])

  const scrollToDay = useCallback((day: number, behavior: ScrollBehavior = 'smooth') => {
    requestAnimationFrame(() => {
      dayRefs.current.get(day)?.scrollIntoView({ behavior, block: 'start' })
      chipRefs.current.get(day)?.scrollIntoView({ behavior, inline: 'center', block: 'nearest' })
    })
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

        if (visible.length === 0) return

        const day = Number(visible[0].target.getAttribute('data-day'))
        if (!Number.isNaN(day)) {
          setActiveDay(day)
          chipRefs.current.get(day)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
        }
      },
      { rootMargin: '-7rem 0px -55% 0px', threshold: 0 },
    )

    for (const day of days) {
      const el = dayRefs.current.get(day.day)
      if (el) observer.observe(el)
    }

    return () => observer.disconnect()
  }, [days, expandedDays])

  useEffect(() => {
    if (scrollAfterAddRef.current === null) return
    const day = scrollAfterAddRef.current
    scrollAfterAddRef.current = null
    setExpandedDays((prev) => new Set(prev).add(day))
    setActiveDay(day)
    const timer = setTimeout(() => scrollToDay(day), 150)
    return () => clearTimeout(timer)
  }, [trip.itinerary, scrollToDay])

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

  const toggleDay = (day: number) => {
    setExpandedDays((prev) => {
      const next = new Set(prev)
      if (next.has(day)) next.delete(day)
      else next.add(day)
      return next
    })
  }

  const handleChipClick = (day: number) => {
    setActiveDay(day)
    setExpandedDays((prev) => new Set(prev).add(day))
    scrollToDay(day)
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
      scrollAfterAddRef.current = selectedDay
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
    <div className="tab-panel tab-panel--itinerary">
      {trip.status === 'archived' && (
        <div className="archived-hint">
          <span>📌</span>
          <p>這趟旅行已封存，新增內容會自動恢復為進行中</p>
        </div>
      )}

      <div className="day-strip" role="tablist" aria-label="快速切換日期">
        {days.map((day) => {
          const count = itemsByDay.get(day.day)?.length ?? 0
          const isActive = activeDay === day.day

          return (
            <button
              key={day.day}
              type="button"
              ref={(el) => {
                if (el) chipRefs.current.set(day.day, el)
                else chipRefs.current.delete(day.day)
              }}
              className={`day-chip ${isActive ? 'day-chip--active' : ''} ${count === 0 ? 'day-chip--empty' : ''}`}
              onClick={() => handleChipClick(day.day)}
              aria-selected={isActive}
            >
              <span className="day-chip-label">Day {day.day}</span>
              <span className="day-chip-date">{day.shortDate}</span>
              <span className="day-chip-count">{count} 筆</span>
            </button>
          )
        })}
      </div>

      {days.map((day) => {
        const items = itemsByDay.get(day.day) ?? []
        const isExpanded = expandedDays.has(day.day)

        return (
          <section
            key={day.day}
            ref={(el) => {
              if (el) dayRefs.current.set(day.day, el)
              else dayRefs.current.delete(day.day)
            }}
            data-day={day.day}
            className={`day-section ${isExpanded ? 'day-section--expanded' : 'day-section--collapsed'}`}
          >
            <div
              className="day-header"
              onClick={() => toggleDay(day.day)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggleDay(day.day)
                }
              }}
              role="button"
              tabIndex={0}
              aria-expanded={isExpanded}
            >
              <div className="day-header-main">
                <div className="day-header-top">
                  <h3 className="day-title">Day {day.day}</h3>
                  <span className={`day-chevron ${isExpanded ? 'day-chevron--open' : ''}`} aria-hidden="true">
                    ▾
                  </span>
                </div>
                <p className="day-header-meta">
                  {day.shortDate} {day.weekday} · {items.length} 個行程
                </p>
              </div>
              {canEdit && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    openAdd(day.day)
                  }}
                >
                  + 新增
                </Button>
              )}
            </div>

            {isExpanded && (
              <>
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
              </>
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
