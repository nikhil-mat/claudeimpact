import { Suspense } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner'
import { loadComplaints, loadWorkOrders, loadWards } from '@/lib/data/loader'
import { CitizenComplaintSearch } from './CitizenComplaintSearch'

export default function CitizenComplaintsPage() {
  const complaints = loadComplaints()
  const workOrders = loadWorkOrders()
  const wards = loadWards()

  // Build lookup of complaint → work orders
  const complaintToWO: Record<string, { work_order_id: string; repair_method: string; sla_met: boolean; reopened: boolean; completed_at: string | null }[]> = {}
  for (const wo of workOrders) {
    for (const cid of wo.linked_complaint_ids) {
      if (!complaintToWO[cid]) complaintToWO[cid] = []
      complaintToWO[cid].push({
        work_order_id: wo.work_order_id,
        repair_method: wo.repair_method,
        sla_met: wo.sla_met,
        reopened: wo.reopened_within_30d,
        completed_at: wo.completed_at,
      })
    }
  }

  const rows = complaints.map(c => ({
    complaint_id: c.complaint_id,
    received_at: c.received_at,
    channel: c.channel,
    category_reported: c.category_reported,
    description: c.description.slice(0, 150),
    ward_code: c.ward_code,
    locality_text: c.locality_text,
    status: c.status,
    upvotes: c.upvotes,
    resolved_at: c.resolved_at,
    work_orders: complaintToWO[c.complaint_id] || [],
  }))

  const wardOptions = wards.map(w => ({ ward_code: w.ward_code, ward_name: w.ward_name }))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <DisclaimerBanner className="mb-6" />
      <PageHeader
        title="Complaint History"
        description="Search and filter historical complaints. View linked work orders and repair outcomes."
      />
      <Suspense fallback={<div className="text-sm text-ink-faint p-8 text-center">Loading...</div>}>
        <CitizenComplaintSearch rows={rows} wards={wardOptions} />
      </Suspense>
    </div>
  )
}
