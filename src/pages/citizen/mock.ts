// Data + helpers for the Citizen view.
// Wards, roads and work orders come from the Claude Impact Lab dataset (synthetic, CC BY 4.0),
// built into src/data/civic.json by scripts/build-data.mjs. The DigiLocker profile is mocked.
import civic from '../../data/civic.json'

export type Profile = {
  name: string
  dob: string
  gender: string
  aadhaar: string
  mobile: string
  address: string
  documents: string[]
}

export type Ward = { id: string; name: string; area: string; lat: number; lng: number }
export type Road = { id: string; name: string; ward: string; lat: number; lng: number }

/** A work order (tender) from the dataset. a/s/c = hours after first complaint when it was allotted/started/finished. */
export type WorkOrder = {
  id: string
  ward: string
  road: string
  type: string
  method: string
  contractor: string
  a: number
  s: number
  c: number
  sla: number
  slaMet: boolean
  linked: number
}

export type Analysis = {
  title: string
  severity: 'Low' | 'Medium' | 'High'
  confidence: number
  department: string
}

/** workType links a problem to dataset work orders; problems without one are forwarded, not tendered. */
export type Problem = {
  id: string
  label: string
  workType?: string
  analysis: Omit<Analysis, 'confidence'>
}

export type GeoFix = { lat: number; lng: number; accuracy: number; approx: boolean }

/** One attempt at fixing a complaint. A "No, not resolved" starts a new cycle with a new tender. */
export type Cycle = {
  woId: string | null
  startedAt: number
  /** Fixed elapsed demo-hours (example complaints don't move on their own). */
  frozenH?: number
  /** Extra hours added by "skip ahead" in the demo. */
  skipH?: number
  verdict?: 'yes' | 'no'
  photo?: string
  analysis?: Analysis
}

export type Complaint = {
  id: string
  wardId: string
  problemId: string
  roadId: string | null
  description?: string
  photo: string | null
  analysis: Analysis | null
  location: GeoFix
  createdAt: number
  cycles: Cycle[]
}

export type Session = { profile: Profile; wardId: string | null }

// What the fake DigiLocker "returns" after login.
export const mockProfile: Profile = {
  name: 'Aarav Sharma',
  dob: '14 Aug 1996',
  gender: 'Male',
  aadhaar: 'XXXX XXXX 4821',
  mobile: '+91 XXXXX X3210',
  address: 'Flat 7, Shanti Niwas, Andheri West, Mumbai 400058',
  documents: ['Aadhaar card', 'PAN card', 'Driving licence'],
}

export const wards: Ward[] = civic.wards
export const roads: Road[] = civic.roads
export const workOrders: WorkOrder[] = civic.workOrders

// Ward guessed from the DigiLocker address (Andheri West).
export const suggestedWardId = 'K/W'

export const problems: Problem[] = [
  { id: 'pothole', label: 'Pothole', workType: 'Pothole', analysis: { title: 'Pothole detected', severity: 'High', department: 'Roads' } },
  { id: 'waterlogging', label: 'Waterlogging', workType: 'Waterlogging', analysis: { title: 'Waterlogging detected', severity: 'Medium', department: 'Storm Water Drains' } },
  { id: 'manhole', label: 'Open manhole', workType: 'Open or broken manhole', analysis: { title: 'Open manhole detected', severity: 'High', department: 'Sewerage Operations' } },
  { id: 'drain', label: 'Choked drain', workType: 'Choked drain / nullah overflow', analysis: { title: 'Choked drain detected', severity: 'Medium', department: 'Storm Water Drains' } },
  { id: 'cavein', label: 'Road cave-in', workType: 'Road cave-in', analysis: { title: 'Road cave-in detected', severity: 'High', department: 'Roads' } },
  { id: 'paver', label: 'Broken paver blocks', workType: 'Broken paver blocks', analysis: { title: 'Broken paver blocks detected', severity: 'Low', department: 'Roads' } },
  { id: 'accident', label: 'Road accident', analysis: { title: 'Road accident detected', severity: 'High', department: 'Traffic Police' } },
  { id: 'other', label: 'Something else', analysis: { title: 'Civic issue detected', severity: 'Low', department: 'Ward Office' } },
]

export const wardById = (id: string | null) => wards.find((w) => w.id === id)
export const problemById = (id: string) => problems.find((p) => p.id === id)
export const roadById = (id: string | null) => roads.find((r) => r.id === id)
export const woById = (id: string | null) => workOrders.find((w) => w.id === id)

export const makeId = () => 'CMP-' + Date.now().toString(36).slice(-6).toUpperCase()

// --- Tender matching --------------------------------------------------------
const dist2 = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) =>
  (a.lat - b.lat) ** 2 + ((a.lng - b.lng) * Math.cos((a.lat * Math.PI) / 180)) ** 2

/** Use the GPS fix if it's plausibly in the ward (~10 km), else the ward centre. */
function anchor(ward: Ward, loc: GeoFix) {
  return dist2(ward, loc) < 0.09 ** 2 ? loc : ward
}

export function nearestRoad(ward: Ward, loc: GeoFix): Road | null {
  const p = anchor(ward, loc)
  const inWard = roads.filter((r) => r.ward === ward.id)
  return inWard.sort((x, y) => dist2(p, x) - dist2(p, y))[0] ?? null
}

/** Find a tender of the same category: nearest road in the ward first, then anywhere in the ward, then the city. */
export function matchTender(ward: Ward, loc: GeoFix, workType: string, exclude: string[] = []): WorkOrder | null {
  const p = anchor(ward, loc)
  const pool = workOrders.filter((w) => w.type === workType && !exclude.includes(w.id))
  const byRoadDistance = (list: WorkOrder[]) =>
    list
      .map((w) => ({ w, r: roadById(w.road) }))
      .filter((x) => x.r)
      .sort((x, y) => dist2(p, x.r!) - dist2(p, y.r!))[0]?.w ?? null
  return byRoadDistance(pool.filter((w) => w.ward === ward.id)) ?? byRoadDistance(pool)
}

// --- Status (replays the matched tender's timeline from submission) --------
/** Demo clock: one hour of the real tender timeline plays back in this many ms. */
export const HOUR_MS = 250

export type Stage = 'submitted' | 'allotted' | 'progress' | 'finished' | 'resolved' | 'forwarded'

export const stageLabel: Record<Stage, string> = {
  submitted: 'Submitted',
  allotted: 'Tender allotted',
  progress: 'Work in progress',
  finished: 'Work finished',
  resolved: 'Resolved',
  forwarded: 'Forwarded',
}

export const elapsedH = (c: Cycle, now: number) => c.frozenH ?? (now - c.startedAt) / HOUR_MS + (c.skipH ?? 0)

export function cycleStage(c: Cycle, now: number): Stage {
  if (c.verdict === 'yes') return 'resolved'
  const wo = woById(c.woId)
  if (!wo) return 'forwarded'
  const h = elapsedH(c, now)
  if (h < wo.a) return 'submitted'
  if (h < wo.s) return 'allotted'
  if (h < wo.c) return 'progress'
  return 'finished'
}

export const currentCycle = (c: Complaint) => c.cycles[c.cycles.length - 1]
export const complaintStage = (c: Complaint, now: number) => cycleStage(currentCycle(c), now)
export const latestPhoto = (c: Complaint) => [...c.cycles].reverse().find((x) => x.photo)?.photo ?? c.photo

/** Hours to add so the cycle reaches its next stage (for the demo "skip ahead" button). */
export function hoursToNextStage(c: Cycle, now: number): number {
  const wo = woById(c.woId)
  if (!wo) return 0
  const h = elapsedH(c, now)
  const next = [wo.a, wo.s, wo.c].find((t) => t > h)
  return next === undefined ? 0 : next - h + 0.01
}

export const fmtHours = (h: number) => (h < 48 ? `${Math.round(h)} h` : `${Math.round(h / 24)} days`)

// --- Example history for a new demo citizen -------------------------------
export function seedComplaints(now: number): Complaint[] {
  const stageH = (wo: WorkOrder, i: number) => [wo.c + 1, (wo.s + wo.c) / 2, (wo.a + wo.s) / 2][i]
  return civic.seeds.map((s, i) => {
    const wo = woById(s.woId)!
    const problem = problems.find((p) => p.workType === s.type)!
    const createdAt = now - (i + 1) * 3 * 86400e3
    return {
      id: 'CMP-EX' + (i + 1),
      wardId: wo.ward,
      problemId: problem.id,
      roadId: wo.road,
      description: s.description,
      photo: null,
      analysis: null,
      location: { lat: s.lat, lng: s.lng, accuracy: 20, approx: false },
      createdAt,
      cycles: [{ woId: wo.id, startedAt: createdAt, frozenH: stageH(wo, i) }],
    }
  })
}

// --- localStorage (best effort: may be unavailable or full) ---------------
// v2: real ward codes + tender cycles. Older saved data is ignored.
const SESSION_KEY = 'claudeimpact.citizen.v2.session'
const COMPLAINTS_KEY = 'claudeimpact.citizen.v2.complaints'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore — state still lives in memory */
  }
}

export const loadSession = () => read<Session | null>(SESSION_KEY, null)
export const saveSession = (s: Session | null) => write(SESSION_KEY, s)
export const loadComplaints = () => {
  const list = read<Complaint[]>(COMPLAINTS_KEY, [])
  return Array.isArray(list) ? list.filter((c) => Array.isArray(c?.cycles) && c.cycles.length > 0) : []
}
export const saveComplaints = (c: Complaint[]) => write(COMPLAINTS_KEY, c)

// --- Images: downscale so photos fit in localStorage ----------------------
export function toSmallDataUrl(src: CanvasImageSource, w: number, h: number, max = 640) {
  const scale = Math.min(1, max / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * scale)
  canvas.height = Math.round(h * scale)
  canvas.getContext('2d')?.drawImage(src, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.72)
}

export async function fileToSmallDataUrl(file: File) {
  const bmp = await createImageBitmap(file)
  const url = toSmallDataUrl(bmp, bmp.width, bmp.height)
  bmp.close()
  return url
}

export function mockAnalysis(problemId: string): Analysis {
  const p = problemById(problemId) ?? problems[problems.length - 1]
  return { ...p.analysis, confidence: 88 + Math.floor(Math.random() * 10) }
}
