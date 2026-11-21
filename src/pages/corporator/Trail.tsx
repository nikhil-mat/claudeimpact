import type { WorkOrder } from './types.ts'
import { formatInr } from './format.ts'

export function Trail({ wo, byId }: { wo: WorkOrder; byId: Map<string, WorkOrder> }) {
  const twin = wo.twin_of ? byId.get(wo.twin_of) : undefined
  const ids = wo.complaint_ids.length ? wo.complaint_ids : (twin?.complaint_ids ?? [])
  const steps = [
    ids.length ? `Complaint ${ids.join(', ')}` : 'No linked complaint',
    wo.id,
    `${wo.road_name} (${wo.road_id}) · DLP: ${wo.under_dlp ? 'yes' : 'no'}`,
    wo.contractor_name,
    `billed ${formatInr(wo.cost_inr)} vs expected ${formatInr(wo.expected_inr)} (${wo.ratio.toFixed(2)}×)`,
  ]
  return (
    <ol className="cv-trail" aria-label="File movement">
      {steps.map((s, i) => (
        <li key={i}><span title={s}>{s}</span></li>
      ))}
    </ol>
  )
}
