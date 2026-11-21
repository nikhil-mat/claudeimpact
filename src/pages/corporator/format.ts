import type { BucketSet } from './types.ts'

export function formatInr(n: number): string {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`
  return '₹' + Math.round(n).toLocaleString('en-IN')
}

export function pct(x: number, dp = 0): string {
  return (x * 100).toFixed(dp) + '%'
}

export function largestRemainder(values: number[], total = 100): number[] {
  const sum = values.reduce((a, b) => a + b, 0)
  if (sum <= 0) return values.map(() => 0)
  const raw = values.map((v) => (v / sum) * total)
  const out = raw.map(Math.floor)
  let left = total - out.reduce((a, b) => a + b, 0)
  const order = raw.map((r, i) => ({ i, f: r - Math.floor(r) })).sort((a, b) => b.f - a.f || a.i - b.i)
  for (const { i } of order) {
    if (left <= 0) break
    out[i]++
    left--
  }
  return out
}

export function median(xs: number[]): number {
  if (xs.length === 0) return 0
  const s = [...xs].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

function cell(v: unknown): string {
  const s = Array.isArray(v) ? v.join('|') : v == null ? '' : String(v)
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

export function toCsv(rows: object[], columns: { key: string; label: string }[]): string {
  const lines = [columns.map((c) => cell(c.label)).join(',')]
  for (const r of rows) {
    lines.push(columns.map((c) => cell((r as Record<string, unknown>)[c.key])).join(','))
  }
  return lines.join('\r\n')
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function headline(
  w: { ward_code: string; spend_inr: number; budget_inr: number; per100: BucketSet },
  medianHeld: number,
): string {
  const p = w.per100
  const held = largestRemainder([p.twin, p.over, p.fail, p.held])[3]
  const spent =
    w.spend_inr > w.budget_inr
      ? `spent ${formatInr(w.spend_inr)} against a ${formatInr(w.budget_inr)} budget.`
      : `spent ${formatInr(w.spend_inr)} of its ${formatInr(w.budget_inr)} budget.`
  return `Ward ${w.ward_code} ${spent} ₹${held} of every ₹100 went on repairs that held up. Ward median: ₹${Math.round(medianHeld)}.`
}

export function heldPer100(per100: BucketSet): number {
  return largestRemainder([per100.twin, per100.over, per100.fail, per100.held])[3]
}

export type HeadlinePart = { text: string; bad?: boolean; sub?: boolean }

// Same words as headline(), split so the view can colour the bad money figures.
export function headlineParts(
  w: { ward_code: string; spend_inr: number; budget_inr: number; per100: BucketSet },
  medianHeld: number,
): HeadlinePart[] {
  const over = w.spend_inr > w.budget_inr
  const held = heldPer100(w.per100)
  return [
    { text: `Ward ${w.ward_code} spent ` },
    { text: formatInr(w.spend_inr), bad: over },
    { text: over ? ' against a ' : ' of its ' },
    { text: formatInr(w.budget_inr) },
    { text: ' budget.' },
    { text: ` ₹${held} of every ₹100 went on repairs that held up. Ward median: ₹${Math.round(medianHeld)}.`, sub: true },
  ]
}
