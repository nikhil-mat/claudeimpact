import type { WardSummary, WardsFile, WorkOrder } from './types.ts'
import { EvidenceDrawer, SourceChip } from './Evidence.tsx'
import { formatInr, pct } from './format.ts'

function group(rows: WorkOrder[], key: (w: WorkOrder) => string) {
  const m = new Map<string, WorkOrder[]>()
  for (const r of rows) {
    const k = key(r)
    m.set(k, [...(m.get(k) ?? []), r])
  }
  return [...m.entries()]
}

const TOP = 5
// The header says the data is synthetic; drop the per-name suffix in tables so names fit on one line.
const short = (name: string) => name.replace(/\s*\(synthetic\)$/, '')
const More = ({ n }: { n: number }) => (n > 0 ? <p className="cv-muted cv-more-line">+{n} more in evidence</p> : null)

export function WhereCard({ workOrders }: { workOrders: WorkOrder[] }) {
  const total = workOrders.reduce((a, w) => a + w.cost_inr, 0)
  const table = (title: string, key: (w: WorkOrder) => string) => {
    const all = group(workOrders, key)
      .map(([k, rs]) => ({ k, n: rs.length, s: rs.reduce((a, w) => a + w.cost_inr, 0) }))
      .sort((a, b) => b.s - a.s)
    return (
    <div className="cv-tblock">
    <table className="cv-table">
      <thead>
        <tr>
          <th>{title}</th>
          <th className="r">Jobs</th>
          <th className="r">₹</th>
          <th className="r">Share</th>
        </tr>
      </thead>
      <tbody>
        {all
          .slice(0, TOP)
          .map((r) => (
            <tr key={r.k}>
              <td title={r.k}>{short(r.k)}</td>
              <td className="r cv-num">{r.n}</td>
              <td className="r cv-num">{formatInr(r.s)}</td>
              <td className="r cv-num">{pct(total ? r.s / total : 0)}</td>
            </tr>
          ))}
      </tbody>
    </table>
    <More n={all.length - TOP} />
    </div>
    )
  }
  return (
    <div className="cv-card cv-card-where">
      <div className="cv-head">
        <h3>Where did it go?</h3>
        <SourceChip
          files={['work_orders.csv']}
          columns={['contractor_name', 'repair_method', 'cost_inr']}
          rule="Sum of cost_inr for the ward's work orders, grouped by contractor and by repair method."
        />
      </div>
      {table('Contractor', (w) => w.contractor_name)}
      {table('Repair method', (w) => w.repair_method)}
      <EvidenceDrawer
        rows={workOrders}
        columns={[
          { key: 'id', label: 'Work order' },
          { key: 'contractor_name', label: 'Contractor' },
          { key: 'repair_method', label: 'Method' },
          { key: 'cost_inr', label: 'Cost', inr: true },
        ]}
        filename="where-did-it-go.csv"
        sumKey="cost_inr"
      />
    </div>
  )
}

export function LastCard({
  ward,
  medians,
  workOrders,
}: {
  ward: WardSummary
  medians: WardsFile['medians']
  workOrders: WorkOrder[]
}) {
  const failed = workOrders.filter((w) => w.reopened)
  const rows = group(workOrders, (w) => w.contractor_name).map(([name, rs]) => {
    const f = rs.filter((w) => w.reopened).length
    return {
      name,
      since: rs[0].contractor_since,
      jobs: rs.length,
      f,
      actual: f / rs.length,
      expected: rs.reduce((a, w) => a + w.exp_fail, 0) / rs.length,
    }
  })
  return (
    <div className="cv-card">
      <div className="cv-head">
        <h3>Did it last?</h3>
        <SourceChip
          files={['work_orders.csv', 'contractors.csv', 'rate_card.csv']}
          columns={['reopened_within_30d', 'repair_method', 'sla_met', 'empanelled_since']}
          rule="expected = citywide re-open rate of each job's repair method, averaged over this mix. Actual = share of the ward's jobs re-opened within 30 days."
        />
      </div>
      <p className="cv-kpi cv-num">
        <strong>{pct(ward.fail_rate, 1)}</strong>
        <span>failed within 30 days</span>
      </p>
      <dl className="cv-facts cv-num">
        <div>
          <dt>Expected for this mix</dt>
          <dd>{pct(ward.expected_fail_rate, 1)}</dd>
        </div>
        <div>
          <dt>Ward median</dt>
          <dd>{pct(medians.fail_rate, 1)}</dd>
        </div>
        <div>
          <dt>Missed SLA</dt>
          <dd>
            {ward.sla_missed} jobs ({pct(ward.sla_missed_rate)}; ward median {pct(medians.sla_missed_rate)})
          </dd>
        </div>
      </dl>
      <table className="cv-table">
        <thead>
          <tr>
            <th>Contractor</th>
            <th className="r">Jobs</th>
            <th className="r">Failed</th>
            <th className="r">Actual</th>
            <th className="r">Expected</th>
          </tr>
        </thead>
        <tbody>
          {rows
            .sort((a, b) => b.jobs - a.jobs)
            .slice(0, TOP)
            .map((r) => (
              <tr key={r.name}>
                <td title={r.name}>
                  {short(r.name)} <span className="cv-muted cv-since">since {r.since}</span>
                </td>
                <td className="r cv-num">{r.jobs}</td>
                <td className="r cv-num">{r.f}</td>
                <td className="r cv-num">{pct(r.actual)}</td>
                <td className="r cv-num">{pct(r.expected)}</td>
              </tr>
            ))}
        </tbody>
      </table>
      <More n={rows.length - TOP} />
      <EvidenceDrawer
        rows={failed}
        columns={[
          { key: 'id', label: 'Work order' },
          { key: 'contractor_name', label: 'Contractor' },
          { key: 'repair_method', label: 'Method' },
          { key: 'cost_inr', label: 'Cost', inr: true },
          { key: 'b_fail', label: 'Failed ₹', inr: true },
        ]}
        filename={`ward-${ward.ward_code}-failed.csv`}
        sumKey="b_fail"
      />
    </div>
  )
}
