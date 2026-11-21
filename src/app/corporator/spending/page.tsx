import { Suspense } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner'
import { loadWards, loadWorkOrders, loadRoads, loadRateCard } from '@/lib/data/loader'
import { formatINR, pct } from '@/lib/data/queries'
import { SpendingExplorer } from './SpendingExplorer'

export default function SpendingPage() {
  const wards = loadWards()
  const workOrders = loadWorkOrders()
  const roads = loadRoads()
  const rateCard = loadRateCard()

  const roadMap = Object.fromEntries(roads.map(r => [r.road_id, r]))
  const rateMap = Object.fromEntries(rateCard.map(r => [r.repair_method, r]))

  // Pre-compute flat rows for the client
  const rows = workOrders.map(wo => {
    const road = roadMap[wo.road_id]
    const rate = rateMap[wo.repair_method]
    const expected = rate
      ? rate.unit === 'per sqm' ? rate.standard_rate_inr * wo.area_sqm : rate.standard_rate_inr
      : null
    const deviation = expected && expected > 0 ? ((wo.cost_inr - expected) / expected) * 100 : null

    return {
      work_order_id: wo.work_order_id,
      ward_code: wo.ward_code,
      road_id: wo.road_id,
      road_name: road?.road_name || wo.road_id,
      contractor_name: wo.contractor_name,
      repair_method: wo.repair_method,
      area_sqm: wo.area_sqm,
      cost_inr: wo.cost_inr,
      expected_cost: expected ? Math.round(expected) : null,
      deviation_pct: deviation ? Math.round(deviation * 10) / 10 : null,
      sla_met: wo.sla_met,
      reopened: wo.reopened_within_30d,
      under_dlp: road?.under_dlp || false,
      assigned_at: wo.assigned_at,
      completed_at: wo.completed_at,
    }
  })

  const wardOptions = wards.map(w => ({ ward_code: w.ward_code, ward_name: w.ward_name }))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <DisclaimerBanner className="mb-6" />
      <PageHeader
        title="Spending Explorer"
        description="Browse all work orders with cost analysis, rate card deviation, and anomaly indicators"
      />
      <Suspense fallback={<div className="text-sm text-ink-faint p-8 text-center">Loading...</div>}>
        <SpendingExplorer rows={rows} wards={wardOptions} />
      </Suspense>
    </div>
  )
}
