import { PageHeader } from '@/components/layout/PageHeader'
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner'

export default function MethodologyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <DisclaimerBanner className="mb-6" />
      <PageHeader
        title="Methodology & Data Sources"
        description="How MonsoonWatch calculates metrics, runs audit checks, and what the data represents"
      />

      <div className="space-y-8 text-sm text-ink-light leading-relaxed">
        {/* Data Source */}
        <section className="border border-edge p-5">
          <h2 className="text-xs font-semibold tracking-[0.08em] uppercase text-ink mb-3">Data Source</h2>
          <p>
            All data shown in MonsoonWatch comes from the{' '}
            <strong className="text-ink">Claude Impact Labs Data 2</strong> synthetic challenge dataset.
            This dataset was created for the Claude Impact Lab Mumbai hackathon and is{' '}
            <strong className="text-ink">entirely simulated</strong>. It does not contain real BMC records,
            real contractor information, or verified government data.
          </p>
          <p className="mt-2">
            The dataset is licensed under{' '}
            <strong className="text-ink">Creative Commons Attribution 4.0 International (CC BY 4.0)</strong>.
          </p>
        </section>

        {/* Datasets */}
        <section className="border border-edge p-5">
          <h2 className="text-xs font-semibold tracking-[0.08em] uppercase text-ink mb-3">Datasets Used</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-edge">
                  <th className="py-1.5 text-left font-semibold text-ink">Dataset</th>
                  <th className="py-1.5 text-left font-semibold text-ink">Records</th>
                  <th className="py-1.5 text-left font-semibold text-ink">Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {[
                  ['complaints.csv', '6,501', 'Citizen complaints across all channels'],
                  ['work_orders.csv', '2,499', 'Repair work orders linked to complaints'],
                  ['contractors.csv', '8', 'Empanelled contractor details'],
                  ['rate_card.csv', '10', 'Standard repair rates per method'],
                  ['roads.csv', '291', 'Road segments with DLP and type info'],
                  ['wards.csv', '24', 'Ward boundaries, budgets, population'],
                  ['flood_hotspots.csv', '28', 'Known flood-prone locations'],
                  ['rainfall_daily.csv', '244', 'Daily rainfall with IMD categories'],
                  ['tides.csv', '244', 'High tide data with big-tide flags'],
                  ['traffic.csv', '291', 'Road-level congestion metrics'],
                  ['accidents.csv', '420', 'Road accidents with severity'],
                  ['facilities.csv', '160', 'Hospitals, schools, critical facilities'],
                ].map(([name, count, purpose]) => (
                  <tr key={name}>
                    <td className="py-1.5 font-mono">{name}</td>
                    <td className="py-1.5 font-mono">{count}</td>
                    <td className="py-1.5">{purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Audit Rules */}
        <section className="border border-edge p-5">
          <h2 className="text-xs font-semibold tracking-[0.08em] uppercase text-ink mb-3">Audit Rules</h2>
          <p className="mb-3">
            All audit checks are <strong className="text-ink">deterministic and rule-based</strong> — no AI
            is used in flagging. Each flag includes the work order ID, supporting values, and the specific
            rule triggered.
          </p>
          <div className="space-y-3">
            {[
              {
                rule: 'COST_DEVIATION',
                title: 'Potential Cost Deviation',
                desc: 'Triggered when the billed amount exceeds the expected cost (from rate card × area) by more than 40%. For "per job" rate card items, the flat rate is used as the expected cost.',
              },
              {
                rule: 'DLP_REPAIR',
                title: 'DLP Repair',
                desc: 'Triggered when a repair is billed on a road that is currently under its Defect Liability Period. DLP repairs should be performed by the original resurfacing contractor at no additional cost to BMC.',
              },
              {
                rule: 'SLA_MISSED',
                title: 'SLA Missed',
                desc: 'Triggered when the work order\'s sla_met field is "N", indicating the repair was not completed within the specified SLA hours.',
              },
              {
                rule: 'REOPENED',
                title: 'Reopened Repair',
                desc: 'Triggered when a repair was reopened within 30 days of completion, indicating the initial repair may have been inadequate.',
              },
              {
                rule: 'DUPLICATE_BILLING',
                title: 'Potential Duplicate Billing',
                desc: 'Triggered when two work orders on the same road with the same work type are assigned within 7 days of each other.',
              },
            ].map(item => (
              <div key={item.rule} className="border-l-2 border-edge pl-3">
                <p className="text-xs font-semibold text-ink">
                  <span className="font-mono text-[11px] text-ink-faint mr-2">{item.rule}</span>
                  {item.title}
                </p>
                <p className="text-xs text-ink-light mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Budget Calculations */}
        <section className="border border-edge p-5">
          <h2 className="text-xs font-semibold tracking-[0.08em] uppercase text-ink mb-3">Budget Calculations</h2>
          <ul className="space-y-1.5 text-xs">
            <li><strong className="text-ink">Budget:</strong> From wards.csv → monsoon_repair_budget_inr_2025 field</li>
            <li><strong className="text-ink">Total Spent:</strong> Sum of cost_inr for all work orders in that ward</li>
            <li><strong className="text-ink">Remaining:</strong> Budget − Total Spent (can be negative)</li>
            <li><strong className="text-ink">Utilization:</strong> (Total Spent ÷ Budget) × 100</li>
            <li><strong className="text-ink">Reopened Spend:</strong> Sum of cost_inr where reopened_within_30d = Y</li>
          </ul>
        </section>

        {/* Contractor Scoring */}
        <section className="border border-edge p-5">
          <h2 className="text-xs font-semibold tracking-[0.08em] uppercase text-ink mb-3">Contractor Scoring</h2>
          <ul className="space-y-1.5 text-xs">
            <li><strong className="text-ink">SLA Compliance:</strong> (Work orders with sla_met=Y ÷ Total work orders) × 100</li>
            <li><strong className="text-ink">Reopened Rate:</strong> (Work orders with reopened_within_30d=Y ÷ Total) × 100</li>
            <li><strong className="text-ink">Avg Cost Deviation:</strong> Average of ((billed − expected) ÷ expected × 100) across all work orders with a matching rate card entry</li>
          </ul>
        </section>

        {/* Fair Language */}
        <section className="border border-edge p-5 border-l-[3px] border-l-amber-500">
          <h2 className="text-xs font-semibold tracking-[0.08em] uppercase text-ink mb-3">Fair Accountability</h2>
          <p>
            MonsoonWatch uses language such as{' '}
            <strong className="text-ink">&quot;Requires Review,&quot;</strong>{' '}
            <strong className="text-ink">&quot;Potential Cost Deviation,&quot;</strong> and{' '}
            <strong className="text-ink">&quot;Potential Duplicate Billing&quot;</strong>{' '}
            rather than definitive accusations. Audit flags indicate anomalies that warrant further investigation,
            not confirmed wrongdoing. All flagged items include the source work order ID and supporting values
            so that any finding can be independently verified.
          </p>
        </section>
      </div>
    </div>
  )
}
