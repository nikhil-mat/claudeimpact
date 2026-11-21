export type Bucket = 'twin' | 'over' | 'fail' | 'held'
export type BucketSet = { twin: number; over: number; fail: number; held: number }

// work_orders.json : WorkOrder[]  (all 2499 rows)
export type WorkOrder = {
  id: string; ward: string; road_id: string; road_name: string; under_dlp: boolean
  work_type: string; repair_method: string; unit: 'per sqm' | 'per job'; standard_rate_inr: number
  contractor_id: string; contractor_name: string; contractor_since: number   // contractors.csv empanelled_since
  assigned_at: string; work_started_at: string | null; completed_at: string | null
  area_sqm: number; cost_inr: number; expected_inr: number; ratio: number   // ratio 3 dp
  sla_hours: number; sla_met: boolean; reopened: boolean; exp_fail: number  // exp_fail 4 dp
  complaint_ids: string[]; remark: string
  flag_overbilled: boolean; flag_twin: boolean; twin_of: string | null; flag_dlp_review: boolean
  b_twin: number; b_over: number; b_fail: number; b_held: number            // 2 dp
}

// wards.json : WardsFile
export type WardSummary = {
  ward_code: string; ward_name: string; zone: string; population_est: number
  area_km2: number; low_lying_index: number; engineering_crews: number; localities: string[]
  budget_inr: number; spend_inr: number; spend_pct_of_budget: number   // 119.3 = 119.3 %
  jobs: number; buckets: BucketSet                                     // rupees, sum = spend_inr ±1
  per100: BucketSet                                                    // unrounded, 2 dp
  dlp_review_inr: number; dlp_review_jobs: number; dlp_review_per100: number
  fail_rate: number; expected_fail_rate: number                        // 0..1, 4 dp
  sla_missed: number; sla_missed_rate: number
}
export type WardsFile = {
  medians: { spend_pct_of_budget: number; per100: BucketSet; dlp_review_per100: number
             fail_rate: number; expected_fail_rate: number; sla_missed_rate: number }
  wards: WardSummary[]                                                 // sorted by ward_code
}

// briefs.json : BriefsFile
export type Brief = { source: 'claude' | 'template (Claude unavailable)'
                      brief: string; social_summary: string; wo_ids: string[] }
export type BriefsFile = Record<string, Brief>                         // key = ward_code

// complaints.json : Complaint[]  (all 6501 rows)
export type Complaint = {
  id: string; received_at: string; channel: string; category: string
  description: string                                                  // truncated to 200 chars
  language: string; locality_text: string
  ward: string | null; ward_source: 'given' | 'locality' | 'centroid' | null
  lat: number | null; lon: number | null; upvotes: number; status: string
  resolved_at: string | null; is_open: boolean
  road_id: string | null; placement: 'gps' | 'locality' | 'ward' | null // set only when is_open
}

// accidents.json : AccidentsFile
export type Accident = {
  id: string; occurred_at: string; ward: string; road_id: string | null; lat: number; lon: number
  vehicle_type: string; severity: 'Minor' | 'Grievous' | 'Fatal'; cause: string
  road_caused: boolean; after_failed_repair: boolean; after_held_repair: boolean
  failed_wo_ids: string[]; held_wo_ids: string[]
}
export type AccidentsFile = {
  window_days: number; road_causes: string[]
  city: { failed_repairs: number; held_repairs: number; after_failed: number; after_held: number }
  rows: Accident[]
}

// context.json : ContextFile  (Monday-start weeks covering rainfall dates)
export type ContextWeek = {
  week_start: string; santacruz_mm: number; colaba_mm: number          // weekly sums, 1 dp
  red_alert_days: string[]                                             // dates either station is Red
  big_tide_days: string[]                                              // tides.big_tide_flag == 'Y'
  complaints: Record<string, number>                                   // ward -> complaints received that week
}
export type ContextFile = { weeks: ContextWeek[] }

// social.json : SocialPost[]  (all 650 rows)
export type SocialPost = {
  id: string; posted_at: string; source: string; author: string; text: string
  has_media: boolean; engagement: number; ward: string | null; locality: string | null
}

// geo.json : GeoFile   (coordinates are [lon, lat], 5 dp)
export type GeoFile = {
  wards: { ward_code: string; ward_name: string; zone: string; rings: [number, number][][] }[]
  roads: { road_id: string; ward: string; road_name: string; road_type: string; coords: [number, number][] }[]
  hotspots: { id: string; name: string; ward: string; lat: number; lon: number
              tide_sensitive: boolean; threshold_mm: number; years_flagged: number }[]
  facilities: { id: string; type: 'Hospital' | 'School'; name: string; ward: string
                lat: number; lon: number; ambulance_entry_road: string | null }[]
}

// next_rupee.json : NextRupeeFile
export type NextRupeeComponents = { complaints: number; severity: number; failed_repairs: number
  flood: number; traffic: number; accidents: number; facilities: number }
export type NextRupeeRoad = {
  road_id: string; road_name: string; under_dlp: boolean
  score: number                         // 0..100, 1 dp
  components: NextRupeeComponents       // each normalised 0..1 across the city
  reasons: string[]                     // human chips, e.g. "3 open complaints (41 upvotes)"
  work_type: string; method: string; unit: 'per sqm' | 'per job'; method_reopen_rate: number
  est_cost_inr: number; dlp_route: boolean; bmc_cost_inr: number   // dlp_route => bmc_cost_inr 0
  funded: boolean
  open_complaint_ids: string[]; failed_wo_ids: string[]; accident_ids: string[]
  facility_ids: string[]; hotspot_id: string | null; hotspot_m: number | null
}
export type NextRupeeWard = { budget_mode: 'remaining' | 'next_10L'; budget_inr: number
                              allocated_inr: number; candidates: NextRupeeRoad[] }  // score desc
export type NextRupeeFile = { weights: NextRupeeComponents; rule: string
                              wards: Record<string, NextRupeeWard> }
