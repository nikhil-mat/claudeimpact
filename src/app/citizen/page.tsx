import { PageHeader } from '@/components/layout/PageHeader'
import { MetricCard } from '@/components/ui/MetricCard'
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner'
import { loadComplaints, loadWorkOrders, loadWards } from '@/lib/data/loader'
import Link from 'next/link'

export default function CitizenDashboard() {
  const complaints = loadComplaints()
  const workOrders = loadWorkOrders()
  const wards = loadWards()

  const openCount = complaints.filter(c => c.status !== 'resolved' && c.status !== 'closed').length
  const resolvedCount = complaints.filter(c => c.status === 'resolved' || c.status === 'closed').length
  const withWO = new Set(workOrders.flatMap(wo => wo.linked_complaint_ids)).size
  const reopened = workOrders.filter(wo => wo.reopened_within_30d).length

  // Top wards by complaint count
  const byWard: Record<string, number> = {}
  for (const c of complaints) {
    if (c.ward_code) byWard[c.ward_code] = (byWard[c.ward_code] || 0) + 1
  }
  const topWards = Object.entries(byWard).sort(([,a],[,b]) => b - a).slice(0, 10)

  // Status distribution
  const statusDist: Record<string, number> = {}
  for (const c of complaints) {
    statusDist[c.status] = (statusDist[c.status] || 0) + 1
  }

  // Recent complaints (by received_at)
  const recent = [...complaints].sort((a, b) => b.received_at.localeCompare(a.received_at)).slice(0, 8)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <DisclaimerBanner className="mb-6" />
      <PageHeader
        title="Citizen Dashboard"
        description="Overview of civic complaints and infrastructure repair activity across Mumbai's wards"
      />

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <MetricCard label="Total Complaints" value={complaints.length.toLocaleString()} accent="#1565C0" />
        <MetricCard label="Open / Unresolved" value={openCount.toLocaleString()} accent="#C4320A" />
        <MetricCard label="Resolved" value={resolvedCount.toLocaleString()} accent="#2E7D32" />
        <MetricCard label="Linked to Repair" value={withWO.toLocaleString()} subtext={`${reopened} reopened`} accent="#1565C0" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Top wards by complaints */}
        <section className="border border-edge">
          <div className="px-4 py-2.5 border-b border-edge bg-surface-alt">
            <h2 className="text-[11px] font-semibold tracking-[0.08em] uppercase text-ink-faint">
              Complaints by Ward (Top 10)
            </h2>
          </div>
          <table className="w-full text-xs">
            <tbody>
              {topWards.map(([wc, count]) => {
                const ward = wards.find(w => w.ward_code === wc)
                return (
                  <tr key={wc} className="border-b border-edge last:border-b-0">
                    <td className="px-3 py-2">
                      <span className="font-mono font-medium">{wc}</span>
                      {ward && <span className="text-ink-faint ml-1.5">{ward.ward_name}</span>}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{count.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="w-24 h-1.5 bg-surface-muted rounded-full overflow-hidden ml-auto">
                        <div
                          className="h-full bg-accent-citizen rounded-full"
                          style={{ width: `${Math.min(100, (count / topWards[0][1]) * 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>

        {/* Status Distribution */}
        <section className="border border-edge">
          <div className="px-4 py-2.5 border-b border-edge bg-surface-alt">
            <h2 className="text-[11px] font-semibold tracking-[0.08em] uppercase text-ink-faint">
              Complaint Status Breakdown
            </h2>
          </div>
          <table className="w-full text-xs">
            <tbody>
              {Object.entries(statusDist).sort(([,a],[,b]) => b - a).map(([status, count]) => {
                const pctVal = Math.round((count / complaints.length) * 1000) / 10
                return (
                  <tr key={status} className="border-b border-edge last:border-b-0">
                    <td className="px-3 py-2 font-medium">{status}</td>
                    <td className="px-3 py-2 text-right font-mono">{count.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-mono text-ink-faint">{pctVal}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      </div>

      {/* Recent complaints */}
      <section className="border border-edge mb-6">
        <div className="px-4 py-2.5 border-b border-edge bg-surface-alt flex items-baseline justify-between">
          <h2 className="text-[11px] font-semibold tracking-[0.08em] uppercase text-ink-faint">
            Recent Complaints
          </h2>
          <Link href="/citizen/complaints" className="text-[11px] text-info font-medium hover:underline">
            View All →
          </Link>
        </div>
        <div className="divide-y divide-edge">
          {recent.map(c => (
            <div key={c.complaint_id} className="px-4 py-3 hover:bg-surface-alt/50">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-[11px] text-ink-faint">{c.complaint_id}</span>
                    <span className="text-[11px] text-ink-faint">·</span>
                    <span className="text-[11px] text-ink-faint">{c.received_at.split('T')[0]}</span>
                  </div>
                  <p className="text-xs text-ink-light truncate">{c.description.slice(0, 120)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] font-mono text-ink-faint">{c.ward_code}</span>
                    <span className="text-[11px] text-ink-faint">{c.category_reported}</span>
                  </div>
                </div>
                <span className={`shrink-0 inline-flex px-2 py-0.5 text-[11px] font-medium border rounded-sm ${
                  c.status === 'resolved' || c.status === 'closed'
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : c.status === 'escalated'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {c.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link href="/citizen/complaints" className="border border-edge border-l-[3px] border-l-accent-citizen p-4 hover:bg-surface-alt transition-colors">
          <p className="text-sm font-medium text-ink">Search Complaints</p>
          <p className="text-xs text-ink-light mt-0.5">Browse and filter 6,500+ historical complaints across all wards</p>
        </Link>
        <Link href="/citizen/infrastructure" className="border border-edge border-l-[3px] border-l-accent-citizen p-4 hover:bg-surface-alt transition-colors">
          <p className="text-sm font-medium text-ink">Infrastructure Data</p>
          <p className="text-xs text-ink-light mt-0.5">View flood hotspots, road data, and critical facilities</p>
        </Link>
      </div>
    </div>
  )
}
