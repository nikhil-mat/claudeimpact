import type { WardSummary, WorkOrder } from './types.ts'
import { EvidenceDrawer } from './Evidence.tsx'
import { formatInr } from './format.ts'
import { Trail } from './Trail.tsx'

function maxBy(rows: WorkOrder[], f: (w: WorkOrder) => number): WorkOrder | undefined {
  let best: WorkOrder | undefined
  for (const r of rows) if (!best || f(r) > f(best)) best = r
  return best
}

function daysApart(a: string, b: string): number {
  return Math.round(Math.abs(Date.parse(a.replace(' ', 'T')) - Date.parse(b.replace(' ', 'T'))) / 86400000)
}

export default function CommitteeQuestions({
  ward,
  workOrders,
  byId,
}: {
  ward: WardSummary
  workOrders: WorkOrder[]
  byId: Map<string, WorkOrder>
}) {
  const twin = maxBy(workOrders.filter((w) => w.flag_twin), (w) => w.cost_inr)
  const over = maxBy(workOrders.filter((w) => w.b_over > 0), (w) => w.b_over)
  const dlp = maxBy(workOrders.filter((w) => w.flag_dlp_review), (w) => w.cost_inr)
  const items: { name: string; wo: WorkOrder | undefined; text: (w: WorkOrder) => string }[] = [
    {
      name: 'billed-twice',
      wo: twin,
      text: (w) => {
        const o = w.twin_of ? byId.get(w.twin_of) : undefined
        const days = o ? ` ${daysApart(w.assigned_at, o.assigned_at)} days apart` : ''
        return `Work order ${w.id} (${formatInr(w.cost_inr)}, ${w.contractor_name}) has no linked complaint and repeats ${w.twin_of} on the same road with the same method${days}. Was the same repair billed twice?`
      },
    },
    {
      name: 'overbilled',
      wo: over,
      text: (w) =>
        `${w.id} billed ${formatInr(w.cost_inr)} for ${w.area_sqm} sqm of ${w.repair_method}; the rate card gives ${formatInr(w.expected_inr)} (${w.ratio.toFixed(2)}×). What explains the difference?`,
    },
    {
      name: 'DLP-review',
      wo: dlp,
      text: (w) =>
        `${w.road_name} is still under its defect liability period, yet BMC paid ${formatInr(w.cost_inr)} for ${w.repair_method} (${w.id}). Should the original contractor have done this at no cost?`,
    },
  ]
  return (
    <section className="cv-section">
      <h3 className="cv-sec-h">3 questions for the ward committee</h3>
      {items.map((it, i) =>
        it.wo ? (
          <article className="cv-matter" key={it.name}>
            <div className="cv-matter-main">
              <div className="cv-matter-head">
                <span className="cv-stamp">For committee</span>
                <span className="cv-matter-no">Matter {i + 1} of {items.length}</span>
              </div>
              <h4 className="cv-wo">{it.wo.id}</h4>
              <p className="cv-q">{it.text(it.wo)}</p>
            </div>
            <div className="cv-matter-trail">
              <Trail wo={it.wo} byId={byId} />
              <EvidenceDrawer
                rows={[it.wo]}
                columns={[
                  { key: 'id', label: 'Work order' },
                  { key: 'road_name', label: 'Road' },
                  { key: 'contractor_name', label: 'Contractor' },
                  { key: 'repair_method', label: 'Method' },
                  { key: 'cost_inr', label: 'Cost', inr: true },
                  { key: 'expected_inr', label: 'Expected', inr: true },
                ]}
                filename={`${it.wo.id}.csv`}
                sumKey="cost_inr"
              />
            </div>
          </article>
        ) : (
          <article className="cv-matter" key={it.name}>
            <div className="cv-matter-main">
              <p className="cv-muted">
                Matter {i + 1} of {items.length}: no {it.name} jobs found in Ward {ward.ward_code}.
              </p>
            </div>
          </article>
        ),
      )}
    </section>
  )
}
