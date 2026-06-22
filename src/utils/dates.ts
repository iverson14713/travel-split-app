export function getTripDays(
  startDate: string,
  endDate: string,
): { day: number; date: string; shortDate: string; weekday: string; label: string }[] {
  const start = parseLocalDate(normalizeDateString(startDate))
  const end = parseLocalDate(normalizeDateString(endDate))
  const days: { day: number; date: string; shortDate: string; weekday: string; label: string }[] = []

  const current = new Date(start)
  let dayNum = 1

  while (current <= end) {
    const dateStr = formatLocalDateString(current)
    const weekdayChar = ['日', '一', '二', '三', '四', '五', '六'][current.getDay()]
    const shortDate = `${current.getMonth() + 1}/${current.getDate()}`
    days.push({
      day: dayNum,
      date: dateStr,
      shortDate,
      weekday: `週${weekdayChar}`,
      label: `Day ${dayNum}（${shortDate} 週${weekdayChar}）`,
    })
    current.setDate(current.getDate() + 1)
    dayNum++
  }

  return days
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** Normalize trip dates to YYYY-MM-DD for safe string comparison. */
export function normalizeDateString(date: string | undefined | null): string {
  if (!date) return ''
  const trimmed = date.trim()
  const iso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (iso) return `${iso[1]}-${pad2(Number(iso[2]))}-${pad2(Number(iso[3]))}`
  const slash = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/)
  if (slash) return `${slash[1]}-${pad2(Number(slash[2]))}-${pad2(Number(slash[3]))}`
  return trimmed
}

function parseLocalDate(dateStr: string): Date {
  const normalized = normalizeDateString(dateStr)
  const [y, m, d] = normalized.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatLocalDateString(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

export function formatDateRange(startDate: string, endDate: string): string {
  const fmt = (d: string) => {
    const date = parseLocalDate(d)
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
  }
  return `${fmt(startDate)} – ${fmt(endDate)}`
}

export function addDaysToDateString(dateStr: string, days: number): string {
  const normalized = normalizeDateString(dateStr)
  const [y, m, d] = normalized.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  return formatLocalDateString(date)
}

export function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${y}年${m}月${d}日`
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${y}/${m}/${d} ${hh}:${mm}`
}
