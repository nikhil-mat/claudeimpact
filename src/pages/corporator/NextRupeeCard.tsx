import type { NextRupeeFile, NextRupeeRoad, WardSummary } from './types.ts'
import { useJson } from './data.ts'
import { EvidenceDrawer, SourceChip } from './Evidence.tsx'
import { formatInr, pct } from './format.ts'

const FILES = [
  'complaints.csv', 'localities.csv', 'work_orders.csv', 'flood_hotspots.csv', 'traffic.csv',
  'accidents.csv', 'facilities.csv', 'rate_card.csv', 'roads.csv',
]
const COLS: { key: keyof NextRupeeRoad & string; label: string; inr?: boolean }[] = [
  { key: 'road_id', label: 'Road' },
  { key: 'road_name', label: 'Name' },
  { key: 'score', label: 'Score' },
  { key: 'method', label: 'Method' },
  { key: 'est_cost_inr', label: 'Est. cost', inr: true },
  { key: 'bmc_cost_inr', label: 'BMC cost', inr: true },
  { key: 'funded', label: 'Funded' },
]

export default function NextRupeeCard({ ward }: { ward: WardSummary }) {
  const { data, error } = useJson<NextRupeeFile>('next_rupee.json')
  if (error) return <p className="cv-muted">{error}</p>
  if (!data) return <p className="cv-muted">Loading…</p>
  const nw = data.wards[ward.ward_code]
  if (!nw) return <p className="cv-muted">No next-rupee plan for Ward {ward.ward_code}.</p>
  const top = nw.candidates.slice(0, 3)
  const funded = nw.candidates.filter((c) => c.funded)
  const weights = (Object.entries(data.weights) as [string, number][])
    .map(([k, v]) => `${k.replace('_', ' ')} ${pct(v)}`)
    .join(' · ')
  return (
    <section className="cv-card">
      <div className="cv-head">
        <h3>Where next?</h3>
        <SourceChip files={FILES} rule={`${data.rule} Weights: ${weights}`} />
      </div>
      <p>
        {nw.budget_mode === 'remaining'
          ? `${formatInr(nw.budget_inr)} left in the 2025 budget`
          : 'Over budget: plan for the next ₹10.0L'}
        . Allocated: <span className="cv-num">{formatInr(nw.allocated_inr)}</span>
      </p>
      <ol className="cv-rank">
        {top.map((c, i) => (
          <li key={c.road_id}>
            <span className="cv-rank-n cv-num" aria-hidden="true">{i + 1}</span>
            <div className="cv-rank-main">
              <div className="cv-rank-top">
                <span>
                  <strong>{c.road_name}</strong> <span className="cv-id">{c.road_id}</span>
                </span>
                <span className="cv-score cv-num">score {c.score.toFixed(1)}</span>
              </div>
              <div className="cv-reasons">
                {c.reasons.slice(0, 3).map((r) => (
                  <span key={r} className="cv-reason">{r}</span>
                ))}
              </div>
              {c.reasons.length > 3 && (
                <details className="cv-more">
                  <summary>+{c.reasons.length - 3} more</summary>
                  <div className="cv-reasons">
                    {c.reasons.slice(3).map((r) => (
                      <span key={r} className="cv-reason">{r}</span>
                    ))}
                  </div>
                </details>
              )}
              <div className="cv-muted">
                {c.method} ·{' '}
                <span className="cv-num">{c.dlp_route ? '₹0 to BMC (DLP)' : formatInr(c.bmc_cost_inr)}</span> ·{' '}
                <span className={c.funded ? 'cv-funded' : undefined}>{c.funded ? 'Funded' : 'Not funded'}</span>
              </div>
            </div>
          </li>
        ))}
      </ol>
      <EvidenceDrawer label="Funded" rows={funded} columns={COLS} filename={`next_rupee_funded_${ward.ward_code}.csv`} sumKey="bmc_cost_inr" />
      <EvidenceDrawer label="All candidates" rows={nw.candidates} columns={COLS} filename={`next_rupee_all_${ward.ward_code}.csv`} />
    </section>
  )
}
