'use client'

import { useState, useMemo } from 'react'
import { DataTable, type Column } from '@/components/data-display/DataTable'

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
  hasWorkOrder: boolean
}

export function ComplaintQueue({ rows, wards }: { rows: ComplaintRow[]; wards: { ward_code: string; ward_name: string }[] }) {
  const [ward, setWard] = useState('')
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')

  const categories = useMemo(() => [...new Set(rows.map(r => r.category_reported))].sort(), [rows])
  const statuses = useMemo(() => [...new Set(rows.map(r => r.status))].sort(), [rows])

  const filtered = useMemo(() => {
    let result = rows
    if (ward) result = result.filter(r => r.ward_code === ward)
    if (status) result = result.filter(r => r.status === status)
    if (category) result = result.filter(r => r.category_reported === category)
    return result
  }, [rows, ward, status, category])

  const columns: Column<ComplaintRow>[] = [
    { key: 'id', label: 'ID', render: r => <span className="font-mono text-[11px]">{r.complaint_id}</span>, sortValue: r => r.complaint_id },
    { key: 'date', label: 'Date', render: r => <span className="whitespace-nowrap">{r.received_at.split('T')[0]}</span>, sortValue: r => r.received_at },
    { key: 'ward', label: 'Ward', render: r => <span className="font-mono">{r.ward_code}</span>, sortValue: r => r.ward_code },
    { key: 'category', label: 'Category', render: r => r.category_reported, sortValue: r => r.category_reported },
    { key: 'locality', label: 'Location', render: r => <span className="truncate max-w-[120px] block">{r.locality_text || '—'}</span> },
    { key: 'channel', label: 'Channel', render: r => r.channel, sortValue: r => r.channel },
    {
      key: 'status', label: 'Status', sortValue: r => r.status,
      render: r => {
        const colors: Record<string, string> = {
          open: 'bg-blue-50 text-blue-700 border-blue-200',
          acknowledged: 'bg-blue-50 text-blue-700 border-blue-200',
          assigned: 'bg-amber-50 text-amber-700 border-amber-200',
          in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
          resolved: 'bg-green-50 text-green-700 border-green-200',
          closed: 'bg-green-50 text-green-700 border-green-200',
          escalated: 'bg-red-50 text-red-700 border-red-200',
        }
        return (
          <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium border rounded-sm ${colors[r.status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
            {r.status}
          </span>
        )
      }
    },
    { key: 'upvotes', label: 'Upvotes', render: r => <span className="font-mono">{r.upvotes}</span>, sortValue: r => r.upvotes },
    {
      key: 'wo', label: 'Work Order',
      render: r => r.hasWorkOrder
        ? <span className="inline-flex px-1.5 py-0.5 text-[10px] font-medium bg-green-50 text-green-700 border border-green-200 rounded-sm">Linked</span>
        : <span className="text-ink-faint">—</span>
    },
  ]

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select value={ward} onChange={e => setWard(e.target.value)} className="border border-edge bg-surface px-2.5 py-1.5 text-xs font-medium text-ink rounded-sm">
          <option value="">All Wards</option>
          {wards.map(w => <option key={w.ward_code} value={w.ward_code}>{w.ward_code} — {w.ward_name}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)} className="border border-edge bg-surface px-2.5 py-1.5 text-xs font-medium text-ink rounded-sm">
          <option value="">All Status</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={category} onChange={e => setCategory(e.target.value)} className="border border-edge bg-surface px-2.5 py-1.5 text-xs font-medium text-ink rounded-sm">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="text-[11px] text-ink-faint ml-auto">{filtered.length.toLocaleString()} complaints</span>
      </div>
      <DataTable
        columns={columns}
        data={filtered}
        rowKey={r => r.complaint_id}
        pageSize={30}
        emptyMessage="No complaints found for the selected filters"
      />
    </div>
  )
}
