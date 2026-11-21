// Dataset types — Claude Impact Labs Data 2
// All data is synthetic. CC BY 4.0 license.

export interface Complaint {
  complaint_id: string
  received_at: string
  channel: string
  category_reported: string
  description: string
  language: string
  locality_text: string
  ward_code: string
  lat: number | null
  lon: number | null
  gps_accuracy_m: number | null
  photo_url: string
  photo_description: string
  complainant_id: string
  upvotes: number
  status: string
  resolved_at: string | null
}

export interface WorkOrder {
  work_order_id: string
  linked_complaint_ids: string[]
  ward_code: string
  road_id: string
  work_type: string
  repair_method: string
  contractor_id: string
  contractor_name: string
  assigned_at: string
  work_started_at: string
  completed_at: string | null
  area_sqm: number
  cost_inr: number
  sla_hours: number
  sla_met: boolean
  reopened_within_30d: boolean
  engineer_remark: string
}

export interface Ward {
  ward_code: string
  ward_name: string
  zone: string
  assistant_commissioner_office: string
  centroid_lat: number
  centroid_lon: number
  approx_area_km2: number
  population_est: number
  low_lying_index: number
  engineering_crews: number
  localities: string[]
  monsoon_repair_budget_inr_2025: number
}

export interface ContractorRecord {
  contractor_id: string
  contractor_name: string
  empanelled_since: number
  active_wards: string[]
}

export interface RateCard {
  repair_method: string
  unit: string
  standard_rate_inr: number
}

export interface Road {
  road_id: string
  road_name: string
  segment_no: number
  ward_code: string
  road_type: string
  surface: string
  lanes: number
  length_m: number
  start_lat: number
  start_lon: number
  end_lat: number
  end_lon: number
  last_resurfaced: string
  under_dlp: boolean
  bus_route: boolean
}

export interface FloodHotspot {
  hotspot_id: string
  name: string
  ward_code: string
  lat: number
  lon: number
  flood_threshold_mm_per_day: number
  tide_sensitive: boolean
  avg_water_depth_cm: number
  avg_recession_hours: number
  pumping_station_nearby: boolean
  years_flagged_last_5: number
}

export interface RainfallDaily {
  date: string
  station: string
  rainfall_mm: number
  imd_category: string
  imd_alert: string
}

export interface Tide {
  date: string
  high_tide_time: string
  height_m: number
  big_tide_flag: boolean
}

export interface TrafficRecord {
  road_id: string
  peak_hour_vehicles: number
  avg_peak_speed_kmph: number
  congestion_index_0_10: number
  bus_routes_count: number
  two_wheeler_share_pct: number
}

export interface Accident {
  accident_id: string
  occurred_at: string
  ward_code: string
  road_id: string
  lat: number
  lon: number
  vehicle_type: string
  severity: string
  probable_cause: string
}

export interface Facility {
  facility_id: string
  type: string
  name: string
  ward_code: string
  lat: number
  lon: number
  beds_or_students: number
  emergency_services: boolean
  ambulance_entry_road: string
}

// ─── Computed / Aggregated types ──────────────────────────────────────────────

export interface WardBudgetSummary {
  ward_code: string
  ward_name: string
  budget: number
  total_spent: number
  remaining: number
  utilization_pct: number
  work_order_count: number
  complaint_count: number
  reopened_count: number
  reopened_spend: number
  sla_met_count: number
  sla_missed_count: number
}

export interface ContractorScorecard {
  contractor_id: string
  contractor_name: string
  work_order_count: number
  total_billed: number
  avg_cost_per_order: number
  sla_compliance_pct: number
  reopened_rate_pct: number
  avg_cost_deviation_pct: number
  wards_served: string[]
}

export interface AuditFlag {
  rule: string
  severity: 'info' | 'warning' | 'review'
  work_order_id: string
  description: string
  values: Record<string, string | number>
}

export interface SpendingByContractor {
  contractor_id: string
  contractor_name: string
  total: number
  count: number
}

export interface SpendingByMethod {
  repair_method: string
  total: number
  count: number
}
