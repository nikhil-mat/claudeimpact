import type { Accident, Complaint, ContextWeek } from '../types.ts'

export type Stage = 'received' | 'duplicates' | 'resolved' | 'open' | 'rejected' | 'forwarded'

export const STAGES: { key: Stage; label: string }[] = [
  { key: 'received', label: 'Received' },
  { key: 'duplicates', label: 'Duplicates' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'open', label: 'Open' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'forwarded', label: 'Forwarded' },
]

export function inStage(c: Complaint, s: Stage): boolean {
  switch (s) {
    case 'received':
      return true
    case 'duplicates':
      return c.status === 'Closed - Duplicate'
    case 'resolved':
      return c.status === 'Resolved'
    case 'open':
      return c.is_open
    case 'rejected':
      return c.status.startsWith('Rejected')
    case 'forwarded':
      return c.status.startsWith('Forwarded')
  }
}

export function topCounts<T>(rows: T[], key: (r: T) => string, n = 5): [string, number][] {
  const m = new Map<string, number>()
  for (const r of rows) {
    const k = key(r).trim() || '(blank)'
    m.set(k, (m.get(k) ?? 0) + 1)
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n)
}

export function dayNumber(ts: string): number {
  return Math.floor(Date.parse(ts.slice(0, 10) + 'T00:00:00Z') / 86400000)
}

export function maxReceived(all: Complaint[]): string {
  return all.reduce((m, c) => (c.received_at > m ? c.received_at : m), '')
}

export function causeSeverity(rows: Accident[]) {
  const m = new Map<string, Record<'Minor' | 'Grievous' | 'Fatal', number>>()
  for (const a of rows) {
    const r = m.get(a.cause) ?? { Minor: 0, Grievous: 0, Fatal: 0 }
    r[a.severity] += 1
    m.set(a.cause, r)
  }
  return [...m.entries()]
    .map(([cause, v]) => ({ cause, ...v, total: v.Minor + v.Grievous + v.Fatal }))
    .sort((a, b) => b.total - a.total || a.cause.localeCompare(b.cause))
}

export function per100(count: number, base: number): string {
  return base > 0 ? ((100 * count) / base).toFixed(1) : 'n/a'
}

export type WeekRow = {
  week_start: string
  complaints: number
  santacruz_mm: number
  colaba_mm: number
  red_alert_days: string
  big_tide_days: string
}

export function weekRows(weeks: ContextWeek[], ward: string): WeekRow[] {
  return weeks.map((w) => ({
    week_start: w.week_start,
    complaints: w.complaints[ward] ?? 0,
    santacruz_mm: w.santacruz_mm,
    colaba_mm: w.colaba_mm,
    red_alert_days: w.red_alert_days.join('|'),
    big_tide_days: w.big_tide_days.join('|'),
  }))
}
