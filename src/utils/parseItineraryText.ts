import { getTripDays } from './dates'

export interface ParsedItineraryItem {
  dayIndex: number
  time: string
  title: string
  location: string
  note: string
}

export interface ParsedDayNote {
  dayIndex: number
  text: string
}

export interface ParseItineraryTextResult {
  items: ParsedItineraryItem[]
  outOfRangeItems: ParsedItineraryItem[]
  unparsedLines: string[]
  dayNotes: ParsedDayNote[]
  /** Day 標題列的補充文字，例如「9/25 五：抵達廈門＋中山路」 */
  dayHeaderExtras: Record<number, string>
}

const PERIOD_TIME: Record<string, string> = {
  上午: '09:00',
  中午: '12:00',
  下午: '14:00',
  晚上: '18:00',
}

const TIMELESS_NOTE = '未指定時間'
const FALLBACK_TITLE = '待整理行程'
const TIME_PATTERN = /(\d{1,2}:\d{2})/g
const SEGMENT_DELIMITERS = /[，,、。\r\n]+/u

const META_PREFIX =
  /^(這天重點|住宿建議|提醒|建議方式|小提醒|預算|注意事項|交通建議)\s*[:：]/u

const STANDALONE_PERIOD = /^(上午|中午|下午|晚上)\s*$/u

const ACTIVITY_KEYWORDS =
  /早餐|午餐|晚餐|飯店|機場|碼頭|搭船|搭車|景點|逛街|拍照|休息|夜市|博物館|寺|廟|公園|溫泉|海鮮|小吃|步行|入境|行李|叫車|出發|抵達|轉機|海邊|沙灘|纜車|動物園|植物園|商圈|老街|市場/u

const TIME_DASH = '[-–—－~～]'

const CN_DIGIT: Record<string, number> = {
  零: 0,
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function normalizeTime(raw: string): string {
  const m = raw.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return ''
  return `${pad2(Number(m[1]))}:${m[2]}`
}

function parseChineseNumber(text: string): number | null {
  const trimmed = text.trim()
  if (/^\d+$/.test(trimmed)) return Number(trimmed)
  if (trimmed === '十') return 10
  if (trimmed.startsWith('十')) {
    const rest = trimmed.slice(1)
    return rest ? 10 + (CN_DIGIT[rest] ?? 0) : 10
  }
  if (trimmed.endsWith('十')) {
    const head = trimmed.slice(0, -1)
    return (CN_DIGIT[head] ?? 0) * 10
  }
  if (trimmed.includes('十')) {
    const [a, b] = trimmed.split('十')
    const tens = a ? (CN_DIGIT[a] ?? 0) : 1
    const ones = b ? (CN_DIGIT[b] ?? 0) : 0
    return tens * 10 + ones
  }
  return CN_DIGIT[trimmed] ?? null
}

interface DayHeaderParseResult {
  dayIndex: number
  displayExtra?: string
}

function tryParseDayHeader(line: string): DayHeaderParseResult | null {
  const trimmed = line.trim()

  const extended = trimmed.match(/^Day\s*(\d+)\s*[|｜]\s*(.+)$/i)
  if (extended) {
    const dayIndex = Number(extended[1])
    if (dayIndex > 0) {
      return { dayIndex, displayExtra: extended[2].trim() }
    }
  }

  const patterns: Array<{ regex: RegExp; chinese?: boolean }> = [
    { regex: /^Day\s*(\d+)\s*$/i },
    { regex: /^D\s*(\d+)\s*$/i },
    { regex: /^D(\d+)\s*$/i },
    { regex: /^第\s*(\d+)\s*天\s*$/ },
    { regex: /^第([一二三四五六七八九十百千]+)天\s*$/, chinese: true },
  ]

  for (const { regex, chinese } of patterns) {
    const match = trimmed.match(regex)
    if (!match) continue
    const dayIndex = chinese ? parseChineseNumber(match[1]) : Number(match[1])
    if (dayIndex != null && dayIndex > 0) {
      return { dayIndex }
    }
  }

  return null
}

function toDateString(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`
}

function findDayByDate(
  tripDays: ReturnType<typeof getTripDays>,
  year: number,
  month: number,
  day: number,
): number | null {
  const dateStr = toDateString(year, month, day)
  return tripDays.find((d) => d.date === dateStr)?.day ?? null
}

function tryParseDateHeader(
  line: string,
  tripDays: ReturnType<typeof getTripDays>,
  tripStartDate: string,
): { dayIndex: number; displayExtra?: string } | null {
  const trimmed = line.trim()
  const startYear = new Date(tripStartDate).getFullYear()

  const dateWithExtra = trimmed.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})\s*(?:[周週]?[一二三四五六日天])?\s*[:：]\s*(.+)$/u,
  )
  if (dateWithExtra) {
    const dayIndex = findDayByDate(
      tripDays,
      Number(dateWithExtra[1]),
      Number(dateWithExtra[2]),
      Number(dateWithExtra[3]),
    )
    if (dayIndex != null) {
      return { dayIndex, displayExtra: dateWithExtra[4].trim() }
    }
  }

  const shortWithExtra = trimmed.match(
    /^(\d{1,2})\/(\d{1,2})\s*(?:[周週]?[一二三四五六日天])?\s*[:：]\s*(.+)$/u,
  )
  if (shortWithExtra) {
    const dayIndex = findDayByDate(
      tripDays,
      startYear,
      Number(shortWithExtra[1]),
      Number(shortWithExtra[2]),
    )
    if (dayIndex != null) {
      return { dayIndex, displayExtra: shortWithExtra[3].trim() }
    }
  }

  let match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s*[周週]?[一二三四五六日天])?\s*$/u)
  if (match) {
    const dayIndex = findDayByDate(tripDays, Number(match[1]), Number(match[2]), Number(match[3]))
    if (dayIndex != null) return { dayIndex }
  }

  match = trimmed.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})(?:\s*[周週]?[一二三四五六日天])?\s*$/u)
  if (match) {
    const dayIndex = findDayByDate(tripDays, Number(match[1]), Number(match[2]), Number(match[3]))
    if (dayIndex != null) return { dayIndex }
  }

  match = trimmed.match(/^(\d{1,2})\/(\d{1,2})(?:\s*[周週]?[一二三四五六日天])?\s*$/u)
  if (match) {
    const dayIndex = findDayByDate(tripDays, startYear, Number(match[1]), Number(match[2]))
    if (dayIndex != null) return { dayIndex }
  }

  return null
}

function isTableHeaderLine(line: string): boolean {
  const compact = line.replace(/[\s\u3000\t]+/g, '')
  return compact === '時間行程' || compact === '時間' || compact === '行程'
}

function shouldSilentlySkip(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) return true
  if (isTableHeaderLine(trimmed)) return true
  if (STANDALONE_PERIOD.test(trimmed)) return true
  if (META_PREFIX.test(trimmed)) return true
  if (/^#{1,6}\s/.test(trimmed)) return true
  return false
}

function splitTableColumns(line: string): [string, string] | null {
  const tabParts = line.split('\t').map((s) => s.trim()).filter(Boolean)
  if (tabParts.length >= 2) {
    return [tabParts[0], tabParts.slice(1).join(' ')]
  }

  const multiSpace = line.split(/[\u3000 ]{2,}/).map((s) => s.trim()).filter(Boolean)
  if (multiSpace.length >= 2) {
    return [multiSpace[0], multiSpace.slice(1).join(' ')]
  }

  return null
}

function parseTimeColumn(timeCol: string): { time: string; timeNote: string } {
  const trimmed = timeCol.trim()
  if (!trimmed) return { time: '', timeNote: '' }

  if (PERIOD_TIME[trimmed]) {
    return { time: PERIOD_TIME[trimmed], timeNote: '' }
  }

  const afterMatch = trimmed.match(/^(\d{1,2}:\d{2})\s*之後\s*$/u)
  if (afterMatch) {
    return { time: normalizeTime(afterMatch[1]), timeNote: '之後' }
  }

  const rangeMatch = trimmed.match(
    new RegExp(`^(\\d{1,2}:\\d{2})\\s*${TIME_DASH}\\s*(\\d{1,2}:\\d{2})\\s*$`, 'u'),
  )
  if (rangeMatch) {
    const start = normalizeTime(rangeMatch[1])
    const end = normalizeTime(rangeMatch[2])
    return { time: start, timeNote: `${start}–${end}` }
  }

  const singleMatch = trimmed.match(/^(\d{1,2}:\d{2})\s*$/u)
  if (singleMatch) {
    return { time: normalizeTime(singleMatch[1]), timeNote: '' }
  }

  const periodInline = trimmed.match(/^(上午|中午|下午|晚上)\s*$/u)
  if (periodInline) {
    return { time: PERIOD_TIME[periodInline[1]] ?? '', timeNote: '' }
  }

  return { time: '', timeNote: '' }
}

function splitContentSegments(text: string): string[] {
  if (text.includes('｜') || text.includes('|')) {
    return text.split(/[|｜]/).map((s) => s.trim()).filter(Boolean)
  }
  if (/\s+[-–—]\s+/.test(text)) {
    return text.split(/\s+[-–—]\s+/).map((s) => s.trim()).filter(Boolean)
  }
  return [text.trim()].filter(Boolean)
}

function parseTitleLocationNote(segments: string[]): Pick<ParsedItineraryItem, 'title' | 'location' | 'note'> {
  if (segments.length === 0) {
    return { title: '', location: '', note: '' }
  }

  let title = segments[0]
  let location = ''
  let note = ''

  const colonIdx = title.search(/[:：]/u)
  if (colonIdx >= 0 && segments.length === 1) {
    const main = title.slice(0, colonIdx).trim()
    const rest = title.slice(colonIdx + 1).trim()
    title = main
    note = rest
  } else if (segments.length >= 2) {
    location = segments[1]
    if (segments.length > 2) {
      note = segments.slice(2).join(' · ')
    }
  }

  return { title, location, note }
}

function mergeNotes(...parts: Array<string | undefined>): string {
  return parts.map((p) => p?.trim()).filter(Boolean).join(' · ')
}

function finalizeParsedItem(
  time: string,
  title: string,
  location: string,
  note: string,
  timeNote?: string,
): Omit<ParsedItineraryItem, 'dayIndex'> {
  const mergedNote = time
    ? mergeNotes(timeNote, note)
    : mergeNotes(TIMELESS_NOTE, timeNote, note)

  return {
    time,
    title,
    location,
    note: mergedNote,
  }
}

function buildItineraryItem(
  timeCol: string,
  titleText: string,
): Omit<ParsedItineraryItem, 'dayIndex'> | null {
  const { time, timeNote } = parseTimeColumn(timeCol)
  const segments = splitContentSegments(titleText)
  const { title, location, note } = parseTitleLocationNote(segments)
  if (!title) return null

  return finalizeParsedItem(time, title, location, note, timeNote)
}

function tryParseTableRow(line: string): Omit<ParsedItineraryItem, 'dayIndex'> | null {
  const columns = splitTableColumns(line)
  if (!columns) return null
  return buildItineraryItem(columns[0], columns[1])
}

function tryParseItineraryLine(line: string): Omit<ParsedItineraryItem, 'dayIndex'> | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  const tableRow = tryParseTableRow(trimmed)
  if (tableRow) return tableRow

  const periodMatch = trimmed.match(/^(上午|中午|下午|晚上)\s*[:：]\s*(.+)$/u)
  if (periodMatch) {
    const segments = splitContentSegments(periodMatch[2])
    const { title, location, note } = parseTitleLocationNote(segments)
    if (!title) return null
    return finalizeParsedItem(PERIOD_TIME[periodMatch[1]] ?? '', title, location, note)
  }

  const afterTitleMatch = trimmed.match(/^(\d{1,2}:\d{2})\s*之後\s+(.+)$/u)
  if (afterTitleMatch) {
    const segments = splitContentSegments(afterTitleMatch[2])
    const { title, location, note } = parseTitleLocationNote(segments)
    if (!title) return null
    return finalizeParsedItem(normalizeTime(afterTitleMatch[1]), title, location, note, '之後')
  }

  const rangeThenTitle = trimmed.match(
    new RegExp(
      `^(\\d{1,2}:\\d{2})\\s*${TIME_DASH}\\s*(\\d{1,2}:\\d{2})(?:\\s+|[|｜]|\\s*[:：]\\s*)(.+)$`,
      'u',
    ),
  )
  if (rangeThenTitle) {
    const start = normalizeTime(rangeThenTitle[1])
    const end = normalizeTime(rangeThenTitle[2])
    const segments = splitContentSegments(rangeThenTitle[3])
    const { title, location, note } = parseTitleLocationNote(segments)
    if (!title) return null
    return finalizeParsedItem(start, title, location, note, `${start}–${end}`)
  }

  const clockMatch = trimmed.match(
    new RegExp(
      `^(\\d{1,2}:\\d{2})(?:\\s*${TIME_DASH}\\s*\\d{1,2}:\\d{2})?(?:\\s*|[|｜]|${TIME_DASH}\\s*|\\s*[:：]\\s*)(.+)$`,
      'u',
    ),
  )
  if (clockMatch) {
    const titlePart = clockMatch[2].trim()
    const extraTimes = titlePart.match(TIME_PATTERN)
    if (extraTimes && extraTimes.length > 0) return null

    const segments = splitContentSegments(titlePart)
    const { title, location, note } = parseTitleLocationNote(segments)
    if (!title) return null
    return finalizeParsedItem(normalizeTime(clockMatch[1]), title, location, note)
  }

  const simpleClock = trimmed.match(/^(\d{1,2}:\d{2})\s+(.+)$/u)
  if (simpleClock) {
    const segments = splitContentSegments(simpleClock[2])
    const { title, location, note } = parseTitleLocationNote(segments)
    if (!title) return null
    return finalizeParsedItem(normalizeTime(simpleClock[1]), title, location, note)
  }

  return null
}

function looksLikeActivity(line: string): boolean {
  const trimmed = line.trim()
  if (trimmed.length < 3) return false
  if (ACTIVITY_KEYWORDS.test(trimmed)) return true
  if (/[、／/→＋+]/.test(trimmed) && /[\u4e00-\u9fff]/.test(trimmed)) return true
  return false
}

function buildTimelessItem(line: string): Omit<ParsedItineraryItem, 'dayIndex'> {
  return {
    time: '',
    title: line.trim(),
    location: '',
    note: TIMELESS_NOTE,
  }
}

function isInTripRange(dayIndex: number, maxDay: number): boolean {
  return dayIndex >= 1 && dayIndex <= maxDay
}

function pushItem(
  item: ParsedItineraryItem,
  items: ParsedItineraryItem[],
  outOfRangeItems: ParsedItineraryItem[],
  maxDay: number,
): void {
  if (isInTripRange(item.dayIndex, maxDay)) {
    items.push(item)
  } else {
    outOfRangeItems.push(item)
  }
}

function shouldListAsUnparsed(line: string, currentDayIndex: number | null): boolean {
  const trimmed = line.trim()
  if (!trimmed || shouldSilentlySkip(trimmed)) return false
  if (currentDayIndex != null) return true
  if (looksLikeActivity(trimmed)) return true
  if (/^\d{1,2}:\d{2}/.test(trimmed)) return true
  if (/^(Day|D)\s*\d+/i.test(trimmed)) return true
  if (/^第\s*\d+\s*天/.test(trimmed) || /^第[一二三四五六七八九十]+天/.test(trimmed)) {
    return true
  }
  return trimmed.length >= 10
}

function stripEdgeDelimiters(text: string): string {
  return text.replace(/^[，,、。\s]+|[，,、。\s]+$/gu, '').trim()
}

function splitTextSegments(text: string): string[] {
  return text
    .split(SEGMENT_DELIMITERS)
    .map((segment) => stripEdgeDelimiters(segment))
    .filter(Boolean)
}

function countTimeMarkers(text: string): number {
  return [...text.matchAll(TIME_PATTERN)].length
}

function parseChunkWithTimes(chunk: string): Omit<ParsedItineraryItem, 'dayIndex'>[] {
  const trimmed = stripEdgeDelimiters(chunk)
  if (!trimmed) return []

  if (countTimeMarkers(trimmed) <= 1) {
    const lineParsed = tryParseItineraryLine(trimmed)
    if (lineParsed?.title) return [lineParsed]
  }

  const matches = [...trimmed.matchAll(TIME_PATTERN)]
  if (matches.length === 0) {
    return [buildTimelessItem(trimmed)]
  }

  const results: Omit<ParsedItineraryItem, 'dayIndex'>[] = []

  const firstMatch = matches[0]
  if (firstMatch.index != null && firstMatch.index > 0) {
    const before = stripEdgeDelimiters(trimmed.slice(0, firstMatch.index))
    if (before) results.push(buildTimelessItem(before))
  }

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]
    const time = normalizeTime(match[1])
    const startIdx = (match.index ?? 0) + match[0].length
    const endIdx = i + 1 < matches.length ? (matches[i + 1].index ?? trimmed.length) : trimmed.length
    const title = stripEdgeDelimiters(trimmed.slice(startIdx, endIdx))
    if (title) {
      results.push(finalizeParsedItem(time, title, '', ''))
    }
  }

  return results
}

function fallbackParseText(inputText: string, defaultDayIndex: number): ParsedItineraryItem[] {
  const items: ParsedItineraryItem[] = []

  for (const segment of splitTextSegments(inputText)) {
    for (const parsed of parseChunkWithTimes(segment)) {
      if (!parsed.title) continue
      items.push({ dayIndex: defaultDayIndex, ...parsed })
    }
  }

  return items
}

function buildFallbackItem(inputText: string, defaultDayIndex: number): ParsedItineraryItem {
  const trimmed = inputText.trim()
  return {
    dayIndex: defaultDayIndex,
    time: '',
    title: FALLBACK_TITLE,
    location: '',
    note: trimmed ? `${TIMELESS_NOTE} · ${trimmed}` : TIMELESS_NOTE,
  }
}

/**
 * Lenient rule-based itinerary text parser. Future AI / file import can reuse this signature.
 */
export function parseItineraryText(
  inputText: string,
  tripStartDate: string,
  tripEndDate: string,
): ParseItineraryTextResult {
  const tripDays = getTripDays(tripStartDate, tripEndDate)
  const maxDay = tripDays.length
  const items: ParsedItineraryItem[] = []
  const outOfRangeItems: ParsedItineraryItem[] = []
  const unparsedLines: string[] = []
  const dayNotes: ParsedDayNote[] = []
  const dayHeaderExtras: Record<number, string> = {}

  let currentDayIndex: number | null = null

  const lines = inputText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  for (const line of lines) {
    if (shouldSilentlySkip(line)) {
      continue
    }

    const dayHeader = tryParseDayHeader(line)
    if (dayHeader) {
      currentDayIndex = dayHeader.dayIndex
      if (dayHeader.displayExtra) {
        dayHeaderExtras[dayHeader.dayIndex] = dayHeader.displayExtra
      }
      continue
    }

    const dayFromDate = tryParseDateHeader(line, tripDays, tripStartDate)
    if (dayFromDate) {
      currentDayIndex = dayFromDate.dayIndex
      if (dayFromDate.displayExtra) {
        dayHeaderExtras[dayFromDate.dayIndex] = dayFromDate.displayExtra
      }
      continue
    }

    const parsed = tryParseItineraryLine(line)
    if (parsed?.title) {
      const dayIdx = currentDayIndex ?? 1
      pushItem(
        {
          dayIndex: dayIdx,
          ...parsed,
        },
        items,
        outOfRangeItems,
        maxDay,
      )
      continue
    }

    const chunkItems = splitTextSegments(line).flatMap((segment) => parseChunkWithTimes(segment))
    if (chunkItems.length > 0) {
      const dayIdx = currentDayIndex ?? 1
      for (const chunkItem of chunkItems) {
        pushItem(
          {
            dayIndex: dayIdx,
            ...chunkItem,
          },
          items,
          outOfRangeItems,
          maxDay,
        )
      }
      continue
    }

    if (currentDayIndex != null && looksLikeActivity(line)) {
      pushItem(
        {
          dayIndex: currentDayIndex,
          ...buildTimelessItem(line),
        },
        items,
        outOfRangeItems,
        maxDay,
      )
      continue
    }

    if (shouldListAsUnparsed(line, currentDayIndex)) {
      unparsedLines.push(line)
    }
  }

  if (items.length === 0 && outOfRangeItems.length === 0) {
    const defaultDay = currentDayIndex ?? 1
    const fallbackItems = fallbackParseText(inputText, defaultDay)
    for (const item of fallbackItems) {
      pushItem(item, items, outOfRangeItems, maxDay)
    }
  }

  if (items.length === 0 && outOfRangeItems.length === 0) {
    const defaultDay = currentDayIndex ?? 1
    pushItem(buildFallbackItem(inputText, defaultDay), items, outOfRangeItems, maxDay)
  }

  return { items, outOfRangeItems, unparsedLines, dayNotes, dayHeaderExtras }
}
