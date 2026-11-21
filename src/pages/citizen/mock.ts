// Mock data + helpers for the Citizen view. Everything here is fake (hackathon demo).

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

export type Analysis = {
  title: string
  severity: 'Low' | 'Medium' | 'High'
  confidence: number
  department: string
}

export type Problem = { id: string; label: string; analysis: Omit<Analysis, 'confidence'> }

export type GeoFix = { lat: number; lng: number; accuracy: number; approx: boolean }

export type Complaint = {
  id: string
  wardId: string
  problemId: string
  photo: string
  analysis: Analysis
  location: GeoFix
  createdAt: number
  status: 'Submitted' | 'Assigned' | 'In progress' | 'Resolved'
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

export const wards: Ward[] = [
  { id: 'A', name: 'A Ward', area: 'Colaba, Fort', lat: 18.9067, lng: 72.8147 },
  { id: 'D', name: 'D Ward', area: 'Malabar Hill, Grant Road', lat: 18.9548, lng: 72.8051 },
  { id: 'GN', name: 'G/North Ward', area: 'Dadar, Mahim', lat: 19.0213, lng: 72.8424 },
  { id: 'HW', name: 'H/West Ward', area: 'Bandra West', lat: 19.0596, lng: 72.8295 },
  { id: 'KW', name: 'K/West Ward', area: 'Andheri West, Juhu', lat: 19.1364, lng: 72.8296 },
  { id: 'PN', name: 'P/North Ward', area: 'Malad', lat: 19.1874, lng: 72.8484 },
  { id: 'RC', name: 'R/Central Ward', area: 'Borivali', lat: 19.2307, lng: 72.8567 },
  { id: 'S', name: 'S Ward', area: 'Bhandup, Powai', lat: 19.1176, lng: 72.906 },
]

// Ward guessed from the DigiLocker address (Andheri West).
export const suggestedWardId = 'KW'

export const problems: Problem[] = [
  { id: 'pothole', label: 'Pothole', analysis: { title: 'Pothole detected', severity: 'High', department: 'Roads & Traffic' } },
  { id: 'accident', label: 'Road accident', analysis: { title: 'Road accident detected', severity: 'High', department: 'Traffic Police & Emergency' } },
  { id: 'garbage', label: 'Garbage', analysis: { title: 'Garbage pile-up detected', severity: 'Medium', department: 'Solid Waste Management' } },
  { id: 'streetlight', label: 'Streetlight', analysis: { title: 'Broken streetlight detected', severity: 'Low', department: 'Electrical' } },
  { id: 'waterlogging', label: 'Waterlogging', analysis: { title: 'Waterlogging detected', severity: 'Medium', department: 'Storm Water Drains' } },
  { id: 'other', label: 'Something else', analysis: { title: 'Civic issue detected', severity: 'Low', department: 'Ward Office' } },
]

export const wardById = (id: string | null) => wards.find((w) => w.id === id)
export const problemById = (id: string) => problems.find((p) => p.id === id)

export const makeId = () => 'CMP-' + Date.now().toString(36).slice(-6).toUpperCase()

// --- localStorage (best effort: may be unavailable or full) ---------------
const SESSION_KEY = 'claudeimpact.citizen.session'
const COMPLAINTS_KEY = 'claudeimpact.citizen.complaints'

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
export const loadComplaints = () => read<Complaint[]>(COMPLAINTS_KEY, [])
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
