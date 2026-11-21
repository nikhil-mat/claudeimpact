import type { WorkOrder, Road, RateCard, AuditFlag } from './types'

// ─── Audit Engine ─────────────────────────────────────────────────────────────
// Deterministic, rule-based checks. No AI. Each flag includes evidence.

export function runAudit(
  workOrders: WorkOrder[],
  roads: Road[],
  rateCard: RateCard[],
): AuditFlag[] {
  const flags: AuditFlag[] = []
  const rateMap = new Map(rateCard.map(r => [r.repair_method, r]))
  const roadMap = new Map(roads.map(r => [r.road_id, r]))

  for (const wo of workOrders) {
    // Rule 1: Cost deviation vs rate card
    const rate = rateMap.get(wo.repair_method)
    if (rate) {
      const expected = rate.unit === 'per sqm'
        ? rate.standard_rate_inr * wo.area_sqm
        : rate.standard_rate_inr
      if (expected > 0) {
        const deviation = ((wo.cost_inr - expected) / expected) * 100
        if (deviation > 40) {
          flags.push({
            rule: 'COST_DEVIATION',
            severity: 'review',
            work_order_id: wo.work_order_id,
            description: `Billed ₹${wo.cost_inr.toLocaleString('en-IN')} vs expected ₹${Math.round(expected).toLocaleString('en-IN')} (+${deviation.toFixed(1)}% above standard rate)`,
            values: {
              billed: wo.cost_inr,
              expected: Math.round(expected),
              deviation_pct: Math.round(deviation * 10) / 10,
              method: wo.repair_method,
              area_sqm: wo.area_sqm,
            },
          })
        }
      }
    }

    // Rule 2: Repair on road under DLP
    const road = roadMap.get(wo.road_id)
    if (road && road.under_dlp) {
      flags.push({
        rule: 'DLP_REPAIR',
        severity: 'review',
        work_order_id: wo.work_order_id,
        description: `Repair billed on ${road.road_name} (${wo.road_id}) which is under Defect Liability Period. DLP repairs should be at contractor's cost.`,
        values: {
          road_id: wo.road_id,
          road_name: road.road_name,
          cost_inr: wo.cost_inr,
          contractor: wo.contractor_name,
        },
      })
    }

    // Rule 3: Missed SLA
    if (!wo.sla_met) {
      flags.push({
        rule: 'SLA_MISSED',
        severity: 'warning',
        work_order_id: wo.work_order_id,
        description: `SLA of ${wo.sla_hours}h not met. Assigned ${wo.assigned_at}, completed ${wo.completed_at || 'pending'}.`,
        values: {
          sla_hours: wo.sla_hours,
          assigned_at: wo.assigned_at,
          completed_at: wo.completed_at || 'N/A',
          contractor: wo.contractor_name,
        },
      })
    }

    // Rule 4: Reopened within 30 days
    if (wo.reopened_within_30d) {
      flags.push({
        rule: 'REOPENED',
        severity: 'warning',
        work_order_id: wo.work_order_id,
        description: `Repair reopened within 30 days. Method: ${wo.repair_method}, Cost: ₹${wo.cost_inr.toLocaleString('en-IN')}.`,
        values: {
          repair_method: wo.repair_method,
          cost_inr: wo.cost_inr,
          road_id: wo.road_id,
          contractor: wo.contractor_name,
        },
      })
    }
  }

  // Rule 5: Potential duplicate billing — same road, same work type, within 7 days
  const byRoadAndType = new Map<string, WorkOrder[]>()
  for (const wo of workOrders) {
    const key = `${wo.road_id}|${wo.work_type}`
    if (!byRoadAndType.has(key)) byRoadAndType.set(key, [])
    byRoadAndType.get(key)!.push(wo)
  }
  for (const [, group] of byRoadAndType) {
    if (group.length < 2) continue
    const sorted = [...group].sort((a, b) =>
      new Date(a.assigned_at).getTime() - new Date(b.assigned_at).getTime()
    )
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]
      const curr = sorted[i]
      const daysBetween = (new Date(curr.assigned_at).getTime() - new Date(prev.assigned_at).getTime()) / (1000 * 60 * 60 * 24)
      if (daysBetween <= 7 && daysBetween >= 0) {
        flags.push({
          rule: 'DUPLICATE_BILLING',
          severity: 'review',
          work_order_id: curr.work_order_id,
          description: `Same road (${curr.road_id}) and work type (${curr.work_type}) as ${prev.work_order_id}, only ${daysBetween.toFixed(1)} days apart.`,
          values: {
            other_wo: prev.work_order_id,
            road_id: curr.road_id,
            work_type: curr.work_type,
            days_apart: Math.round(daysBetween * 10) / 10,
            this_cost: curr.cost_inr,
            other_cost: prev.cost_inr,
          },
        })
      }
    }
  }

  return flags
}

export function auditSummary(flags: AuditFlag[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const f of flags) {
    counts[f.rule] = (counts[f.rule] || 0) + 1
  }
  return counts
}

export function flagsByWard(
  flags: AuditFlag[],
  workOrders: WorkOrder[],
): Record<string, AuditFlag[]> {
  const woMap = new Map(workOrders.map(wo => [wo.work_order_id, wo]))
  const result: Record<string, AuditFlag[]> = {}
  for (const f of flags) {
    const wo = woMap.get(f.work_order_id)
    const ward = wo?.ward_code || 'unknown'
    if (!result[ward]) result[ward] = []
    result[ward].push(f)
  }
  return result
}
