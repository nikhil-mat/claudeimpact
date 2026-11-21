import { PageHeader } from '@/components/layout/PageHeader'
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner'
import { SeverityBadge } from '@/components/ui/SeverityBadge'
import { MetricCard } from '@/components/ui/MetricCard'
import { loadWorkOrders, loadRoads, loadRateCard } from '@/lib/data/loader'
import { runAudit, auditSummary } from '@/lib/data/audit'
import { formatINR } from '@/lib/data/queries'

export default function AuditPage() {
  const workOrders = loadWorkOrders()
  const roads = loadRoads()
  const rateCard = loadRateCard()

  const flags = runAudit(workOrders, roads, rateCard)
  const counts = auditSummary(flags)

  const ruleLabels: Record<string, string> = {
    COST_DEVIATION: 'Potential Cost Deviation',
    DLP_REPAIR: 'DLP Repair',
    SLA_MISSED: 'SLA Missed',
    REOPENED: 'Reopened Repair',
    DUPLICATE_BILLING: 'Potential Duplicate Billing',
  }

  const ruleDescriptions: Record<string, string> = {
    COST_DEVIATION: 'Work orders where the billed amount exceeds the expected cost from the rate card by more than 40%.',
    DLP_REPAIR: 'Repairs billed on roads that are under their Defect Liability Period — these should be at the original contractor\'s cost.',
    SLA_MISSED: 'Work orders that did not meet their specified SLA completion time.',
    REOPENED: 'Repairs that were reopened within 30 days of completion, indicating potential quality issues.',
    DUPLICATE_BILLING: 'Work orders on the same road with the same work type assigned within 7 days of each other.',
  }

  // Group flags by rule
  const groupedFlags: Record<string, typeof flags> = {}
  for (const f of flags) {
    if (!groupedFlags[f.rule]) groupedFlags[f.rule] = []
    groupedFlags[f.rule].push(f)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <DisclaimerBanner className="mb-6" />
      <PageHeader
        title="Repair Audit"
        description="Deterministic, rule-based audit checks across all work orders. Each flag includes evidence and source records."
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <MetricCard label="Total Flags" value={flags.length.toLocaleString()} accent="#C4320A" />
        <MetricCard label="Cost Deviations" value={(counts.COST_DEVIATION || 0).toString()} accent="#C4320A" />
        <MetricCard label="DLP Repairs" value={(counts.DLP_REPAIR || 0).toString()} accent="#C4320A" />
        <MetricCard label="SLA Missed" value={(counts.SLA_MISSED || 0).toString()} accent="#D4760A" />
        <MetricCard label="Reopened" value={(counts.REOPENED || 0).toString()} accent="#D4760A" />
        <MetricCard label="Duplicate Billing" value={(counts.DUPLICATE_BILLING || 0).toString()} accent="#C4320A" />
      </div>

      {/* Flags grouped by rule */}
      <div className="space-y-6">
        {['COST_DEVIATION', 'DLP_REPAIR', 'DUPLICATE_BILLING', 'SLA_MISSED', 'REOPENED'].map(rule => {
          const ruleFlags = groupedFlags[rule] || []
          if (ruleFlags.length === 0) return null
          return (
            <section key={rule} className="border border-edge">
              <div className="px-4 py-3 border-b border-edge bg-surface-alt">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-ink">{ruleLabels[rule] || rule}</h2>
                    <p className="text-[11px] text-ink-faint mt-0.5">{ruleDescriptions[rule]}</p>
                  </div>
                  <span className="text-lg font-bold font-mono text-flag">{ruleFlags.length}</span>
                </div>
              </div>
              <div className="divide-y divide-edge max-h-[500px] overflow-y-auto">
                {ruleFlags.slice(0, 50).map((flag, i) => (
                  <div key={`${flag.work_order_id}-${i}`} className="px-4 py-3 hover:bg-surface-alt/50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-medium text-ink">{flag.work_order_id}</span>
                          <SeverityBadge severity={flag.severity} />
                        </div>
                        <p className="text-xs text-ink-light">{flag.description}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5">
                          {Object.entries(flag.values).map(([k, v]) => (
                            <span key={k} className="text-[11px] text-ink-faint">
                              <span className="font-medium">{k}:</span>{' '}
                              <span className="font-mono">{typeof v === 'number' ? v.toLocaleString('en-IN') : v}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {ruleFlags.length > 50 && (
                  <div className="px-4 py-2.5 bg-surface-alt text-center">
                    <p className="text-[11px] text-ink-faint">
                      Showing 50 of {ruleFlags.length} flags
                    </p>
                  </div>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
