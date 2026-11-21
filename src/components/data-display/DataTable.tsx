'use client'

import { useState, useMemo } from 'react'
import { clsx } from 'clsx'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

export interface Column<T> {
  key: string
  label: string
  render: (row: T) => React.ReactNode
  sortValue?: (row: T) => string | number
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  pageSize?: number
  emptyMessage?: string
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  rowClassName?: (row: T) => string
}

export function DataTable<T>({
  columns,
  data,
  pageSize = 25,
  emptyMessage = 'No records found',
  rowKey,
  onRowClick,
  rowClassName,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(0)

  const sorted = useMemo(() => {
    if (!sortKey) return data
    const col = columns.find(c => c.key === sortKey)
    if (!col?.sortValue) return data
    const fn = col.sortValue
    return [...data].sort((a, b) => {
      const va = fn(a)
      const vb = fn(b)
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [data, sortKey, sortDir, columns])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const pageData = sorted.slice(page * pageSize, (page + 1) * pageSize)

  function handleSort(key: string) {
    const col = columns.find(c => c.key === key)
    if (!col?.sortValue) return
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(0)
  }

  if (data.length === 0) {
    return (
      <div className="border border-edge p-8 text-center">
        <p className="text-sm text-ink-faint">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="border border-edge">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-alt border-b border-edge">
              {columns.map(col => (
                <th
                  key={col.key}
                  className={clsx(
                    'px-3 py-2 text-left text-[11px] font-semibold tracking-[0.06em] uppercase text-ink-faint whitespace-nowrap',
                    col.sortValue && 'cursor-pointer select-none hover:text-ink',
                    col.className
                  )}
                  onClick={() => handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortValue && (
                      sortKey === col.key ? (
                        sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronsUpDown className="w-3 h-3 opacity-30" />
                      )
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map(row => (
              <tr
                key={rowKey(row)}
                className={clsx(
                  'border-b border-edge last:border-b-0 hover:bg-surface-alt/50 transition-colors',
                  onRowClick && 'cursor-pointer',
                  rowClassName?.(row)
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map(col => (
                  <td key={col.key} className={clsx('px-3 py-2.5 text-xs', col.className)}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      <div className="flex items-center justify-between px-3 py-2 bg-surface-alt border-t border-edge">
        <p className="text-[11px] text-ink-faint">
          {sorted.length.toLocaleString()} records · Page {page + 1} of {totalPages}
        </p>
        <div className="flex gap-1">
          <button
            className="px-2 py-1 text-[11px] font-medium text-ink-faint hover:text-ink disabled:opacity-30 border border-edge rounded-sm"
            onClick={() => setPage(p => p - 1)}
            disabled={page === 0}
          >
            Prev
          </button>
          <button
            className="px-2 py-1 text-[11px] font-medium text-ink-faint hover:text-ink disabled:opacity-30 border border-edge rounded-sm"
            onClick={() => setPage(p => p + 1)}
            disabled={page >= totalPages - 1}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
