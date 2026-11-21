// ─── Ward Codes ───────────────────────────────────────────────────────────────

export const WARD_CODES = [
  'A', 'B', 'C', 'D', 'E', 'F/N', 'F/S', 'G/N', 'G/S',
  'H/E', 'H/W', 'K/E', 'K/W', 'L', 'M/E', 'M/W',
  'N', 'P/N', 'P/S', 'R/C', 'R/N', 'R/S', 'S', 'T',
] as const

export type WardCode = (typeof WARD_CODES)[number]

// ─── Complaint Types ──────────────────────────────────────────────────────────

export const COMPLAINT_TYPES = [
  { id: 'pothole', label: 'Pothole' },
  { id: 'waterlogging', label: 'Waterlogging' },
  { id: 'sewage_overflow', label: 'Sewage Overflow' },
  { id: 'road_damage', label: 'Road Damage' },
  { id: 'drain_blocked', label: 'Drain Blocked' },
  { id: 'streetlight', label: 'Streetlight' },
  { id: 'other', label: 'Other' },
] as const

export type ComplaintType = (typeof COMPLAINT_TYPES)[number]['id']

// ─── Departments ──────────────────────────────────────────────────────────────

export const DEPARTMENTS = [
  'Roads',
  'Storm Water Drains',
  'Bridges',
  'Sewerage Operations',
  'Solid Waste Management',
] as const

// ─── Status Types ─────────────────────────────────────────────────────────────

export type ComplaintStatus =
  | 'open'
  | 'acknowledged'
  | 'assigned'
  | 'in_progress'
  | 'resolved'
  | 'escalated'

export type ProjectStatus =
  | 'tendered'
  | 'awarded'
  | 'in_progress'
  | 'completed'
  | 'stalled'
  | 'delayed'

export type Severity = 'low' | 'medium' | 'high'
