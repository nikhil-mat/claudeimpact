import { PageHeader } from '@/components/layout/PageHeader'
import { MetricCard } from '@/components/ui/MetricCard'
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner'
import { loadComplaints, loadWorkOrders, loadWards } from '@/lib/data/loader'
import { Suspense } from 'react'
import { ComplaintQueue } from './ComplaintQueue'

export default function WardOfficeQueue() {
  const complaints = loadComplaints()
  const workOrders = loadWorkOrders()
  const wards = loadWards()

  const openComplaints = complaints.filter(c => c.status !== 'resolved' && c.status !== 'closed')
  const totalOpen = openComplaints.length
  const resolvedCount = complaints.filter(c => c.status === 'resolved' || c.status === 'closed').length

  // Build ward option list
  const wardOptions = wards.map(w => ({ ward_code: w.ward_code, ward_name: w.ward_name }))

  // Serialize complaint rows for client
  const rows = complaints.map(c => ({
    complaint_id: c.complaint_id,
    received_at: c.received_at,
    channel: c.channel,
    category_reported: c.category_reported,
    description: c.description.slice(0, 100),
    ward_code: c.ward_code,
    locality_text: c.locality_text,
    status: c.status,
    upvotes: c.upvotes,
    resolved_at: c.resolved_at,
    hasWorkOrder: workOrders.some(wo => wo.linked_complaint_ids.includes(c.complaint_id)),
  }))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <DisclaimerBanner className="mb-6" />
      <PageHeader
        title="Complaint Queue"
        description="All complaints across wards — filter by ward, category, and status"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <MetricCard label="Total Complaints" value={complaints.length.toLocaleString()} accent="#2E7D32" />
        <MetricCard label="Open / Unresolved" value={totalOpen.toLocaleString()} accent="#C4320A" />
        <MetricCard label="Resolved" value={resolvedCount.toLocaleString()} accent="#2E7D32" />
        <MetricCard label="With Work Order" value={workOrders.length.toLocaleString()} accent="#2E7D32" />
      </div>

      <Suspense fallback={<div className="text-sm text-ink-faint p-8 text-center">Loading...</div>}>
        <ComplaintQueue rows={rows} wards={wardOptions} />
      </Suspense>
    </div>
  )
}
