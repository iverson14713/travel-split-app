import { getTripDays } from './dates'

export interface ParsedItineraryItem {
  dayIndex: number
  time: string
  title: string
  location: string
  note: string
}

export interface ParseItineraryTextResult {
  items: ParsedItineraryItem[]
  outOfRangeItems: ParsedItineraryItem[]
  unparsedLines: string[]
}

const PERIOD_TIME: Record<string, string> = {
  上午: '09:00',
  中午: '12:00',
  下午: '14:00',
  晚上: '18:00',
}

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

function tryParseDayHeader(line: string): number | null {
  const trimmed = line.trim()
  const patterns: RegExp[] = [
    /^Day\s*(\d+)\s*$/i,
    /^D\s*(\d+)\s*$/i,
    /^第\s*(\d+)\s*天\s*$/,
    /^第([一二三四五六七八九十百千]+)天\s*$/,
  ]

  for (const pattern of patterns) {
    const match = trimmed.match(pattern)
    if (!match) continue
    if (pattern.source.includes('[一二')) {
      return parseChineseNumber(match[1])
    }
    return Number(match[1])
  }

  return null
}

function toDateString(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`
}

function tryParseDateHeader(
  line: string,
  tripDays: ReturnType<typeof getTripDays>,
  tripStartDate: string,
): number | null {
  const trimmed = line.trim()
  const startYear = new Date(tripStartDate).getFullYear()

  let match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (match) {
    const dateStr = toDateString(Number(match[1]), Number(match[2]), Number(match[3]))
    return tripDays.find((d) => d.date === dateStr)?.day ?? null
  }

  match = trimmed.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/)
  if (match) {
    const dateStr = toDateString(Number(match[1]), Number(match[2]), Number(match[3]))
    return tripDays.find((d) => d.date === dateStr)?.day ?? null
  }

  match = trimmed.match(/^(\d{1,2})\/(\d{1,2})$/)
  if (match) {
    const dateStr = toDateString(startYear, Number(match[1]), Number(match[2]))
    return tripDays.find((d) => d.date === dateStr)?.day ?? null
  }

  return null
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

  const colonIdx = title.search(/[:：]/)
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

function tryParseItineraryLine(line: string): Omit<ParsedItineraryItem, 'dayIndex'> | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  const periodMatch = trimmed.match(/^(上午|中午|下午|晚上)[：:\s]\s*(.+)$/)
  if (periodMatch) {
    const segments = splitContentSegments(periodMatch[2])
    const { title, location, note } = parseTitleLocationNote(segments)
    if (!title) return null
    return {
      time: PERIOD_TIME[periodMatch[1]] ?? '',
      title,
      location,
      note,
    }
  }

  const clockMatch = trimmed.match(
    /^(\d{1,2}:\d{2})(?:\s*[-–—]\s*\d{1,2}:\d{2})?(?:\s+|[|｜]|[-–—]\s*|\s*[:：]\s*)(.+)$/,
  )
  if (clockMatch) {
    const segments = splitContentSegments(clockMatch[2])
    const { title, location, note } = parseTitleLocationNote(segments)
    if (!title) return null
    return {
      time: normalizeTime(clockMatch[1]),
      title,
      location,
      note,
    }
  }

  const simpleClock = trimmed.match(/^(\d{1,2}:\d{2})\s+(.+)$/)
  if (simpleClock) {
    const segments = splitContentSegments(simpleClock[2])
    const { title, location, note } = parseTitleLocationNote(segments)
    if (!title) return null
    return {
      time: normalizeTime(simpleClock[1]),
      title,
      location,
      note,
    }
  }

  return null
}

function isInTripRange(dayIndex: number, maxDay: number): boolean {
  return dayIndex >= 1 && dayIndex <= maxDay
}

/**
 * Rule-based itinerary text parser. Future AI / file import can reuse this signature.
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

  let currentDayIndex: number | null = null

  const lines = inputText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  for (const line of lines) {
    const dayFromHeader = tryParseDayHeader(line)
    if (dayFromHeader != null && dayFromHeader > 0) {
      currentDayIndex = dayFromHeader
      continue
    }

    const dayFromDate = tryParseDateHeader(line, tripDays, tripStartDate)
    if (dayFromDate != null) {
      currentDayIndex = dayFromDate
      continue
    }

    const parsed = tryParseItineraryLine(line)
    if (!parsed || !parsed.title) {
      unparsedLines.push(line)
      continue
    }

    if (currentDayIndex == null) {
      unparsedLines.push(line)
      continue
    }

    const item: ParsedItineraryItem = {
      dayIndex: currentDayIndex,
      ...parsed,
    }

    if (isInTripRange(item.dayIndex, maxDay)) {
      items.push(item)
    } else {
      outOfRangeItems.push(item)
    }
  }

  return { items, outOfRangeItems, unparsedLines }
}
