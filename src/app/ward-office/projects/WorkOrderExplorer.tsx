'use client'

import { useState, useMemo } from 'react'
import { DataTable, type Column } from '@/components/data-display/DataTable'

interface WORow {
  work_order_id: string
  ward_code: string
  road_name: string
  contractor_name: string
  repair_method: string
  area_sqm: number
  cost_inr: number
  sla_met: boolean
  reopened: boolean
  assigned_at: string
  completed_at: string | null
  linked_complaints: number
}

function formatINR(amount: number): string {
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2)} Cr`
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(2)} L`
  return `₹${amount.toLocaleString('en-IN')}`
}

export function WorkOrderExplorer({ rows, wards }: { rows: WORow[]; wards: { ward_code: string; ward_name: string }[] }) {
  const [ward, setWard] = useState('')

  const filtered = useMemo(() => {
    if (!ward) return rows
    return rows.filter(r => r.ward_code === ward)
  }, [rows, ward])

  const columns: Column<WORow>[] = [
    { key: 'id', label: 'WO ID', render: r => <span className="font-mono text-[11px]">{r.work_order_id}</span>, sortValue: r => r.work_order_id },
    { key: 'ward', label: 'Ward', render: r => <span className="font-mono">{r.ward_code}</span>, sortValue: r => r.ward_code },
    { key: 'road', label: 'Road', render: r => <span className="truncate max-w-[140px] block">{r.road_name}</span>, sortValue: r => r.road_name },
    { key: 'contractor', label: 'Contractor', render: r => r.contractor_name, sortValue: r => r.contractor_name },
    { key: 'method', label: 'Method', render: r => r.repair_method },
    { key: 'cost', label: 'Cost', render: r => <span className="font-mono">{formatINR(r.cost_inr)}</span>, sortValue: r => r.cost_inr },
    { key: 'area', label: 'Area (sqm)', render: r => <span className="font-mono">{r.area_sqm}</span>, sortValue: r => r.area_sqm },
    { key: 'complaints', label: 'Complaints', render: r => <span className="font-mono">{r.linked_complaints}</span>, sortValue: r => r.linked_complaints },
    {
      key: 'sla', label: 'SLA',
      render: r => r.sla_met
        ? <span className="inline-flex px-1.5 py-0.5 text-[10px] font-medium bg-green-50 text-green-700 border border-green-200 rounded-sm">Met</span>
        : <span className="inline-flex px-1.5 py-0.5 text-[10px] font-medium bg-red-50 text-red-700 border border-red-200 rounded-sm">Missed</span>,
      sortValue: r => r.sla_met ? 1 : 0,
    },
    {
      key: 'status', label: 'Status',
      render: r => {
        if (r.reopened) return <span className="inline-flex px-1.5 py-0.5 text-[10px] font-medium bg-red-50 text-red-700 border border-red-200 rounded-sm">Reopened</span>
        if (r.completed_at) return <span className="inline-flex px-1.5 py-0.5 text-[10px] font-medium bg-green-50 text-green-700 border border-green-200 rounded-sm">Completed</span>
        return <span className="inline-flex px-1.5 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-sm">In Progress</span>
      }
    },
  ]

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select value={ward} onChange={e => setWard(e.target.value)} className="border border-edge bg-surface px-2.5 py-1.5 text-xs font-medium text-ink rounded-sm">
          <option value="">All Wards</option>
          {wards.map(w => <option key={w.ward_code} value={w.ward_code}>{w.ward_code} — {w.ward_name}</option>)}
        </select>
        <span className="text-[11px] text-ink-faint ml-auto">{filtered.length.toLocaleString()} work orders</span>
      </div>
      <DataTable
        columns={columns}
        data={filtered}
        rowKey={r => r.work_order_id}
        pageSize={30}
        emptyMessage="No work orders found for the selected ward"
      />
    </div>
  )
}
