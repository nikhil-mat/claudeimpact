import { useState } from 'react'
import type { Bucket, WardSummary, WorkOrder } from './types.ts'
import { EvidenceDrawer, SourceChip } from './Evidence.tsx'
import { formatInr, largestRemainder } from './format.ts'

const SEGS: { key: Bucket; label: string; field: 'b_twin' | 'b_over' | 'b_fail' | 'b_held' }[] = [
  { key: 'held', label: 'held up', field: 'b_held' },
  { key: 'fail', label: 'failed within 30 days', field: 'b_fail' },
  { key: 'over', label: 'overbilled', field: 'b_over' },
  { key: 'twin', label: 'billed twice', field: 'b_twin' },
]
const SMALL = 10 // segments under this share of the bar get their label in the end cluster

export default function RupeeBar({
  ward,
  medians,
  workOrders,
}: {
  ward: WardSummary
  medians: { dlp_review_per100: number }
  workOrders: WorkOrder[]
}) {
  const [sel, setSel] = useState<Bucket>('held')
  const p = ward.per100
  const labels = largestRemainder([p.twin, p.over, p.fail, p.held])
  const l100: Record<Bucket, number> = { twin: labels[0], over: labels[1], fail: labels[2], held: labels[3] }
  const shown = SEGS.map((s) => ({ ...s, raw: p[s.key], label100: l100[s.key] })).filter((s) => s.raw > 0)
  const active = shown.find((s) => s.key === sel) ?? shown[0]
  const rows = workOrders.filter((w) => w[active.field] > 0)
  const dlp = workOrders.filter((w) => w.flag_dlp_review)
  const big = shown.filter((s) => s.raw >= SMALL)
  const small = shown.filter((s) => s.raw < SMALL)
  const smallPct = small.reduce((a, s) => a + s.raw, 0)
  const legendItem = (s: (typeof shown)[number]) => (
    <li key={s.key} className={s.key === 'twin' ? 'cv-lg-bad' : undefined}>
      <span className="cv-lg-n cv-num">₹{s.label100}</span> {s.label} ·{' '}
      <span className="cv-num">{formatInr(ward.buckets[s.key])}</span>
    </li>
  )
  const heldDrawer = (
    <EvidenceDrawer
      label={active.label.charAt(0).toUpperCase() + active.label.slice(1)}
      rows={rows}
      columns={[
        { key: 'id', label: 'Work order' },
        { key: 'road_name', label: 'Road' },
        { key: 'contractor_name', label: 'Contractor' },
        { key: 'repair_method', label: 'Method' },
        { key: 'cost_inr', label: 'Cost', inr: true },
        { key: 'expected_inr', label: 'Expected', inr: true },
        { key: active.field, label: 'In this segment', inr: true },
      ]}
      filename={`ward-${ward.ward_code}-${active.key}.csv`}
      sumKey={active.field}
    />
  )
  return (
    <section className="cv-sheet cv-bar-sheet">
      <div className="cv-head">
        <h3>Where each ₹100 went</h3>
        <SourceChip
          files={['work_orders.csv', 'rate_card.csv', 'roads.csv']}
          columns={['cost_inr', 'standard_rate_inr', 'area_sqm', 'reopened_within_30d', 'linked_complaint_ids', 'under_dlp']}
          rule="Each work order is split in priority order: billed twice (whole cost of an unlinked twin) → overbilled (cost − 1.3 × expected, only when ratio ≥ 1.4) → failed within 30 days → held up. Segments total the ward's spend, shown per ₹100 with largest-remainder rounding."
        />
      </div>
      <div className="cv-bar" role="group" aria-label="Where each 100 rupees went">
        {shown.map((s) => (
          <button
            key={s.key}
            type="button"
            className={`seg-${s.key}${s.key === active.key ? ' sel' : ''}`}
            style={{ flexGrow: s.raw, flexBasis: 0 }}
            onClick={() => setSel(s.key)}
            aria-pressed={s.key === active.key}
            aria-label={`₹${s.label100} ${s.label}, ${formatInr(ward.buckets[s.key])}`}
            title={`${formatInr(ward.buckets[s.key])} ${s.label}`}
          >
            <span className="cv-num">{s.raw >= 4 ? `₹${s.label100}` : ''}</span>
          </button>
        ))}
      </div>
      <ul className="cv-legend">
        {big.map((s, i) => (
          <li key={s.key} className="cv-lg-cell" style={{ flexGrow: s.raw, flexBasis: 0 }}>
            <ul>
              {legendItem(s)}
              {i === 0 && <li className="cv-lg-ev">{heldDrawer}</li>}
            </ul>
          </li>
        ))}
        {small.length > 0 && (
          <li className="cv-lg-cell cv-lg-end" style={{ flexBasis: `max(${smallPct}%, 13rem)`, flexGrow: 0 }}>
            <ul>{small.map(legendItem)}</ul>
          </li>
        )}
      </ul>
      {big.length === 0 && heldDrawer}
      <div className="cv-dlp">
        <span className="cv-stamp">Needs review</span>
        <span>
          of which {formatInr(ward.dlp_review_inr)} was paid for surface repairs on roads still under DLP: needs review{' '}
          <span className="cv-muted cv-num">
            (₹{ward.dlp_review_per100.toFixed(0)} per ₹100; ward median ₹{medians.dlp_review_per100.toFixed(0)})
          </span>
        </span>
        <EvidenceDrawer
          label="DLP review"
          rows={dlp}
          columns={[
            { key: 'id', label: 'Work order' },
            { key: 'road_name', label: 'Road' },
            { key: 'contractor_name', label: 'Contractor' },
            { key: 'repair_method', label: 'Method' },
            { key: 'cost_inr', label: 'Cost', inr: true },
          ]}
          filename={`ward-${ward.ward_code}-dlp-review.csv`}
          sumKey="cost_inr"
        />
      </div>
    </section>
  )
}
