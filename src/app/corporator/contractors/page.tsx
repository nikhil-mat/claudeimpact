import { PageHeader } from '@/components/layout/PageHeader'
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner'
import { MetricCard } from '@/components/ui/MetricCard'
import { loadWorkOrders, loadRateCard, loadContractors } from '@/lib/data/loader'
import { computeContractorScorecards, formatINR, pct } from '@/lib/data/queries'

export default function ContractorsPage() {
  const workOrders = loadWorkOrders()
  const rateCard = loadRateCard()
  const contractors = loadContractors()

  const scorecards = computeContractorScorecards(workOrders, rateCard)
  const contractorMeta = Object.fromEntries(contractors.map(c => [c.contractor_id, c]))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <DisclaimerBanner className="mb-6" />
      <PageHeader
        title="Contractor Scorecards"
        description="Performance metrics for all empanelled contractors based on work order records"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {scorecards.map(sc => {
          const meta = contractorMeta[sc.contractor_id]
          const highDeviation = sc.avg_cost_deviation_pct > 20
          const highReopened = sc.reopened_rate_pct > 10
          const lowSLA = sc.sla_compliance_pct < 80

          return (
            <div key={sc.contractor_id} className="border border-edge">
              {/* Header */}
              <div className="px-4 py-3 border-b border-edge bg-surface-alt">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-sm font-semibold text-ink">{sc.contractor_name}</h3>
                  <span className="text-[11px] font-mono text-ink-faint">{sc.contractor_id}</span>
                </div>
                {meta && (
                  <p className="text-[11px] text-ink-faint mt-0.5">
                    Empanelled since {meta.empanelled_since} · {meta.active_wards.length} wards
                  </p>
                )}
              </div>

              {/* Metrics grid */}
              <div className="p-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] font-medium tracking-[0.04em] uppercase text-ink-faint">Work Orders</p>
                  <p className="text-lg font-bold font-mono text-ink mt-0.5">{sc.work_order_count}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium tracking-[0.04em] uppercase text-ink-faint">Total Billed</p>
                  <p className="text-lg font-bold font-mono text-ink mt-0.5">{formatINR(sc.total_billed)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium tracking-[0.04em] uppercase text-ink-faint">SLA Compliance</p>
                  <p className={`text-lg font-bold font-mono mt-0.5 ${lowSLA ? 'text-flag' : 'text-positive'}`}>
                    {sc.sla_compliance_pct}%
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium tracking-[0.04em] uppercase text-ink-faint">Reopened Rate</p>
                  <p className={`text-lg font-bold font-mono mt-0.5 ${highReopened ? 'text-flag' : 'text-ink'}`}>
                    {sc.reopened_rate_pct}%
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium tracking-[0.04em] uppercase text-ink-faint">Avg Cost/Order</p>
                  <p className="text-lg font-bold font-mono text-ink mt-0.5">{formatINR(sc.avg_cost_per_order)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium tracking-[0.04em] uppercase text-ink-faint">Avg Cost Deviation</p>
                  <p className={`text-lg font-bold font-mono mt-0.5 ${highDeviation ? 'text-flag' : 'text-ink'}`}>
                    {sc.avg_cost_deviation_pct > 0 ? '+' : ''}{sc.avg_cost_deviation_pct}%
                  </p>
                </div>
              </div>

              {/* Wards served */}
              <div className="px-4 py-2.5 border-t border-edge bg-surface-alt">
                <p className="text-[11px] text-ink-faint">
                  <span className="font-medium uppercase tracking-[0.04em]">Wards:</span>{' '}
                  {sc.wards_served.join(', ')}
                </p>
              </div>

              {/* Flags */}
              {(highDeviation || highReopened || lowSLA) && (
                <div className="px-4 py-2 border-t border-edge bg-red-50/50">
                  <div className="flex gap-1.5 flex-wrap">
                    {highDeviation && (
                      <span className="inline-flex px-1.5 py-0.5 text-[10px] font-medium bg-red-50 text-red-700 border border-red-200 rounded-sm">
                        Potential Cost Deviation
                      </span>
                    )}
                    {highReopened && (
                      <span className="inline-flex px-1.5 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-sm">
                        High Reopened Rate
                      </span>
                    )}
                    {lowSLA && (
                      <span className="inline-flex px-1.5 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-sm">
                        Low SLA Compliance
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
