// Builds src/data/civic.json from the Claude Impact Lab dataset
// (https://github.com/SumeetGDoshi/Claude-Impact-Labs-data-2, CC BY 4.0, synthetic data).
//
// Usage: node scripts/build-data.mjs ../Claude-Impact-Labs-data-2/data
//
// Output is trimmed to what the app needs. Work order times are stored as hour
// offsets from the first linked complaint, so the app can replay a tender's
// timeline starting from when a citizen submits.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const dataDir = process.argv[2]
if (!dataDir) {
  console.error('Usage: node scripts/build-data.mjs <path-to-dataset/data>')
  process.exit(1)
}

function parseCsv(text) {
  const rows = []
  let row = [], field = '', q = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (ch === '"') q = false
      else field += ch
    } else if (ch === '"') q = true
    else if (ch === ',') { row.push(field); field = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.length > 1 || row[0] !== '') rows.push(row)
      row = []
    } else field += ch
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  const [head, ...body] = rows
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])))
}

const load = (f) => parseCsv(readFileSync(join(dataDir, f), 'utf8'))
const time = (s) => new Date(s.replace(' ', 'T') + ':00Z').getTime()
const round = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d

const wards = load('wards.csv').map((w) => ({
  id: w.ward_code,
  name: `${w.ward_code} Ward`,
  area: w.ward_name,
  lat: +w.centroid_lat,
  lng: +w.centroid_lon,
}))

const roads = load('roads.csv').map((r) => ({
  id: r.road_id,
  name: r.road_name,
  ward: r.ward_code,
  lat: round((+r.start_lat + +r.end_lat) / 2, 6),
  lng: round((+r.start_lon + +r.end_lon) / 2, 6),
}))

const complaints = new Map(load('complaints.csv').map((c) => [c.complaint_id, c]))

const CAP_H = 240 // cap long tails so a demo replay never takes forever
const workOrders = load('work_orders.csv').map((w) => {
  const linked = w.linked_complaint_ids.split('|').filter((id) => complaints.has(id))
  const t0 = linked.length ? Math.min(...linked.map((id) => time(complaints.get(id).received_at))) : time(w.assigned_at)
  const h = (s) => (time(s) - t0) / 3.6e6
  // Clamp so allotted <= started <= finished, all after the complaint.
  const a = Math.min(Math.max(0.5, h(w.assigned_at)), CAP_H - 2)
  const s = Math.min(Math.max(a + 0.5, h(w.work_started_at)), CAP_H - 1)
  const c = Math.min(Math.max(s + 1, h(w.completed_at)), CAP_H)
  return {
    id: w.work_order_id,
    ward: w.ward_code,
    road: w.road_id,
    type: w.work_type,
    method: w.repair_method,
    contractor: w.contractor_name,
    a: round(a),
    s: round(s),
    c: round(c),
    sla: +w.sla_hours,
    slaMet: w.sla_met === 'Y',
    linked: linked.length,
  }
})

// Example history for the demo citizen: real K/W work orders + one of their English complaints.
const seedTypes = ['Pothole', 'Waterlogging', 'Broken paver blocks']
const seeds = seedTypes.map((type) => {
  for (const w of load('work_orders.csv')) {
    if (w.ward_code !== 'K/W' || w.work_type !== type) continue
    const c = w.linked_complaint_ids.split('|').map((id) => complaints.get(id)).find((c) => c?.language === 'en' && c.lat)
    if (c) return { woId: w.work_order_id, type, description: c.description, lat: +c.lat, lng: +c.lon }
  }
  throw new Error('No seed for ' + type)
})

const out = { source: 'Claude Impact Lab Mumbai dataset (synthetic), CC BY 4.0', wards, roads, workOrders, seeds }
const dest = join(dirname(fileURLToPath(import.meta.url)), '../src/data/civic.json')
mkdirSync(dirname(dest), { recursive: true })
writeFileSync(dest, JSON.stringify(out))

// Coverage report
const pairs = new Set(workOrders.map((w) => w.ward + '|' + w.type))
const types = [...new Set(workOrders.map((w) => w.type))]
const gaps = wards.flatMap((wd) => types.filter((t) => !pairs.has(wd.id + '|' + t)).map((t) => `${wd.id}:${t}`))
console.log(`wards ${wards.length}, roads ${roads.length}, work orders ${workOrders.length}, seeds ${seeds.length}`)
console.log(`wards without roads: ${wards.filter((wd) => !roads.some((r) => r.ward === wd.id)).map((w) => w.id).join(', ') || 'none'}`)
console.log(`ward+category pairs with no work order: ${gaps.length ? gaps.join(', ') : 'none'}`)
console.log(`wrote ${dest}`)
