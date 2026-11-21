/*
 * ============================================================================
 *  PAGE REGISTRY — READ THIS BEFORE ADDING A PAGE (note for humans & agents)
 * ============================================================================
 *
 *  Every page in the app is listed here. The gateway (src/pages/Gateway.tsx)
 *  and the router (src/App.tsx) both read from this list, so this is the ONLY
 *  place you need to register a new page.
 *
 *  Should you add a new page?
 *    - YES if it is a new role/view (like Citizen, Corporator, Ward Officer)
 *      or a distinct top-level screen someone navigates to from the gateway.
 *    - NO if it is a section, tab, or modal inside an existing view — build
 *      that as a component inside that view's folder instead.
 *    - Don't duplicate an existing view. Extend it.
 *
 *  How to add a page:
 *    1. Create the component in src/pages/<Name>View.tsx (one default export).
 *       Use <PageShell> for consistent header + "back to gateway" link.
 *    2. Import it below and add an entry to `pages`:
 *         - path:        URL hash path, lowercase-kebab, e.g. "/ward-officer"
 *         - title:       Shown on the gateway card and page header
 *         - description: One line shown on the gateway card
 *         - component:   The component you created
 *         - status:      "active" (being built) or "planned" (placeholder)
 *    3. That's it — the gateway card and route appear automatically.
 *
 *  Routing is hash-based (#/citizen) so it works on any static host with no
 *  server config. Don't add a router library without discussing it first.
 *
 *  Current priority: Citizen view first, then Corporator and Ward Officer.
 * ============================================================================
 */
import type { ComponentType } from 'react'
import CitizenView from './CitizenView'
import CorporatorView from './CorporatorView'
import WardOfficerView from './WardOfficerView'

export type PageEntry = {
  path: string
  title: string
  description: string
  component: ComponentType
  status: 'active' | 'planned'
}

export const pages: PageEntry[] = [
  {
    path: '/citizen',
    title: 'Citizen',
    description: 'Raise issues in your ward and track what gets done.',
    component: CitizenView,
    status: 'active',
  },
  {
    path: '/corporator',
    title: 'Corporator',
    description: 'See what your ward is asking for and follow up on it.',
    component: CorporatorView,
    status: 'active',
  },
  {
    path: '/ward-officer',
    title: 'Ward Officer',
    description: 'Manage, assign and resolve ward complaints.',
    component: WardOfficerView,
    status: 'active',
  },
]
