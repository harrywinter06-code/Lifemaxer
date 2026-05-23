// All "dates" in the DB are ISO date strings YYYY-MM-DD in local time.
// "today" rolls over at local midnight.

export function todayISO(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + days)
  return todayISO(dt)
}

export function daysBetween(aISO: string, bISO: string): number {
  const a = new Date(aISO + 'T00:00:00')
  const b = new Date(bISO + 'T00:00:00')
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

export function weeksSince(startISO: string, now = new Date()): number {
  return Math.floor(daysBetween(startISO, todayISO(now)) / 7)
}

export function nowMinutes(now = new Date()): number {
  return now.getHours() * 60 + now.getMinutes()
}

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
