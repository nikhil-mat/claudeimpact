import type { ReactNode } from 'react'
import { downloadCsv, formatInr, toCsv } from './format.ts'

export function SourceChip({ files, columns, rule }: { files: string[]; columns?: string[]; rule: string }) {
  return (
    <details className="cv-chip">
      <summary>Source</summary>
      <div className="cv-chip-body">
        <p>
          <strong>Files:</strong> {files.join(', ')}
        </p>
        {columns && columns.length > 0 && (
          <p>
            <strong>Columns:</strong> {columns.join(', ')}
          </p>
        )}
        <p>
          <strong>Rule:</strong> {rule}
        </p>
      </div>
    </details>
  )
}

export function EvidenceDrawer<T extends object>({
  label,
  rows,
  columns,
  filename,
  sumKey,
}: {
  label?: string
  rows: T[]
  columns: { key: keyof T & string; label: string; inr?: boolean }[]
  filename: string
  sumKey?: keyof T & string
}) {
  const show = (r: T, c: { key: keyof T & string; inr?: boolean }): ReactNode => {
    const v = r[c.key] as unknown
    if (Array.isArray(v)) return v.join('|')
    if (v == null) return ''
    if (c.inr && typeof v === 'number') return formatInr(v)
    return String(v)
  }
  const total = sumKey ? rows.reduce((a, r) => a + (Number(r[sumKey]) || 0), 0) : 0
  return (
    <details className="cv-drawer">
      <summary>
        {label ? label + ': ' : ''}Show evidence ({rows.length} rows)
      </summary>
      <div className="cv-scroll">
        <table className="cv-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={c.inr ? 'cv-num' : undefined}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td key={c.key} className={c.inr ? 'cv-num' : undefined}>
                    {show(r, c)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="cv-drawer-foot">
        {sumKey ? <strong className="cv-num">Total: {formatInr(total)}</strong> : <span />}
        <button type="button" onClick={() => downloadCsv(filename, toCsv(rows, columns))}>
          Download CSV
        </button>
      </div>
    </details>
  )
}
