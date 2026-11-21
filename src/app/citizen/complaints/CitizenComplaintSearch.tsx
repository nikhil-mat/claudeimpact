'use client'

import { useState, useMemo } from 'react'
import { Search, ChevronDown, ChevronRight } from 'lucide-react'

interface WOInfo {
  work_order_id: string
  repair_method: string
  sla_met: boolean
  reopened: boolean
  completed_at: string | null
}

interface ComplaintRow {
  complaint_id: string
  received_at: string
  channel: string
  category_reported: string
  description: string
  ward_code: string
  locality_text: string
  status: string
  upvotes: number
  resolved_at: string | null
  work_orders: WOInfo[]
}

export function CitizenComplaintSearch({ rows, wards }: { rows: ComplaintRow[]; wards: { ward_code: string; ward_name: string }[] }) {
  const [ward, setWard] = useState('')
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const pageSize = 25

  const categories = useMemo(() => [...new Set(rows.map(r => r.category_reported))].sort(), [rows])
  const statuses = useMemo(() => [...new Set(rows.map(r => r.status))].sort(), [rows])

  const filtered = useMemo(() => {
    let result = rows
    if (ward) result = result.filter(r => r.ward_code === ward)
    if (status) result = result.filter(r => r.status === status)
    if (category) result = result.filter(r => r.category_reported === category)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(r =>
        r.complaint_id.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.locality_text.toLowerCase().includes(q)
      )
    }
    return result
  }, [rows, ward, status, category, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageData = filtered.slice(page * pageSize, (page + 1) * pageSize)

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-faint" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
            placeholder="Search ID, description, location..."
            className="border border-edge bg-surface pl-8 pr-3 py-1.5 text-xs text-ink rounded-sm w-56 focus:outline-2 focus:outline-edge-focus"
          />
        </div>
        <select value={ward} onChange={e => { setWard(e.target.value); setPage(0) }} className="border border-edge bg-surface px-2.5 py-1.5 text-xs font-medium text-ink rounded-sm">
          <option value="">All Wards</option>
          {wards.map(w => <option key={w.ward_code} value={w.ward_code}>{w.ward_code} — {w.ward_name}</option>)}
        </select>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(0) }} className="border border-edge bg-surface px-2.5 py-1.5 text-xs font-medium text-ink rounded-sm">
          <option value="">All Status</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={category} onChange={e => { setCategory(e.target.value); setPage(0) }} className="border border-edge bg-surface px-2.5 py-1.5 text-xs font-medium text-ink rounded-sm">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="text-[11px] text-ink-faint ml-auto">{filtered.length.toLocaleString()} results</span>
      </div>

      {/* Results */}
      <div className="border border-edge">
        <div className="divide-y divide-edge">
          {pageData.map(c => {
            const isExpanded = expanded === c.complaint_id
            return (
              <div key={c.complaint_id} className="hover:bg-surface-alt/50">
                <button
                  className="w-full text-left px-4 py-3 flex items-start gap-3"
                  onClick={() => setExpanded(isExpanded ? null : c.complaint_id)}
                >
                  <span className="mt-0.5 shrink-0 text-ink-faint">
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="font-mono text-[11px] font-medium text-ink">{c.complaint_id}</span>
                      <span className="text-[11px] text-ink-faint">{c.received_at.split('T')[0]}</span>
                      <span className="font-mono text-[11px] text-ink-faint">{c.ward_code}</span>
                      <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium border rounded-sm ${
                        c.status === 'resolved' || c.status === 'closed'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : c.status === 'escalated'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {c.status}
                      </span>
                      {c.work_orders.length > 0 && (
                        <span className="inline-flex px-1.5 py-0.5 text-[10px] font-medium bg-green-50 text-green-700 border border-green-200 rounded-sm">
                          {c.work_orders.length} WO
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-light">{c.description}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[11px] text-ink-faint">{c.category_reported}</span>
                      <span className="text-[11px] text-ink-faint">{c.channel}</span>
                      {c.locality_text && <span className="text-[11px] text-ink-faint truncate">{c.locality_text}</span>}
                    </div>
                  </div>
                </button>

                {/* Expanded: show linked work orders */}
                {isExpanded && (
                  <div className="px-4 pb-3 ml-7">
                    {c.work_orders.length > 0 ? (
                      <div className="border border-edge rounded-sm overflow-hidden">
                        <div className="px-3 py-1.5 bg-surface-alt border-b border-edge">
                          <p className="text-[11px] font-semibold tracking-[0.06em] uppercase text-ink-faint">Linked Work Orders</p>
                        </div>
                        {c.work_orders.map(wo => (
                          <div key={wo.work_order_id} className="px-3 py-2 border-b border-edge last:border-b-0 flex items-center gap-4 flex-wrap">
                            <span className="font-mono text-[11px] font-medium">{wo.work_order_id}</span>
                            <span className="text-[11px] text-ink-faint">{wo.repair_method}</span>
                            <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium border rounded-sm ${
                              wo.sla_met ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                            }`}>
                              SLA {wo.sla_met ? 'Met' : 'Missed'}
                            </span>
                            {wo.reopened && (
                              <span className="inline-flex px-1.5 py-0.5 text-[10px] font-medium bg-red-50 text-red-700 border border-red-200 rounded-sm">
                                Reopened
                              </span>
                            )}
                            <span className="text-[11px] text-ink-faint">
                              {wo.completed_at ? `Completed ${wo.completed_at.split('T')[0]}` : 'In Progress'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-ink-faint py-1">No linked work orders found for this complaint.</p>
                    )}
                    {c.resolved_at && (
                      <p className="text-[11px] text-ink-faint mt-2">Resolved: {c.resolved_at.split('T')[0]}</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-3 py-2 bg-surface-alt border-t border-edge">
          <p className="text-[11px] text-ink-faint">
            {filtered.length.toLocaleString()} complaints · Page {page + 1} of {totalPages}
          </p>
          <div className="flex gap-1">
            <button className="px-2 py-1 text-[11px] font-medium text-ink-faint hover:text-ink disabled:opacity-30 border border-edge rounded-sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}>Prev</button>
            <button className="px-2 py-1 text-[11px] font-medium text-ink-faint hover:text-ink disabled:opacity-30 border border-edge rounded-sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>Next</button>
          </div>
        </div>
      </div>
    </div>
  )
}
