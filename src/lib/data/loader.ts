import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'
import type {
  Complaint, WorkOrder, Ward, ContractorRecord, RateCard, Road,
  FloodHotspot, RainfallDaily, Tide, TrafficRecord, Accident, Facility,
} from './types'

const DATA_DIR = path.join(process.cwd(), 'src', 'data', 'dataset')

function readCsv(filename: string): Record<string, string>[] {
  const raw = fs.readFileSync(path.join(DATA_DIR, filename), 'utf-8')
  const { data } = Papa.parse<Record<string, string>>(raw, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  })
  return data
}

function num(v: string | undefined): number {
  if (!v || v === '') return 0
  const n = parseFloat(v)
  return isNaN(n) ? 0 : n
}
function numOrNull(v: string | undefined): number | null {
  if (!v || v === '') return null
  const n = parseFloat(v)
  return isNaN(n) ? null : n
}
function bool(v: string | undefined): boolean { return v === 'Y' }
function splitList(v: string | undefined, sep = ';'): string[] {
  return v ? v.split(sep).map(s => s.trim()).filter(Boolean) : []
}

// ─── Caches ───────────────────────────────────────────────────────────────────
let _complaints: Complaint[] | null = null
let _workOrders: WorkOrder[] | null = null
let _wards: Ward[] | null = null
let _contractors: ContractorRecord[] | null = null
let _rateCard: RateCard[] | null = null
let _roads: Road[] | null = null
let _floodHotspots: FloodHotspot[] | null = null
let _rainfall: RainfallDaily[] | null = null
let _tides: Tide[] | null = null
let _traffic: TrafficRecord[] | null = null
let _accidents: Accident[] | null = null
let _facilities: Facility[] | null = null

// ─── Loaders ──────────────────────────────────────────────────────────────────

export function loadComplaints(): Complaint[] {
  if (_complaints) return _complaints
  _complaints = readCsv('complaints.csv').map(r => ({
    complaint_id: r.complaint_id || '',
    received_at: r.received_at || '',
    channel: r.channel || '',
    category_reported: r.category_reported || '',
    description: r.description || '',
    language: r.language || '',
    locality_text: r.locality_text || '',
    ward_code: r.ward_code || '',
    lat: numOrNull(r.lat),
    lon: numOrNull(r.lon),
    gps_accuracy_m: numOrNull(r.gps_accuracy_m),
    photo_url: r.photo_url || '',
    photo_description: r.photo_description || '',
    complainant_id: r.complainant_id || '',
    upvotes: num(r.upvotes),
    status: r.status || '',
    resolved_at: r.resolved_at || null,
  }))
  return _complaints
}

export function loadWorkOrders(): WorkOrder[] {
  if (_workOrders) return _workOrders
  _workOrders = readCsv('work_orders.csv').map(r => ({
    work_order_id: r.work_order_id || '',
    linked_complaint_ids: splitList(r.linked_complaint_ids, '|'),
    ward_code: r.ward_code || '',
    road_id: r.road_id || '',
    work_type: r.work_type || '',
    repair_method: r.repair_method || '',
    contractor_id: r.contractor_id || '',
    contractor_name: r.contractor_name || '',
    assigned_at: r.assigned_at || '',
    work_started_at: r.work_started_at || '',
    completed_at: r.completed_at || null,
    area_sqm: num(r.area_sqm),
    cost_inr: num(r.cost_inr),
    sla_hours: num(r.sla_hours),
    sla_met: bool(r.sla_met),
    reopened_within_30d: bool(r.reopened_within_30d),
    engineer_remark: r.engineer_remark || '',
  }))
  return _workOrders
}

export function loadWards(): Ward[] {
  if (_wards) return _wards
  _wards = readCsv('wards.csv').map(r => ({
    ward_code: r.ward_code || '',
    ward_name: r.ward_name || '',
    zone: r.zone || '',
    assistant_commissioner_office: r.assistant_commissioner_office || '',
    centroid_lat: num(r.centroid_lat),
    centroid_lon: num(r.centroid_lon),
    approx_area_km2: num(r.approx_area_km2),
    population_est: num(r.population_est),
    low_lying_index: num(r.low_lying_index),
    engineering_crews: num(r.engineering_crews),
    localities: splitList(r.localities),
    monsoon_repair_budget_inr_2025: num(r.monsoon_repair_budget_inr_2025),
  }))
  return _wards
}

export function loadContractors(): ContractorRecord[] {
  if (_contractors) return _contractors
  _contractors = readCsv('contractors.csv').map(r => ({
    contractor_id: r.contractor_id || '',
    contractor_name: r.contractor_name || '',
    empanelled_since: num(r.empanelled_since),
    active_wards: splitList(r.active_wards),
  }))
  return _contractors
}

export function loadRateCard(): RateCard[] {
  if (_rateCard) return _rateCard
  _rateCard = readCsv('rate_card.csv').map(r => ({
    repair_method: r.repair_method || '',
    unit: r.unit || '',
    standard_rate_inr: num(r.standard_rate_inr),
  }))
  return _rateCard
}

export function loadRoads(): Road[] {
  if (_roads) return _roads
  _roads = readCsv('roads.csv').map(r => ({
    road_id: r.road_id || '',
    road_name: r.road_name || '',
    segment_no: num(r.segment_no),
    ward_code: r.ward_code || '',
    road_type: r.road_type || '',
    surface: r.surface || '',
    lanes: num(r.lanes),
    length_m: num(r.length_m),
    start_lat: num(r.start_lat),
    start_lon: num(r.start_lon),
    end_lat: num(r.end_lat),
    end_lon: num(r.end_lon),
    last_resurfaced: r.last_resurfaced || '',
    under_dlp: bool(r.under_dlp),
    bus_route: bool(r.bus_route),
  }))
  return _roads
}

export function loadFloodHotspots(): FloodHotspot[] {
  if (_floodHotspots) return _floodHotspots
  _floodHotspots = readCsv('flood_hotspots.csv').map(r => ({
    hotspot_id: r.hotspot_id || '',
    name: r.name || '',
    ward_code: r.ward_code || '',
    lat: num(r.lat),
    lon: num(r.lon),
    flood_threshold_mm_per_day: num(r.flood_threshold_mm_per_day),
    tide_sensitive: bool(r.tide_sensitive),
    avg_water_depth_cm: num(r.avg_water_depth_cm),
    avg_recession_hours: num(r.avg_recession_hours),
    pumping_station_nearby: bool(r.pumping_station_nearby),
    years_flagged_last_5: num(r.years_flagged_last_5),
  }))
  return _floodHotspots
}

export function loadRainfall(): RainfallDaily[] {
  if (_rainfall) return _rainfall
  _rainfall = readCsv('rainfall_daily.csv').map(r => ({
    date: r.date || '',
    station: r.station || '',
    rainfall_mm: num(r.rainfall_mm),
    imd_category: r.imd_category || '',
    imd_alert: r.imd_alert || '',
  }))
  return _rainfall
}

export function loadTides(): Tide[] {
  if (_tides) return _tides
  _tides = readCsv('tides.csv').map(r => ({
    date: r.date || '',
    high_tide_time: r.high_tide_time || '',
    height_m: num(r.height_m),
    big_tide_flag: bool(r.big_tide_flag),
  }))
  return _tides
}

export function loadTraffic(): TrafficRecord[] {
  if (_traffic) return _traffic
  _traffic = readCsv('traffic.csv').map(r => ({
    road_id: r.road_id || '',
    peak_hour_vehicles: num(r.peak_hour_vehicles),
    avg_peak_speed_kmph: num(r.avg_peak_speed_kmph),
    congestion_index_0_10: num(r.congestion_index_0_10),
    bus_routes_count: num(r.bus_routes_count),
    two_wheeler_share_pct: num(r.two_wheeler_share_pct),
  }))
  return _traffic
}

export function loadAccidents(): Accident[] {
  if (_accidents) return _accidents
  _accidents = readCsv('accidents.csv').map(r => ({
    accident_id: r.accident_id || '',
    occurred_at: r.occurred_at || '',
    ward_code: r.ward_code || '',
    road_id: r.road_id || '',
    lat: num(r.lat),
    lon: num(r.lon),
    vehicle_type: r.vehicle_type || '',
    severity: r.severity || '',
    probable_cause: r.probable_cause || '',
  }))
  return _accidents
}

export function loadFacilities(): Facility[] {
  if (_facilities) return _facilities
  _facilities = readCsv('facilities.csv').map(r => ({
    facility_id: r.facility_id || '',
    type: r.type || '',
    name: r.name || '',
    ward_code: r.ward_code || '',
    lat: num(r.lat),
    lon: num(r.lon),
    beds_or_students: num(r.beds_or_students),
    emergency_services: bool(r.emergency_services),
    ambulance_entry_road: r.ambulance_entry_road || '',
  }))
  return _facilities
}
