'use client'

import { useState, useMemo } from 'react'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { WardFilter } from '@/components/filters/WardFilter'
import { MetricCard } from '@/components/ui/MetricCard'

interface SpendingRow {
  work_order_id: string
  ward_code: string
  road_id: string
  road_name: string
  contractor_name: string
  repair_method: string
  area_sqm: number
  cost_inr: number
  expected_cost: number | null
  deviation_pct: number | null
  sla_met: boolean
  reopened: boolean
  under_dlp: boolean
  assigned_at: string
  completed_at: string | null
}

function formatINR(amount: number): string {
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2)} Cr`
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(2)} L`
  return `₹${amount.toLocaleString('en-IN')}`
}

export function SpendingExplorer({ rows, wards }: { rows: SpendingRow[]; wards: { ward_code: string; ward_name: string }[] }) {
  const [ward, setWard] = useState('')

  const filtered = useMemo(() => {
    if (!ward) return rows
    return rows.filter(r => r.ward_code === ward)
  }, [rows, ward])

  const totalCost = filtered.reduce((s, r) => s + r.cost_inr, 0)
  const flaggedCount = filtered.filter(r => r.deviation_pct !== null && r.deviation_pct > 40).length
  const dlpCount = filtered.filter(r => r.under_dlp).length
  const reopenedCount = filtered.filter(r => r.reopened).length

  const columns: Column<SpendingRow>[] = [
    { key: 'wo_id', label: 'WO ID', render: r => <span className="font-mono text-[11px]">{r.work_order_id}</span>, sortValue: r => r.work_order_id },
    { key: 'ward', label: 'Ward', render: r => <span className="font-mono">{r.ward_code}</span>, sortValue: r => r.ward_code },
    { key: 'road', label: 'Road', render: r => <span className="truncate max-w-[150px] block">{r.road_name}</span>, sortValue: r => r.road_name },
    { key: 'contractor', label: 'Contractor', render: r => r.contractor_name, sortValue: r => r.contractor_name },
    { key: 'method', label: 'Method', render: r => r.repair_method, sortValue: r => r.repair_method },
    { key: 'cost', label: 'Cost', render: r => <span className="font-mono">{formatINR(r.cost_inr)}</span>, sortValue: r => r.cost_inr },
    { key: 'expected', label: 'Expected', render: r => r.expected_cost ? <span className="font-mono">{formatINR(r.expected_cost)}</span> : <span className="text-ink-faint">—</span>, sortValue: r => r.expected_cost ?? 0 },
    {
      key: 'deviation', label: 'Deviation', sortValue: r => r.deviation_pct ?? 0,
      render: r => {
        if (r.deviation_pct === null) return <span className="text-ink-faint">—</span>
        const isHigh = r.deviation_pct > 40
        return <span className={`font-mono ${isHigh ? 'text-flag font-semibold' : r.deviation_pct > 20 ? 'text-progress' : ''}`}>{r.deviation_pct > 0 ? '+' : ''}{r.deviation_pct}%</span>
      }
    },
    {
      key: 'flags', label: 'Flags',
      render: r => {
        const flags: string[] = []
        if (r.deviation_pct !== null && r.deviation_pct > 40) flags.push('COST')
        if (r.under_dlp) flags.push('DLP')
        if (!r.sla_met) flags.push('SLA')
        if (r.reopened) flags.push('REOPEN')
        if (flags.length === 0) return <span className="text-ink-faint">—</span>
        return (
          <div className="flex gap-1 flex-wrap">
            {flags.map(f => (
              <span key={f} className="inline-flex px-1.5 py-0.5 text-[10px] font-medium bg-red-50 text-red-700 border border-red-200 rounded-sm">{f}</span>
            ))}
          </div>
        )
      }
    },
  ]

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <select
          value={ward}
          onChange={e => setWard(e.target.value)}
          className="border border-edge bg-surface px-2.5 py-1.5 text-xs font-medium text-ink rounded-sm"
        >
          <option value="">All Wards</option>
          {wards.map(w => (
            <option key={w.ward_code} value={w.ward_code}>{w.ward_code} — {w.ward_name}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <MetricCard label="Total Cost" value={formatINR(totalCost)} accent="#0D3B66" />
        <MetricCard label="Cost Deviations" value={flaggedCount.toString()} subtext=">40% above rate card" accent="#C4320A" />
        <MetricCard label="DLP Repairs" value={dlpCount.toString()} accent="#C4320A" />
        <MetricCard label="Reopened" value={reopenedCount.toString()} accent="#D4760A" />
      </div>
      <DataTable
        columns={columns}
        data={filtered}
        rowKey={r => r.work_order_id}
        pageSize={30}
        emptyMessage="No work orders found for this ward"
      />
    </div>
  )
}
