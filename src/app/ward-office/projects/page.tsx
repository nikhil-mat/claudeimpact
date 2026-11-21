import { Suspense } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner'
import { MetricCard } from '@/components/ui/MetricCard'
import { loadWorkOrders, loadRoads, loadWards } from '@/lib/data/loader'
import { formatINR } from '@/lib/data/queries'
import { WorkOrderExplorer } from './WorkOrderExplorer'

export default function ProjectsPage() {
  const workOrders = loadWorkOrders()
  const roads = loadRoads()
  const wards = loadWards()

  const roadMap = Object.fromEntries(roads.map(r => [r.road_id, r]))
  const totalCost = workOrders.reduce((s, wo) => s + wo.cost_inr, 0)
  const completed = workOrders.filter(wo => wo.completed_at).length
  const pending = workOrders.length - completed

  const rows = workOrders.map(wo => {
    const road = roadMap[wo.road_id]
    return {
      work_order_id: wo.work_order_id,
      ward_code: wo.ward_code,
      road_name: road?.road_name || wo.road_id,
      contractor_name: wo.contractor_name,
      repair_method: wo.repair_method,
      area_sqm: wo.area_sqm,
      cost_inr: wo.cost_inr,
      sla_met: wo.sla_met,
      reopened: wo.reopened_within_30d,
      assigned_at: wo.assigned_at,
      completed_at: wo.completed_at,
      linked_complaints: wo.linked_complaint_ids.length,
    }
  })

  const wardOptions = wards.map(w => ({ ward_code: w.ward_code, ward_name: w.ward_name }))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <DisclaimerBanner className="mb-6" />
      <PageHeader
        title="Work Orders"
        description="All repair work orders with linked complaints, SLA status, and completion tracking"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <MetricCard label="Total Work Orders" value={workOrders.length.toLocaleString()} accent="#2E7D32" />
        <MetricCard label="Completed" value={completed.toLocaleString()} accent="#2E7D32" />
        <MetricCard label="Pending" value={pending.toLocaleString()} accent="#D4760A" />
        <MetricCard label="Total Cost" value={formatINR(totalCost)} accent="#0D3B66" />
      </div>

      <Suspense fallback={<div className="text-sm text-ink-faint p-8 text-center">Loading...</div>}>
        <WorkOrderExplorer rows={rows} wards={wardOptions} />
      </Suspense>
    </div>
  )
}
