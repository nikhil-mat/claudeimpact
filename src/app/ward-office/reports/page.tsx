import { PageHeader } from '@/components/layout/PageHeader'
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner'
import { MetricCard } from '@/components/ui/MetricCard'
import { loadComplaints, loadWorkOrders, loadWards } from '@/lib/data/loader'
import { computeWardBudgetSummary, formatINR, pct } from '@/lib/data/queries'
import { loadRoads, loadRateCard } from '@/lib/data/loader'
import { runAudit, auditSummary } from '@/lib/data/audit'

export default function ReportsPage() {
  const wards = loadWards()
  const complaints = loadComplaints()
  const workOrders = loadWorkOrders()
  const roads = loadRoads()
  const rateCard = loadRateCard()

  const wardSummaries = computeWardBudgetSummary(wards, workOrders, complaints)
  const flags = runAudit(workOrders, roads, rateCard)
  const counts = auditSummary(flags)

  const totalBudget = wardSummaries.reduce((s, w) => s + w.budget, 0)
  const totalSpent = wardSummaries.reduce((s, w) => s + w.total_spent, 0)
  const totalReopened = wardSummaries.reduce((s, w) => s + w.reopened_count, 0)
  const totalSlaMissed = wardSummaries.reduce((s, w) => s + w.sla_missed_count, 0)
  const reopenedSpend = wardSummaries.reduce((s, w) => s + w.reopened_spend, 0)

  // Status distribution
  const statusDist: Record<string, number> = {}
  for (const c of complaints) {
    statusDist[c.status] = (statusDist[c.status] || 0) + 1
  }

  // Category distribution
  const catDist: Record<string, number> = {}
  for (const c of complaints) {
    catDist[c.category_reported] = (catDist[c.category_reported] || 0) + 1
  }

  // Channel distribution
  const channelDist: Record<string, number> = {}
  for (const c of complaints) {
    channelDist[c.channel] = (channelDist[c.channel] || 0) + 1
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <DisclaimerBanner className="mb-6" />
      <PageHeader
        title="Summary Reports"
        description="Aggregate statistics across all wards — budgets, complaints, SLA performance, and audit findings"
      />

      {/* Top metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <MetricCard label="Total Budget" value={formatINR(totalBudget)} accent="#2E7D32" />
        <MetricCard label="Total Spent" value={formatINR(totalSpent)} subtext={`${pct(totalSpent, totalBudget)}% utilization`} accent="#2E7D32" />
        <MetricCard label="Complaints" value={complaints.length.toLocaleString()} accent="#2E7D32" />
        <MetricCard label="Work Orders" value={workOrders.length.toLocaleString()} accent="#2E7D32" />
        <MetricCard label="SLA Missed" value={totalSlaMissed.toLocaleString()} accent="#D4760A" />
        <MetricCard label="Reopened" value={totalReopened.toLocaleString()} subtext={formatINR(reopenedSpend)} accent="#C4320A" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Status Distribution */}
        <section className="border border-edge">
          <div className="px-4 py-2.5 border-b border-edge bg-surface-alt">
            <h2 className="text-[11px] font-semibold tracking-[0.08em] uppercase text-ink-faint">Complaints by Status</h2>
          </div>
          <div className="p-0">
            <table className="w-full text-xs">
              <tbody>
                {Object.entries(statusDist).sort(([,a],[,b]) => b - a).map(([status, count]) => (
                  <tr key={status} className="border-b border-edge last:border-b-0">
                    <td className="px-3 py-2 font-medium">{status}</td>
                    <td className="px-3 py-2 font-mono text-right">{count.toLocaleString()}</td>
                    <td className="px-3 py-2 font-mono text-right text-ink-faint">{pct(count, complaints.length)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Category Distribution */}
        <section className="border border-edge">
          <div className="px-4 py-2.5 border-b border-edge bg-surface-alt">
            <h2 className="text-[11px] font-semibold tracking-[0.08em] uppercase text-ink-faint">Complaints by Category</h2>
          </div>
          <div className="p-0">
            <table className="w-full text-xs">
              <tbody>
                {Object.entries(catDist).sort(([,a],[,b]) => b - a).slice(0, 10).map(([cat, count]) => (
                  <tr key={cat} className="border-b border-edge last:border-b-0">
                    <td className="px-3 py-2 font-medium truncate max-w-[150px]">{cat}</td>
                    <td className="px-3 py-2 font-mono text-right">{count.toLocaleString()}</td>
                    <td className="px-3 py-2 font-mono text-right text-ink-faint">{pct(count, complaints.length)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Channel Distribution */}
        <section className="border border-edge">
          <div className="px-4 py-2.5 border-b border-edge bg-surface-alt">
            <h2 className="text-[11px] font-semibold tracking-[0.08em] uppercase text-ink-faint">Complaints by Channel</h2>
          </div>
          <div className="p-0">
            <table className="w-full text-xs">
              <tbody>
                {Object.entries(channelDist).sort(([,a],[,b]) => b - a).map(([ch, count]) => (
                  <tr key={ch} className="border-b border-edge last:border-b-0">
                    <td className="px-3 py-2 font-medium">{ch}</td>
                    <td className="px-3 py-2 font-mono text-right">{count.toLocaleString()}</td>
                    <td className="px-3 py-2 font-mono text-right text-ink-faint">{pct(count, complaints.length)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Audit Summary */}
      <section className="border border-edge">
        <div className="px-4 py-2.5 border-b border-edge bg-surface-alt">
          <h2 className="text-[11px] font-semibold tracking-[0.08em] uppercase text-ink-faint">Audit Flag Summary</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-0 divide-x divide-edge">
          {[
            { label: 'Cost Deviations', key: 'COST_DEVIATION' },
            { label: 'DLP Repairs', key: 'DLP_REPAIR' },
            { label: 'SLA Missed', key: 'SLA_MISSED' },
            { label: 'Reopened', key: 'REOPENED' },
            { label: 'Duplicate Billing', key: 'DUPLICATE_BILLING' },
          ].map(item => (
            <div key={item.key} className="p-3 text-center">
              <p className="text-[11px] font-medium tracking-[0.04em] uppercase text-ink-faint">{item.label}</p>
              <p className="text-xl font-bold font-mono text-flag mt-1">{counts[item.key] || 0}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
