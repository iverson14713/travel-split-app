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
