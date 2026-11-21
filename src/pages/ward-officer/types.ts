// Shapes of the two pre-built files in public/ward-officer/ (see scripts/ward-officer/).
export type Lang = 'en' | 'mr'

export type Flag = {
  type: 'warranty' | 'utility' | 'overbill' | 'double'
  wo: string
  amount: number
  ratio?: number
  twin?: string
  why: string
  road: string
  roadName: string
  contractor: string
  date: string
  cost: number
  method: string
  heavyRainWeek: boolean
  bigTide: boolean
}

export type Complaint = {
  id: string
  at: string
  channel: string
  category: string
  text: string
  photo: string
  status: string
  locality: string
  upvotes: number
}

export type Road = {
  road: string
  name: string
  segment: number
  surface: string
  underWarranty: boolean
  busRoute: boolean
  score: number
  jobs: number
  reopens: number
  coldFails: number
  accidents: number
  fatal: number
  hospitals: string[]
  schools: number
  floodSpots: string[]
  tideSpots: string[]
  tideReopens: number
  ageYears: number
  spent: number
  method: string
  estCost: number
}

export type Ward = {
  code: string
  name: string
  office: string
  zone: string
  budget: number
  spent: number
  crews: number
  lowLying: number
  population: number
  jobs: number
  reopenRate: number
  slaMissRate: number
  shouldHavePaid: { total: number; workOrders: number; byType: Record<string, { count: number; amount: number }> }
  flags: Flag[]
  citizens: {
    notFixed: { id: string; citizens: number; wo: string; road: string; contractor: string; method: string; fixedAt: string; locality: string }[]
    notFixedCount: number
    inbox: { key: string; locality: string; kind: 'road' | 'water' | 'manhole' | 'other'; count: number; ids: string[]; channels: string[]; langs: string[]; upvotes: number; misfiled: number; sample: string }[]
    openCount: number
    journey: { id: string; locality: string; kind: 'road' | 'water' | 'manhole' | 'other'; received: string; assigned: string; due: string; overdueDays: number; status: string }[]
    handoff: { id: string; locality: string; kind: 'road' | 'water' | 'manhole' | 'other'; status: string; owner: string; upvotes: number; text: string }[]
    handoffCount: number
  }
  repeats: { count: number; examples: { closed: string; closedAt: string; again: string; againAt: string; kind: "road" | "water" | "manhole" | "other"; metres: number; locality: string; text: string; days: number }[] }
  placed: { typed: number; gps: number; open: (Complaint & { placedBy: string })[] }
  complaints: {
    total: number
    open: number
    misfiled: number
    bounced: number
    oldestOpen: Complaint[]
    misfiledExamples: Complaint[]
    bouncedExamples: Complaint[]
  }
  contractors: { name: string; jobs: number; reopenRate: number; slaMissRate: number; avgCostVsRate: number | null; heavyRainShare: number }[]
  nextRupee: Road[]
}

export type Facts = { generatedFrom: string; overbillRatio: number; city: { spent: number; shouldHavePaid: number; flaggedWorkOrders: number }; wards: Ward[] }

export type Line = { en: string; mr: string; qc1: boolean; qc2: 'ok' | 'reworded' | 'needs context'; qc2Reason?: string }
export type AgentItem = Line & { key: string; action?: string }
export type AgentBlock = { summary: Line; items: AgentItem[] }
export type WardAgents = {
  triage?: AgentBlock
  auditor?: AgentBlock
  planner?: AgentBlock
  brief?: { morning: Line; corporator: Line }
}
export type Agents = {
  stats: { qc1Pass: number; qc1Fail: number; qc2Reworded: number; qc2Context: number }
  wards: Record<string, WardAgents>
}
