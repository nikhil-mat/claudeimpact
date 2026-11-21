// Builds public/ward-officer/facts.json from the Claude Impact Lab event data.
// All numbers are computed here, in code. The AI agents only write words around them.
// Usage: node scripts/ward-officer/build-facts.mjs <path-to-Claude-Impact-Labs-data-2/data>
// Audit flags (warranty/DLP, over-billed, double bills) come from the shared audit engine,
// engine/out/audit_flags.csv (run engine/build.py first), so Ward Desk and the Corporator view agree.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert'

// Minimal RFC 4180 CSV parser (quotes, escaped quotes, newlines inside quotes).
export function parseCsv(text) {
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
    else if (ch === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = '' }
    else field += ch
  }
  if (field || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row) }
  const [head, ...body] = rows.filter((r) => r.length > 1 || r[0])
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])))
}
assert.deepStrictEqual(parseCsv('a,b\n"x, ""y""",2\r\n'), [{ a: 'x, "y"', b: '2' }])

const dir = process.argv[2]
if (!dir) { console.error('Pass the event data folder'); process.exit(1) }
const rd = (f) => parseCsv(readFileSync(join(dir, f), 'utf8'))
const wards = rd('wards.csv'), wo = rd('work_orders.csv'), roads = rd('roads.csv'), rate = rd('rate_card.csv')
const comps = rd('complaints.csv'), acc = rd('accidents.csv'), fac = rd('facilities.csv'), flood = rd('flood_hotspots.csv')
const traffic = rd('traffic.csv'), rain = rd('rainfall_daily.csv')

const num = (x) => Number(x) || 0
const RATE = Object.fromEntries(rate.map((r) => [r.repair_method, r]))
const ROAD = Object.fromEntries(roads.map((r) => [r.road_id, r]))
const TRAF = Object.fromEntries(traffic.map((t) => [t.road_id, t]))
const expected = (w) => {
  const r = RATE[w.repair_method]
  if (!r) return 0
  return num(r.standard_rate_inr) * (r.unit === 'per sqm' ? num(w.area_sqm) : 1)
}
// Complaint "kind", read from category plus text (about 18% of categories are wrong).
const kind = (c) => {
  const s = `${c.category_reported} ${c.description} ${c.photo_description}`
  return /pothole|khadd|gadd|crater|cave|paver|गड्ढ|खड्ड/i.test(s) ? 'road' : /manhole|chamber|gutter lid|dhakkan|gutter ka|झाकण/i.test(s) ? 'manhole' : /water|flood|drain|nullah|paani/i.test(s) ? 'water' : 'other'
}
const OVERBILL_RATIO = 1.35 // engine threshold (engine/build.py RATE_TOLERANCE)

// Heavy-rain days (any station >= 64.5 mm, IMD "Heavy" or worse) for fairness context.
const heavyDays = new Set(rain.filter((r) => num(r.rainfall_mm) >= 64.5).map((r) => r.date))

// ---- who-should-have-paid flags: from the shared audit engine ----
const ENGINE_FLAGS = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'engine', 'out', 'audit_flags.csv')
const engine = parseCsv(readFileSync(ENGINE_FLAGS, 'utf8'))
const flags = []
for (const f of engine) {
  const amount = num(f.amount_at_issue_inr)
  if (f.flag === 'Paid during DLP' && f.confidence === 'High')
    flags.push({ type: 'warranty', wo: f.work_order_id, amount, why: 'Road under defect liability period: the original road contractor should repair free, not a paid job' })
  else if (f.flag === 'Over-billed vs rate card') {
    const w = wo.find((x) => x.work_order_id === f.work_order_id), ratio = +(num(w.cost_inr) / expected(w)).toFixed(2)
    flags.push({ type: 'overbill', wo: f.work_order_id, amount, ratio, why: `Billed ${ratio.toFixed(2)}x the rate card` })
  } else if (f.flag === 'Possible double billing') {
    const twin = (f.evidence.match(/twin (WO25-\d{5})/) ?? [])[1]
    flags.push({ type: 'double', wo: f.work_order_id, amount, twin, why: f.reason })
  }
}
// Utility-trench remarks are shown for context but not counted (not part of the engine's audit).
for (const w of wo) if (/trench/i.test(w.engineer_remark)) flags.push({ type: 'utility', wo: w.work_order_id, amount: num(w.cost_inr), why: 'Engineer remark says utility trench: recover from the utility that dug' })
const WO = Object.fromEntries(wo.map((w) => [w.work_order_id, w]))
assert.strictEqual(Object.keys(WO).length, wo.length, 'work_order_id must be unique')

// ---- next-rupee road risk ----
const hav = (a, b, c, d) => { const R = 6371e3, t = Math.PI / 180, x = Math.sin((c - a) * t / 2) ** 2 + Math.cos(a * t) * Math.cos(c * t) * Math.sin((d - b) * t / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)) }
function roadRisk(r) {
  const mid = [(num(r.start_lat) + num(r.end_lat)) / 2, (num(r.start_lon) + num(r.end_lon)) / 2]
  const jobs = wo.filter((w) => w.road_id === r.road_id)
  const potJobs = jobs.filter((w) => w.work_type === 'Pothole')
  const reopens = jobs.filter((w) => w.reopened_within_30d === 'Y').length
  const coldFails = potJobs.filter((w) => w.repair_method === 'Cold mix patch' && w.reopened_within_30d === 'Y').length
  const accs = acc.filter((a) => a.road_id === r.road_id && /Pothole|Uneven|Waterlogged/.test(a.probable_cause))
  const accScore = accs.reduce((s, a) => s + ({ Fatal: 5, Grievous: 3 }[a.severity] ?? 1), 0)
  const hospitals = fac.filter((f) => f.ambulance_entry_road === r.road_id && f.type === 'Hospital')
  const schools = fac.filter((f) => f.ambulance_entry_road === r.road_id && f.type === 'School')
  const nearFlood = flood.filter((h) => hav(mid[0], mid[1], num(h.lat), num(h.lon)) < 600)
  const t = TRAF[r.road_id]
  const ageYears = r.last_resurfaced ? (new Date('2025-10-01') - new Date(r.last_resurfaced)) / 3.156e10 : 0
  const score = reopens * 2 + accScore * 3 + hospitals.length * 6 + schools.length * 2 + nearFlood.length * 4 +
    (r.bus_route === 'Y' ? 2 : 0) + num(t?.congestion_index_0_10) * 0.5 + Math.min(ageYears, 10) * 0.5
  const avgArea = potJobs.length ? potJobs.reduce((s, w) => s + num(w.area_sqm), 0) / potJobs.length : 10
  let method, cost
  if (r.under_dlp === 'Y') { method = 'Call original contractor (under warranty)'; cost = 0 }
  else if (coldFails >= 2 || r.surface === 'Asphalt' && reopens >= 4) { method = 'Mastic asphalt'; cost = Math.round(avgArea * 4200) }
  else { method = 'Hot mix patch'; cost = Math.round(avgArea * 2600) }
  return {
    road: r.road_id, name: r.road_name, segment: num(r.segment_no), surface: r.surface, underWarranty: r.under_dlp === 'Y', busRoute: r.bus_route === 'Y',
    score: +score.toFixed(1), jobs: jobs.length, reopens, coldFails, accidents: accs.length, fatal: accs.filter((a) => a.severity === 'Fatal').length,
    hospitals: hospitals.map((h) => h.name), schools: schools.length, floodSpots: nearFlood.map((h) => h.name), ageYears: +ageYears.toFixed(1),
    spent: jobs.reduce((s, w) => s + num(w.cost_inr), 0), method, estCost: cost,
  }
}

// ---- citizen-connected views ----
const DATA_AS_OF = '2025-10-10 23:59'
const SLA_BY_KIND = { manhole: 24, water: 48, road: 72, other: 168 } // hours, when no work order gives one
const addH = (s, h) => new Date(new Date(s.replace(' ', 'T') + 'Z').getTime() + h * 36e5).toISOString().slice(0, 16).replace('T', ' ')
function citizenView(wc, jobs) {
  const byComplaint = {}
  for (const j of jobs) for (const id of j.linked_complaint_ids.split('|').filter(Boolean)) byComplaint[id] = j
  // 1. "Was it fixed?": complaints whose linked repair reopened within 30 days = citizen says No.
  // One card per reopened job, with how many citizens said No.
  const nfByWo = {}
  for (const c of wc.filter((c) => byComplaint[c.complaint_id]?.reopened_within_30d === 'Y')) (nfByWo[byComplaint[c.complaint_id].work_order_id] ??= []).push(c)
  const notFixed = Object.values(nfByWo).sort((x, y) => y.length - x.length).slice(0, 6).map((cs) => {
    const c = cs[0], j = byComplaint[c.complaint_id]
    return { id: c.complaint_id, citizens: cs.length, wo: j.work_order_id, road: ROAD[j.road_id]?.road_name ?? j.road_id, contractor: j.contractor_name.replace(' (synthetic)', ''), method: j.repair_method, fixedAt: j.completed_at, locality: c.locality_text }
  })
  const notFixedCount = wc.filter((c) => byComplaint[c.complaint_id]?.reopened_within_30d === 'Y').length
  // 2. Smart inbox: open complaints grouped by locality + kind (duplicates across channels/languages).
  const open = wc.filter((c) => c.status === 'Open' || c.status === 'In Progress')
  const groups = {}
  for (const c of open) (groups[c.locality_text + '|' + kind(c)] ??= []).push(c)
  const inbox = Object.values(groups).sort((a, b) => b.length - a.length).slice(0, 6).map((g) => ({
    key: g[0].locality_text + '|' + kind(g[0]), locality: g[0].locality_text, kind: kind(g[0]), count: g.length, ids: g.map((c) => c.complaint_id),
    channels: [...new Set(g.map((c) => c.channel))], langs: [...new Set(g.map((c) => c.language))], upvotes: g.reduce((s, c) => s + num(c.upvotes), 0),
    misfiled: g.filter((c) => kind(c) === 'road' && !/pothole|cave|paver/i.test(c.category_reported)).length, sample: g[0].description.slice(0, 140),
  }))
  // 3. Journey + deadline for the oldest open complaints.
  const journey = open.sort((a, b) => a.received_at.localeCompare(b.received_at)).slice(0, 5).map((c) => {
    const j = byComplaint[c.complaint_id], sla = j ? num(j.sla_hours) : SLA_BY_KIND[kind(c)], due = addH(c.received_at, sla)
    return { id: c.complaint_id, locality: c.locality_text, kind: kind(c), received: c.received_at, assigned: j?.assigned_at ?? '', due, overdueDays: Math.max(0, Math.round((new Date(DATA_AS_OF) - new Date(due)) / 864e5)), status: c.status }
  })
  // 4. Not-our-road: rejected / forwarded complaints, with who owns the road.
  const bounced = wc.filter((c) => /^(Rejected - Not BMC road|Forwarded to MMRDA\/PWD)/.test(c.status))
  const handoff = bounced.slice(0, 5).map((c) => ({ id: c.complaint_id, locality: c.locality_text, kind: kind(c), status: c.status, owner: c.status.startsWith('Forwarded') ? 'MMRDA / PWD' : 'Other agency (MMRDA / PWD / MSRDC)', upvotes: num(c.upvotes), text: c.description.slice(0, 120) }))
  return { notFixed, notFixedCount, inbox, openCount: open.length, journey, handoff, handoffCount: bounced.length }
}

// ---- per-ward facts ----
const out = { generatedFrom: 'Claude-Impact-Labs-data-2 (synthetic)', overbillRatio: OVERBILL_RATIO, wards: [] }
for (const wd of wards) {
  const code = wd.ward_code
  const jobs = wo.filter((w) => w.ward_code === code)
  const spent = jobs.reduce((s, w) => s + num(w.cost_inr), 0)
  const wf = flags.filter((f) => WO[f.wo].ward_code === code).map((f) => {
    const w = WO[f.wo]
    return { ...f, road: w.road_id, roadName: ROAD[w.road_id]?.road_name ?? '', contractor: w.contractor_name.replace(' (synthetic)', ''), date: w.completed_at.slice(0, 10), cost: num(w.cost_inr), method: w.repair_method, heavyRainWeek: [...Array(7)].some((_, k) => heavyDays.has(new Date(new Date(w.completed_at.slice(0, 10)).getTime() - k * 864e5).toISOString().slice(0, 10))) }
  })
  // Dedup: one work order counts once, at its largest flagged amount.
  const perWo = {}
  // Utility-trench remarks look like evenly spread filler text, so they are "worth checking", not counted in the headline.
  for (const f of wf) if (f.type !== 'utility') perWo[f.wo] = Math.max(perWo[f.wo] ?? 0, f.amount)
  const byType = {}
  for (const f of wf) { byType[f.type] ??= { count: 0, amount: 0 }; byType[f.type].count++; byType[f.type].amount += f.amount }

  const wc = comps.filter((c) => c.ward_code === code)
  const misfiled = wc.filter((c) => /pothole|crater/i.test(c.photo_description) && !/pothole|cave/i.test(c.category_reported))
  const bounced = wc.filter((c) => /^(Rejected - Not BMC road|Forwarded to MMRDA\/PWD|Closed - Duplicate)/.test(c.status) && /pothole|khadd|gadd|खड्ड|गड्ढ|crater/i.test(c.description + ' ' + c.photo_description + ' ' + c.category_reported))
  const open = wc.filter((c) => c.status === 'Open' || c.status === 'In Progress').sort((a, b) => a.received_at.localeCompare(b.received_at))
  // "Fixed or just closed?": a resolved complaint followed by a new complaint within 50 m, 1 to 30 days later (same-day = likely duplicate).
  const addDay = (s) => new Date(new Date(s).getTime() + 864e5).toISOString().slice(0, 16).replace("T", " ")
  const geo = wc.filter((c) => c.lat && c.lon)
  const repeats = []
  for (const c of geo.filter((x) => x.status === 'Resolved' && x.resolved_at)) {
    const end = new Date(new Date(c.resolved_at).getTime() + 30 * 864e5).toISOString().slice(0, 16).replace('T', ' ')
    // Same kind of problem only, nearest match wins.
    const k = kind(c), d = (n) => hav(num(c.lat), num(c.lon), num(n.lat), num(n.lon))
    const again = geo.filter((n) => n.complaint_id !== c.complaint_id && kind(n) === k && n.received_at >= addDay(c.resolved_at) && n.received_at <= end && d(n) <= 50).sort((x, y) => d(x) - d(y))[0]
    if (again) repeats.push({ closed: c.complaint_id, closedAt: c.resolved_at, again: again.complaint_id, againAt: again.received_at, kind: k, metres: Math.round(d(again)), locality: again.locality_text, text: again.description.slice(0, 160), days: +((new Date(again.received_at) - new Date(c.resolved_at)) / 864e5).toFixed(1) })
  }

  const contractors = {}
  for (const w of jobs) {
    const k = w.contractor_name.replace(' (synthetic)', '')
    const c = (contractors[k] ??= { name: k, jobs: 0, reopened: 0, slaMissed: 0, costRatioSum: 0, ratioN: 0, heavyRainJobs: 0 })
    c.jobs++; c.reopened += w.reopened_within_30d === 'Y'; c.slaMissed += w.sla_met === 'N'
    const e = expected(w); if (e) { c.costRatioSum += num(w.cost_inr) / e; c.ratioN++ }
    c.heavyRainJobs += heavyDays.has(w.completed_at.slice(0, 10))
  }
  const roadsHere = roads.filter((r) => r.ward_code === code).map(roadRisk).sort((a, b) => b.score - a.score)
  const pick = (c) => ({ id: c.complaint_id, at: c.received_at, channel: c.channel, category: c.category_reported, text: c.description.slice(0, 220), photo: c.photo_description, status: c.status, locality: c.locality_text, upvotes: num(c.upvotes) })

  out.wards.push({
    code, name: wd.ward_name, office: wd.assistant_commissioner_office, zone: wd.zone,
    budget: num(wd.monsoon_repair_budget_inr_2025), spent, crews: num(wd.engineering_crews), lowLying: num(wd.low_lying_index), population: num(wd.population_est),
    jobs: jobs.length, reopenRate: +(jobs.filter((w) => w.reopened_within_30d === 'Y').length / jobs.length).toFixed(3),
    slaMissRate: +(jobs.filter((w) => w.sla_met === 'N').length / jobs.length).toFixed(3),
    shouldHavePaid: { total: Object.values(perWo).reduce((a, b) => a + b, 0), workOrders: Object.keys(perWo).length, byType },
    flags: wf.sort((a, b) => b.amount - a.amount),
    citizens: citizenView(wc, jobs),
    repeats: { count: repeats.length, examples: repeats.sort((a, b) => a.days - b.days) },
    complaints: { total: wc.length, open: open.length, misfiled: misfiled.length, bounced: bounced.length, oldestOpen: open.slice(0, 5).map(pick), misfiledExamples: misfiled.slice(0, 5).map(pick), bouncedExamples: bounced.slice(0, 5).map(pick) },
    contractors: Object.values(contractors).map((c) => ({ name: c.name, jobs: c.jobs, reopenRate: +(c.reopened / c.jobs).toFixed(2), slaMissRate: +(c.slaMissed / c.jobs).toFixed(2), avgCostVsRate: c.ratioN ? +(c.costRatioSum / c.ratioN).toFixed(2) : null, heavyRainShare: +(c.heavyRainJobs / c.jobs).toFixed(2) })).sort((a, b) => b.jobs - a.jobs),
    nextRupee: roadsHere.slice(0, 8),
  })
}
const city = out.wards.reduce((s, w) => s + w.shouldHavePaid.total, 0)
out.city = { spent: wo.reduce((s, w) => s + num(w.cost_inr), 0), shouldHavePaid: city, flaggedWorkOrders: out.wards.reduce((s, w) => s + w.shouldHavePaid.workOrders, 0) }
assert.ok(city > 0 && city < out.city.spent, 'flag total must be positive and below total spend')

mkdirSync('public/ward-officer', { recursive: true })
writeFileSync('public/ward-officer/facts.json', JSON.stringify(out))
console.log('wards', out.wards.length, 'city', out.city, 'flags by type', Object.entries(flags.reduce((m, f) => (m[f.type] = (m[f.type] ?? 0) + 1, m), {})))
