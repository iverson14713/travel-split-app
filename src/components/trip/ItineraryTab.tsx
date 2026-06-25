import { useEffect, useMemo, useRef, useState } from 'react'
import type { Trip } from '../../types'
import { getTripDays } from '../../utils/dates'
import type { ReloadOptions } from '../../hooks/useTrip'
import { addItineraryItem } from '../../services/tripService'
import { useItineraryRealtime } from '../../hooks/useItineraryRealtime'
import { sortItineraryItems } from '../../utils/itinerarySort'
import {
  canMemberEditItineraryNotes,
  canMemberFullyEditItinerary,
  getItineraryLockedBlockedReason,
  ITINERARY_LOCKED_MESSAGE,
} from '../../utils/tripPermissions'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { Select } from '../ui/Select'
import { Modal } from '../ui/Modal'
import { Card } from '../ui/Card'
import { FreeAppRecommendation } from './FreeAppRecommendation'
import { ItineraryDetailModal } from './ItineraryDetailModal'
import { ItineraryImportModal } from './ItineraryImportModal'
import { TripEndedModal } from './TripEndedModal'
import type { ItineraryItem } from '../../types'
import {
  getItineraryAddBlockedReason,
  getTripDisplayStatus,
  TRIP_ARCHIVED_VIEW_HINT,
  TRIP_ENDED_VIEW_HINT,
  TRIP_SETTLING_VIEW_HINT,
  type TripItineraryBlockReason,
} from '../../utils/tripLifecycle'

interface ItineraryTabProps {
  trip: Trip
  tripId: string
  memberId?: string
  onReload: (options?: ReloadOptions) => Promise<void>
  onEditBlocked?: () => void
}

function getDefaultActiveDay(days: ReturnType<typeof getTripDays>, itinerary: Trip['itinerary']): number {
  const firstWithItems = days.find((day) => itinerary.some((item) => item.day === day.day))
  return firstWithItems?.day ?? days[0]?.day ?? 1
}

export function ItineraryTab({ trip, tripId, memberId, onReload, onEditBlocked }: ItineraryTabProps) {
  const days = getTripDays(trip.startDate, trip.endDate)
  const [showModal, setShowModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [selectedDay, setSelectedDay] = useState(1)
  const [time, setTime] = useState('')
  const [title, setTitle] = useState('')
  const [titleError, setTitleError] = useState('')
  const [location, setLocation] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [selectedItem, setSelectedItem] = useState<ItineraryItem | null>(null)
  const [showBlockedModal, setShowBlockedModal] = useState(false)
  const [blockedReason, setBlockedReason] = useState<TripItineraryBlockReason>('ended')
  const [activeDay, setActiveDay] = useState(() => getDefaultActiveDay(days, trip.itinerary))

  const chipRefs = useRef<Map<number, HTMLButtonElement>>(new Map())

  useItineraryRealtime(tripId, () => {
    void onReload({ silent: true })
  })

  const itemsByDay = useMemo(() => {
    const map = new Map<number, Trip['itinerary']>()
    for (const day of days) {
      const items = sortItineraryItems(
        trip.itinerary.filter((item) => item.day === day.day),
      )
      map.set(day.day, items)
    }
    return map
  }, [days, trip.itinerary])

  const activeDayInfo = useMemo(
    () => days.find((day) => day.day === activeDay) ?? days[0],
    [days, activeDay],
  )

  const activeItems = itemsByDay.get(activeDay) ?? []

  useEffect(() => {
    if (!days.some((day) => day.day === activeDay)) {
      setActiveDay(days[0]?.day ?? 1)
    }
  }, [days, activeDay])

  const resetForm = () => {
    setTime('')
    setTitle('')
    setLocation('')
    setNote('')
    setError('')
    setTitleError('')
  }

  const showEditBlocked = (reason: TripItineraryBlockReason) => {
    onEditBlocked?.()
    setBlockedReason(reason)
    setShowBlockedModal(true)
  }

  const openAdd = (day: number = activeDay) => {
    const lockedReason = getItineraryLockedBlockedReason(trip, memberId)
    if (lockedReason) {
      showEditBlocked(lockedReason)
      return
    }

    const blocked = getItineraryAddBlockedReason(trip)
    if (blocked) {
      showEditBlocked(blocked)
      return
    }
    setSelectedDay(day)
    resetForm()
    setShowModal(true)
  }

  const openImport = () => {
    const lockedReason = getItineraryLockedBlockedReason(trip, memberId)
    if (lockedReason) {
      showEditBlocked(lockedReason)
      return
    }

    const blocked = getItineraryAddBlockedReason(trip)
    if (blocked) {
      showEditBlocked(blocked)
      return
    }
    setShowImportModal(true)
  }

  const handleChipClick = (day: number) => {
    setActiveDay(day)
    chipRefs.current.get(day)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }

  const handleAdd = async () => {
    if (!title.trim()) {
      setTitleError('請先輸入行程標題')
      return
    }

    setSubmitting(true)
    setError('')
    setTitleError('')
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
      setActiveDay(selectedDay)
      await onReload({ silent: true })
      setShowModal(false)
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : '新增行程失敗')
    } finally {
      setSubmitting(false)
    }
  }

  const tripStatus = getTripDisplayStatus(trip)
  const isArchived = trip.status === 'archived'
  const isSettling = tripStatus === 'settling'
  const isEnded = tripStatus === 'ended'
  const canMutate = canMemberFullyEditItinerary(trip, memberId)
  const itineraryDetailEditMode = canMutate
    ? 'full'
    : canMemberEditItineraryNotes(trip, memberId)
      ? 'notes'
      : 'none'
  const itineraryViewOnlyHint =
    getItineraryLockedBlockedReason(trip, memberId) != null
      ? ITINERARY_LOCKED_MESSAGE
      : isArchived
        ? TRIP_ARCHIVED_VIEW_HINT
        : undefined

  if (!activeDayInfo) {
    return null
  }

  return (
    <div className="tab-panel tab-panel--itinerary">
      {isArchived && (
        <div className="archived-hint">
          <span>📌</span>
          <p>{TRIP_ARCHIVED_VIEW_HINT}</p>
        </div>
      )}
      {isSettling && (
        <div className="archived-hint">
          <span>📌</span>
          <p>{TRIP_SETTLING_VIEW_HINT}</p>
        </div>
      )}
      {isEnded && (
        <div className="archived-hint">
          <span>📌</span>
          <p>{TRIP_ENDED_VIEW_HINT}</p>
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

      <section className="day-section day-section--single">
        <div className="day-header day-header--static">
          <div className="day-header-main">
            <h3 className="day-title">Day {activeDayInfo.day}</h3>
            <p className="day-header-meta">
              {activeDayInfo.shortDate} {activeDayInfo.weekday} · {activeItems.length} 個行程
            </p>
          </div>
          {canMutate && (
            <div className="day-header-actions">
              <Button size="sm" variant="ghost" onClick={() => openAdd(activeDay)}>
                + 新增
              </Button>
              <Button size="sm" variant="ghost" onClick={openImport}>
                匯入
              </Button>
            </div>
          )}
        </div>

        {activeItems.length === 0 ? (
          <div className="day-empty-state">
            <p className="day-empty-state-title">還沒有行程</p>
            <p className="day-empty-state-hint">
              {canMutate
                ? '點「+ 新增」加入第一個行程'
                : isArchived
                  ? TRIP_ARCHIVED_VIEW_HINT
                  : isEnded
                    ? TRIP_ENDED_VIEW_HINT
                    : isSettling
                      ? '整理期間無法新增行程，可點既有行程編輯備註'
                      : '目前這天還沒有行程'}
            </p>
          </div>
        ) : (
          <div className="day-items">
            {activeItems.map((item) => (
              <Card
                key={item.id}
                className="itinerary-card"
                onClick={() => setSelectedItem(item)}
              >
                <div className="itinerary-time">{item.time || '全天'}</div>
                <div className="itinerary-body">
                  <h4 className="itinerary-title">{item.title}</h4>
                  {item.location && <p className="itinerary-location">📍 {item.location}</p>}
                  {item.note && <p className="itinerary-note">{item.note}</p>}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <FreeAppRecommendation trip={trip} />

      <ItineraryDetailModal
        open={selectedItem != null}
        onClose={() => setSelectedItem(null)}
        item={selectedItem}
        trip={trip}
        tripId={tripId}
        editMode={itineraryDetailEditMode}
        viewOnlyHint={itineraryViewOnlyHint}
        onSaved={async (dayIndex) => {
          if (dayIndex != null) {
            setActiveDay(dayIndex)
          }
          await onReload({ silent: true })
        }}
      />

      <TripEndedModal
        open={showBlockedModal}
        onClose={() => setShowBlockedModal(false)}
        reason={blockedReason}
        context="itinerary"
      />

      <ItineraryImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        trip={trip}
        tripId={tripId}
        memberId={memberId}
        onImported={async (firstDayIndex) => {
          if (firstDayIndex != null) {
            setActiveDay(firstDayIndex)
          }
          await onReload({ silent: true })
        }}
      />

      <Modal open={showModal} onClose={() => setShowModal(false)} title="新增行程">
        <div className="form">
          <Select
            label="日期"
            value={String(selectedDay)}
            onChange={(e) => setSelectedDay(Number(e.target.value))}
            options={days.map((d) => ({ value: String(d.day), label: d.label }))}
          />
          <Input label="時間" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          <Input
            label="行程標題 *"
            placeholder="請輸入行程標題"
            value={title}
            error={titleError}
            onChange={(e) => {
              setTitle(e.target.value)
              if (titleError) setTitleError('')
            }}
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
