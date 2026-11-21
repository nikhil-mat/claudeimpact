import { User, Building2, BarChart3 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  label: string
  path: string
}

export interface RoleConfig {
  id: string
  name: string
  path: string
  accent: string
  accentTailwind: string
  icon: LucideIcon
  description: string
  capabilities: string[]
  navItems: NavItem[]
}

export const ROLES: RoleConfig[] = [
  {
    id: 'citizen',
    name: 'Citizen',
    path: '/citizen',
    accent: '#1565C0',
    accentTailwind: 'accent-citizen',
    icon: User,
    description:
      'Search historical complaints, track repair outcomes, and explore infrastructure data across Mumbai\u2019s wards.',
    capabilities: [
      'Search 6,500+ historical complaints',
      'Track complaint-to-repair outcomes',
      'Explore ward-level infrastructure data',
      'View flood hotspots and risk factors',
    ],
    navItems: [
      { label: 'Dashboard', path: '/citizen' },
      { label: 'Complaints', path: '/citizen/complaints' },
      { label: 'Infrastructure', path: '/citizen/infrastructure' },
    ],
  },
  {
    id: 'ward-office',
    name: 'Ward Office',
    path: '/ward-office',
    accent: '#2E7D32',
    accentTailwind: 'accent-ward',
    icon: Building2,
    description:
      'Monitor complaint queues, review work orders, track SLA compliance, and audit repair quality across wards.',
    capabilities: [
      'Triage complaint queue by ward',
      'Review work order details and SLA status',
      'Audit repairs against rate card standards',
      'Track reopened repairs and DLP compliance',
    ],
    navItems: [
      { label: 'Queue', path: '/ward-office' },
      { label: 'Work Orders', path: '/ward-office/projects' },
      { label: 'Audit', path: '/ward-office/audit' },
      { label: 'Reports', path: '/ward-office/reports' },
    ],
  },
  {
    id: 'corporator',
    name: 'Corporator',
    path: '/corporator',
    accent: '#0D3B66',
    accentTailwind: 'accent-corporator',
    icon: BarChart3,
    description:
      'Investigate ward budgets, audit contractor performance, trace spending, and identify infrastructure risk.',
    capabilities: [
      'Audit ward budget vs spending',
      'Score contractor performance objectively',
      'Detect cost deviations and duplicate billing',
      'Assess flood, traffic, and accident risk',
    ],
    navItems: [
      { label: 'Overview', path: '/corporator' },
      { label: 'Spending', path: '/corporator/spending' },
      { label: 'Contractors', path: '/corporator/contractors' },
      { label: 'Risk', path: '/corporator/risk' },
      { label: 'Methodology', path: '/corporator/methodology' },
    ],
  },
]

export function getRoleByPath(pathname: string): RoleConfig | undefined {
  return ROLES.find((r) => pathname.startsWith(r.path))
}
