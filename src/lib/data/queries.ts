import type {
  WorkOrder, Ward, RateCard, Road,
  WardBudgetSummary, ContractorScorecard,
  SpendingByContractor, SpendingByMethod, Complaint,
} from './types'

// ─── Currency formatting ──────────────────────────────────────────────────────

export function formatINR(amount: number): string {
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2)} Cr`
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(2)} L`
  return `₹${amount.toLocaleString('en-IN')}`
}

export function pct(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 1000) / 10
}

// ─── Ward Budget Summary ─────────────────────────────────────────────────────

export function computeWardBudgetSummary(
  wards: Ward[],
  workOrders: WorkOrder[],
  complaints: Complaint[],
): WardBudgetSummary[] {
  const woByWard = groupBy(workOrders, wo => wo.ward_code)
  const cByWard = groupBy(complaints, c => c.ward_code)

  return wards.map(w => {
    const wos = woByWard[w.ward_code] || []
    const cs = cByWard[w.ward_code] || []
    const totalSpent = sum(wos, wo => wo.cost_inr)
    const reopened = wos.filter(wo => wo.reopened_within_30d)
    const slaMet = wos.filter(wo => wo.sla_met)

    return {
      ward_code: w.ward_code,
      ward_name: w.ward_name,
      budget: w.monsoon_repair_budget_inr_2025,
      total_spent: totalSpent,
      remaining: w.monsoon_repair_budget_inr_2025 - totalSpent,
      utilization_pct: pct(totalSpent, w.monsoon_repair_budget_inr_2025),
      work_order_count: wos.length,
      complaint_count: cs.length,
      reopened_count: reopened.length,
      reopened_spend: sum(reopened, wo => wo.cost_inr),
      sla_met_count: slaMet.length,
      sla_missed_count: wos.length - slaMet.length,
    }
  }).sort((a, b) => b.total_spent - a.total_spent)
}

// ─── Spending Breakdowns ─────────────────────────────────────────────────────

export function spendingByContractor(workOrders: WorkOrder[]): SpendingByContractor[] {
  const groups = groupBy(workOrders, wo => wo.contractor_id)
  return Object.entries(groups).map(([id, wos]) => ({
    contractor_id: id,
    contractor_name: wos[0]?.contractor_name || id,
    total: sum(wos, wo => wo.cost_inr),
    count: wos.length,
  })).sort((a, b) => b.total - a.total)
}

export function spendingByMethod(workOrders: WorkOrder[]): SpendingByMethod[] {
  const groups = groupBy(workOrders, wo => wo.repair_method)
  return Object.entries(groups).map(([method, wos]) => ({
    repair_method: method,
    total: sum(wos, wo => wo.cost_inr),
    count: wos.length,
  })).sort((a, b) => b.total - a.total)
}

// ─── Contractor Scorecards ───────────────────────────────────────────────────

export function computeContractorScorecards(
  workOrders: WorkOrder[],
  rateCard: RateCard[],
): ContractorScorecard[] {
  const rateMap = new Map(rateCard.map(r => [r.repair_method, r]))
  const groups = groupBy(workOrders, wo => wo.contractor_id)

  return Object.entries(groups).map(([id, wos]) => {
    const slaMet = wos.filter(wo => wo.sla_met).length
    const reopened = wos.filter(wo => wo.reopened_within_30d).length
    const totalBilled = sum(wos, wo => wo.cost_inr)

    // Cost deviation: compare actual vs expected from rate card
    let deviationSum = 0
    let deviationCount = 0
    for (const wo of wos) {
      const rate = rateMap.get(wo.repair_method)
      if (!rate) continue
      const expected = rate.unit === 'per sqm'
        ? rate.standard_rate_inr * wo.area_sqm
        : rate.standard_rate_inr
      if (expected > 0) {
        deviationSum += ((wo.cost_inr - expected) / expected) * 100
        deviationCount++
      }
    }

    const wardSet = new Set(wos.map(wo => wo.ward_code))

    return {
      contractor_id: id,
      contractor_name: wos[0]?.contractor_name || id,
      work_order_count: wos.length,
      total_billed: totalBilled,
      avg_cost_per_order: wos.length > 0 ? totalBilled / wos.length : 0,
      sla_compliance_pct: pct(slaMet, wos.length),
      reopened_rate_pct: pct(reopened, wos.length),
      avg_cost_deviation_pct: deviationCount > 0
        ? Math.round((deviationSum / deviationCount) * 10) / 10
        : 0,
      wards_served: Array.from(wardSet),
    }
  }).sort((a, b) => b.total_billed - a.total_billed)
}

// ─── Complaint queries ───────────────────────────────────────────────────────

export function filterComplaints(
  complaints: Complaint[],
  filters: {
    ward_code?: string
    category?: string
    status?: string
    search?: string
  },
): Complaint[] {
  let result = complaints
  if (filters.ward_code) result = result.filter(c => c.ward_code === filters.ward_code)
  if (filters.category) result = result.filter(c => c.category_reported === filters.category)
  if (filters.status) result = result.filter(c => c.status === filters.status)
  if (filters.search) {
    const q = filters.search.toLowerCase()
    result = result.filter(c =>
      c.complaint_id.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.locality_text.toLowerCase().includes(q)
    )
  }
  return result
}

export function getLinkedWorkOrders(
  complaintId: string,
  workOrders: WorkOrder[],
): WorkOrder[] {
  return workOrders.filter(wo => wo.linked_complaint_ids.includes(complaintId))
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {}
  for (const item of arr) {
    const k = key(item)
    if (!result[k]) result[k] = []
    result[k].push(item)
  }
  return result
}

function sum<T>(arr: T[], fn: (item: T) => number): number {
  return arr.reduce((acc, item) => acc + fn(item), 0)
}
