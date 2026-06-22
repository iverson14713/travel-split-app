import { useMemo, useState } from 'react'
import type { Trip } from '../../types'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Textarea } from '../ui/Textarea'
import { addItineraryItemsBatch } from '../../services/tripService'
import {
  parseItineraryText,
  type ParsedItineraryItem,
} from '../../utils/parseItineraryText'

interface ItineraryImportModalProps {
  open: boolean
  onClose: () => void
  trip: Trip
  tripId: string
  memberId?: string
  onImported: (firstDayIndex?: number) => Promise<void>
}

type Step = 'input' | 'preview'

function comparePreviewItems(a: ParsedItineraryItem, b: ParsedItineraryItem): number {
  const aEmpty = !a.time
  const bEmpty = !b.time
  if (aEmpty && !bEmpty) return 1
  if (!aEmpty && bEmpty) return -1
  if (!aEmpty && !bEmpty) return a.time.localeCompare(b.time)
  return 0
}

function groupByDay(items: ParsedItineraryItem[]): Map<number, ParsedItineraryItem[]> {
  const map = new Map<number, ParsedItineraryItem[]>()
  for (const item of items) {
    const list = map.get(item.dayIndex) ?? []
    list.push(item)
    map.set(item.dayIndex, list)
  }
  for (const [, list] of map) {
    list.sort(comparePreviewItems)
  }
  return map
}

function formatPreviewTime(time: string): string {
  if (!time) return '未指定時間'
  return time
}

function PreviewItem({ item }: { item: ParsedItineraryItem }) {
  const metaParts = [item.location]
  if (item.note && item.note !== '未指定時間') {
    metaParts.push(item.note)
  }
  const meta = metaParts.filter(Boolean).join(' · ')
  return (
    <li className="itinerary-import-preview-item">
      <span className="itinerary-import-preview-time">{formatPreviewTime(item.time)}</span>
      <span className="itinerary-import-preview-title">{item.title}</span>
      {meta && <span className="itinerary-import-preview-meta">{meta}</span>}
    </li>
  )
}

export function ItineraryImportModal({
  open,
  onClose,
  trip,
  tripId,
  memberId,
  onImported,
}: ItineraryImportModalProps) {
  const [step, setStep] = useState<Step>('input')
  const [inputText, setInputText] = useState('')
  const [parseResult, setParseResult] = useState<ReturnType<typeof parseItineraryText> | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const previewGroups = useMemo(() => {
    if (!parseResult) return new Map<number, ParsedItineraryItem[]>()
    return groupByDay(parseResult.items)
  }, [parseResult])

  const outOfRangeGroups = useMemo(() => {
    if (!parseResult) return new Map<number, ParsedItineraryItem[]>()
    return groupByDay(parseResult.outOfRangeItems)
  }, [parseResult])

  const reset = () => {
    setStep('input')
    setInputText('')
    setParseResult(null)
    setError('')
    setSubmitting(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleParse = () => {
    setError('')
    const trimmed = inputText.trim()
    if (!trimmed) {
      setError('請貼上行程文字')
      return
    }

    const result = parseItineraryText(trimmed, trip.startDate, trip.endDate)
    const parsedCount = result.items.length + result.outOfRangeItems.length

    if (parsedCount === 0) {
      setError('無法解析任何行程，請調整文字格式後再試')
      return
    }

    setParseResult(result)
    setStep('preview')
  }

  const handleConfirm = async () => {
    if (!parseResult || parseResult.items.length === 0) return

    setSubmitting(true)
    setError('')
    try {
      const firstDay = Math.min(...parseResult.items.map((item) => item.dayIndex))
      await addItineraryItemsBatch({
        tripId,
        createdBy: memberId,
        items: parseResult.items.map((item) => ({
          dayIndex: item.dayIndex,
          time: item.time,
          title: item.title,
          location: item.location,
          note: item.note,
        })),
      })
      await onImported(firstDay)
      handleClose()
    } catch {
      setError('匯入失敗，請稍後再試')
    } finally {
      setSubmitting(false)
    }
  }

  const sortedPreviewDays = [...previewGroups.keys()].sort((a, b) => a - b)
  const sortedOutOfRangeDays = [...outOfRangeGroups.keys()].sort((a, b) => a - b)
  const parsedDayCount = new Set([
    ...parseResult?.items.map((item) => item.dayIndex) ?? [],
    ...parseResult?.outOfRangeItems.map((item) => item.dayIndex) ?? [],
  ]).size
  const parsedItemCount =
    (parseResult?.items.length ?? 0) + (parseResult?.outOfRangeItems.length ?? 0)
  const unparsedCount = parseResult?.unparsedLines.length ?? 0

  return (
    <Modal open={open} onClose={handleClose} title="貼上行程匯入">
      <div className="itinerary-import">
        {step === 'input' ? (
          <>
            <p className="itinerary-import-desc">
              可以貼上 ChatGPT 或其他工具產生的行程文字，系統會嘗試整理成每日行程。
            </p>
            <Textarea
              className="itinerary-import-textarea"
              placeholder={`例如：\nDay 1\n09:00 抵達成田機場\n11:00 淺草寺\n13:00 午餐\n15:00 晴空塔`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={12}
            />
            {error && <p className="form-error-msg">{error}</p>}
            <div className="itinerary-import-actions">
              <Button fullWidth onClick={handleParse} disabled={submitting}>
                解析行程
              </Button>
              <Button fullWidth variant="ghost" onClick={handleClose}>
                取消
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="itinerary-import-preview">
              {parseResult && (
                <div className="itinerary-import-preview-summary">
                  <span>成功解析 {parsedDayCount} 天</span>
                  <span>成功解析 {parsedItemCount} 筆行程</span>
                  {unparsedCount > 0 && <span>未匯入內容 {unparsedCount} 行</span>}
                </div>
              )}

              {sortedPreviewDays.length === 0 ? (
                <p className="itinerary-import-preview-empty">
                  沒有可匯入的行程（可能都超出旅程天數）
                </p>
              ) : (
                sortedPreviewDays.map((day) => {
                  const dayItems = previewGroups.get(day) ?? []
                  const notes = parseResult?.dayNotes.filter((n) => n.dayIndex === day) ?? []
                  const headerExtra = parseResult?.dayHeaderExtras[day]
                  const titleParts = [`Day ${day}`]
                  if (headerExtra) titleParts.push(headerExtra)
                  titleParts.push(`${dayItems.length} 筆行程`)

                  return (
                    <section key={day} className="itinerary-import-preview-day">
                      <h4 className="itinerary-import-preview-day-title">
                        {titleParts.join('｜')}
                      </h4>
                      {notes.length > 0 && (
                        <div className="itinerary-import-day-notes">
                          <p className="itinerary-import-day-notes-title">Day 備註</p>
                          <ul className="itinerary-import-day-notes-list">
                            {notes.map((note, idx) => (
                              <li key={idx}>{note.text}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <ul className="itinerary-import-preview-list">
                        {dayItems.map((item, idx) => (
                          <PreviewItem key={`${day}-${idx}`} item={item} />
                        ))}
                      </ul>
                    </section>
                  )
                })
              )}

              {sortedOutOfRangeDays.length > 0 && (
                <section className="itinerary-import-out-of-range">
                  <h4 className="itinerary-import-out-of-range-title">超出旅程天數（不會匯入）</h4>
                  {sortedOutOfRangeDays.map((day) => (
                    <div key={day} className="itinerary-import-preview-day">
                      <p className="itinerary-import-preview-day-title">Day {day}</p>
                      <ul className="itinerary-import-preview-list">
                        {(outOfRangeGroups.get(day) ?? []).map((item, idx) => (
                          <PreviewItem key={`oor-${day}-${idx}`} item={item} />
                        ))}
                      </ul>
                    </div>
                  ))}
                </section>
              )}

              {parseResult && parseResult.unparsedLines.length > 0 && (
                <section className="itinerary-import-unparsed">
                  <h4 className="itinerary-import-unparsed-title">
                    未自動匯入的內容（{parseResult.unparsedLines.length} 行）
                  </h4>
                  <p className="itinerary-import-unparsed-hint">
                    以下內容未自動匯入，可手動補充
                  </p>
                  <ul className="itinerary-import-unparsed-list">
                    {parseResult.unparsedLines.map((line, idx) => (
                      <li key={idx} className="itinerary-import-unparsed-line">
                        {line}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            {error && <p className="form-error-msg">{error}</p>}
            <div className="itinerary-import-actions">
              <Button
                fullWidth
                onClick={handleConfirm}
                disabled={submitting || !parseResult || parseResult.items.length === 0}
              >
                {submitting ? '匯入中...' : '確認匯入'}
              </Button>
              <Button
                fullWidth
                variant="ghost"
                onClick={() => {
                  setStep('input')
                  setError('')
                }}
                disabled={submitting}
              >
                返回修改
              </Button>
              <Button fullWidth variant="ghost" onClick={handleClose} disabled={submitting}>
                取消
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
