export function getTripDays(
  startDate: string,
  endDate: string,
): { day: number; date: string; shortDate: string; weekday: string; label: string }[] {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const days: { day: number; date: string; shortDate: string; weekday: string; label: string }[] = []

  const current = new Date(start)
  let dayNum = 1

  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0]
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

export function formatDateRange(startDate: string, endDate: string): string {
  const fmt = (d: string) => {
    const date = new Date(d)
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
  }
  return `${fmt(startDate)} – ${fmt(endDate)}`
}

export function addDaysToDateString(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  const yy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
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
