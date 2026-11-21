import type {
  WardCode,
  ComplaintType,
  ComplaintStatus,
  ProjectStatus,
  Severity,
} from './constants'

// ─── Shared ───────────────────────────────────────────────────────────────────

export interface GeoPoint {
  lat: number
  lng: number
}

export interface StatusEntry {
  status: ComplaintStatus
  date: string // ISO
  note?: string
}

// ─── Citizen ──────────────────────────────────────────────────────────────────

export interface CitizenComplaint {
  id: string
  type: ComplaintType
  description: string
  severity: Severity
  location: GeoPoint & { address: string }
  ward: WardCode
  photos: string[]
  filedDate: string
  status: ComplaintStatus
  statusHistory: StatusEntry[]
  wardResponse?: string
}

// ─── Ward Office ──────────────────────────────────────────────────────────────

export interface QueueItem extends CitizenComplaint {
  assignedTo?: string
  daysOpen: number
  isOverdue: boolean
}

// ─── Corporator ───────────────────────────────────────────────────────────────

export interface AnomalyFlag {
  type:
    | 'repeat_work'
    | 'cost_overrun'
    | 'threshold_gaming'
    | 'delayed'
    | 'complaint_cluster'
  severity: Severity
  description: string
}

export interface Project {
  id: string
  name: string
  ward: WardCode
  department: string
  type: string
  contractor: { id: string; name: string }
  sanctionedAmount: number
  spentAmount: number
  status: ProjectStatus
  startDate: string
  expectedCompletion: string
  actualCompletion?: string
  percentComplete: number
  location: GeoPoint
  anomalyFlags: AnomalyFlag[]
  linkedComplaints: string[]
}

export interface Contractor {
  id: string
  name: string
  totalContractValue: number
  projectCount: number
  completionRate: number
  avgCostOverrun: number
  avgDelayDays: number
  projects: string[]
  wardDistribution: Partial<Record<WardCode, number>>
}
