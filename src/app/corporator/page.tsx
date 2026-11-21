import { PageHeader } from '@/components/layout/PageHeader'
import { MetricCard } from '@/components/ui/MetricCard'
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner'
import { loadWards, loadWorkOrders, loadComplaints, loadRoads, loadRateCard } from '@/lib/data/loader'
import { computeWardBudgetSummary, spendingByContractor, spendingByMethod, formatINR, pct } from '@/lib/data/queries'
import { runAudit, auditSummary } from '@/lib/data/audit'
import Link from 'next/link'

export default function CorporatorOverview() {
  const wards = loadWards()
  const workOrders = loadWorkOrders()
  const complaints = loadComplaints()
  const roads = loadRoads()
  const rateCard = loadRateCard()

  const wardSummaries = computeWardBudgetSummary(wards, workOrders, complaints)
  const byContractor = spendingByContractor(workOrders)
  const byMethod = spendingByMethod(workOrders)
  const auditFlags = runAudit(workOrders, roads, rateCard)
  const auditCounts = auditSummary(auditFlags)

  const totalBudget = wardSummaries.reduce((s, w) => s + w.budget, 0)
  const totalSpent = wardSummaries.reduce((s, w) => s + w.total_spent, 0)
  const totalComplaints = complaints.length
  const totalWorkOrders = workOrders.length
  const totalReopened = wardSummaries.reduce((s, w) => s + w.reopened_count, 0)
  const totalFlags = auditFlags.length

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <DisclaimerBanner className="mb-6" />

      <PageHeader
        title="Ward Money Trail"
        description="Infrastructure spending overview across all 24 wards — budget allocation, repair costs, and audit flags"
      />

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <MetricCard label="Total Budget" value={formatINR(totalBudget)} accent="#0D3B66" />
        <MetricCard label="Total Spent" value={formatINR(totalSpent)} subtext={`${pct(totalSpent, totalBudget)}% utilization`} accent="#0D3B66" />
        <MetricCard label="Remaining" value={formatINR(totalBudget - totalSpent)} accent="#0D3B66" />
        <MetricCard label="Complaints" value={totalComplaints.toLocaleString()} accent="#0D3B66" />
        <MetricCard label="Work Orders" value={totalWorkOrders.toLocaleString()} subtext={`${totalReopened} reopened`} accent="#C4320A" />
        <MetricCard label="Audit Flags" value={totalFlags.toLocaleString()} accent="#C4320A" />
      </div>

      {/* Ward budget table */}
      <section className="border border-edge mb-6">
        <div className="px-4 py-2.5 border-b border-edge bg-surface-alt flex items-baseline justify-between">
          <h2 className="text-[11px] font-semibold tracking-[0.08em] uppercase text-ink-faint">
            Ward Budget Summary
          </h2>
          <span className="text-[11px] text-ink-faint">{wards.length} wards</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-alt border-b border-edge">
                {['Ward', 'Budget', 'Spent', 'Remaining', 'Util %', 'Work Orders', 'Complaints', 'Reopened', 'SLA Missed'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold tracking-[0.06em] uppercase text-ink-faint whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {wardSummaries.map(w => {
                const overBudget = w.total_spent > w.budget
                return (
                  <tr key={w.ward_code} className="border-b border-edge last:border-b-0 hover:bg-surface-alt/50">
                    <td className="px-3 py-2 text-xs font-medium">
                      <span className="font-mono">{w.ward_code}</span>
                      <span className="text-ink-faint ml-1.5">{w.ward_name}</span>
                    </td>
                    <td className="px-3 py-2 text-xs font-mono">{formatINR(w.budget)}</td>
                    <td className={`px-3 py-2 text-xs font-mono ${overBudget ? 'text-flag font-semibold' : ''}`}>
                      {formatINR(w.total_spent)}
                    </td>
                    <td className={`px-3 py-2 text-xs font-mono ${w.remaining < 0 ? 'text-flag' : ''}`}>
                      {formatINR(w.remaining)}
                    </td>
                    <td className="px-3 py-2 text-xs font-mono">
                      <span className={w.utilization_pct > 100 ? 'text-flag font-semibold' : ''}>
                        {w.utilization_pct}%
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs font-mono">{w.work_order_count}</td>
                    <td className="px-3 py-2 text-xs font-mono">{w.complaint_count}</td>
                    <td className={`px-3 py-2 text-xs font-mono ${w.reopened_count > 0 ? 'text-flag' : ''}`}>
                      {w.reopened_count}
                    </td>
                    <td className={`px-3 py-2 text-xs font-mono ${w.sla_missed_count > 0 ? 'text-progress' : ''}`}>
                      {w.sla_missed_count}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Spending breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* By Contractor */}
        <section className="border border-edge">
          <div className="px-4 py-2.5 border-b border-edge bg-surface-alt">
            <h2 className="text-[11px] font-semibold tracking-[0.08em] uppercase text-ink-faint">
              Spending by Contractor
            </h2>
          </div>
          <div className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-edge">
                  <th className="px-3 py-2 text-left text-[11px] font-semibold tracking-[0.06em] uppercase text-ink-faint">Contractor</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold tracking-[0.06em] uppercase text-ink-faint">Amount</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold tracking-[0.06em] uppercase text-ink-faint">Orders</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold tracking-[0.06em] uppercase text-ink-faint">Share</th>
                </tr>
              </thead>
              <tbody>
                {byContractor.map(c => (
                  <tr key={c.contractor_id} className="border-b border-edge last:border-b-0">
                    <td className="px-3 py-2 text-xs">{c.contractor_name}</td>
                    <td className="px-3 py-2 text-xs font-mono">{formatINR(c.total)}</td>
                    <td className="px-3 py-2 text-xs font-mono">{c.count}</td>
                    <td className="px-3 py-2 text-xs font-mono">{pct(c.total, totalSpent)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* By Method */}
        <section className="border border-edge">
          <div className="px-4 py-2.5 border-b border-edge bg-surface-alt">
            <h2 className="text-[11px] font-semibold tracking-[0.08em] uppercase text-ink-faint">
              Spending by Repair Method
            </h2>
          </div>
          <div className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-edge">
                  <th className="px-3 py-2 text-left text-[11px] font-semibold tracking-[0.06em] uppercase text-ink-faint">Method</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold tracking-[0.06em] uppercase text-ink-faint">Amount</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold tracking-[0.06em] uppercase text-ink-faint">Orders</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold tracking-[0.06em] uppercase text-ink-faint">Share</th>
                </tr>
              </thead>
              <tbody>
                {byMethod.map(m => (
                  <tr key={m.repair_method} className="border-b border-edge last:border-b-0">
                    <td className="px-3 py-2 text-xs">{m.repair_method}</td>
                    <td className="px-3 py-2 text-xs font-mono">{formatINR(m.total)}</td>
                    <td className="px-3 py-2 text-xs font-mono">{m.count}</td>
                    <td className="px-3 py-2 text-xs font-mono">{pct(m.total, totalSpent)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Audit summary */}
      <section className="border border-edge mb-6">
        <div className="px-4 py-2.5 border-b border-edge bg-surface-alt flex items-baseline justify-between">
          <h2 className="text-[11px] font-semibold tracking-[0.08em] uppercase text-ink-faint">
            Audit Flag Summary
          </h2>
          <Link href="/ward-office/audit" className="text-[11px] text-info font-medium hover:underline">
            View Full Audit →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-0 divide-x divide-edge">
          {[
            { label: 'Cost Deviations', key: 'COST_DEVIATION', color: '#C4320A' },
            { label: 'DLP Repairs', key: 'DLP_REPAIR', color: '#C4320A' },
            { label: 'SLA Missed', key: 'SLA_MISSED', color: '#D4760A' },
            { label: 'Reopened', key: 'REOPENED', color: '#D4760A' },
            { label: 'Duplicate Billing', key: 'DUPLICATE_BILLING', color: '#C4320A' },
          ].map(item => (
            <div key={item.key} className="p-3 text-center">
              <p className="text-[11px] font-medium tracking-[0.04em] uppercase text-ink-faint">{item.label}</p>
              <p className="text-2xl font-bold font-mono mt-1" style={{ color: item.color }}>
                {auditCounts[item.key] || 0}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
