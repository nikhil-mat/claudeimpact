import { useState } from 'react'
import { useJson } from '../data.ts'
import { EvidenceDrawer, SourceChip } from '../Evidence.tsx'
import type { Complaint, WardSummary } from '../types.ts'
import { STAGES, dayNumber, inStage, maxReceived, topCounts } from './stats.ts'
import type { Stage } from './stats.ts'
import './below.css'

const COLS: { key: keyof Complaint & string; label: string }[] = [
  { key: 'id', label: 'ID' },
  { key: 'received_at', label: 'Received' },
  { key: 'category', label: 'Category' },
  { key: 'locality_text', label: 'Locality' },
  { key: 'status', label: 'Status' },
  { key: 'language', label: 'Language' },
  { key: 'description', label: 'Description' },
]

function Top({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <div>
      <h4>{title}</h4>
      <table className="cvb-table">
        <tbody>
          {rows.map(([k, n]) => (
            <tr key={k}>
              <td>{k}</td>
              <td className="cvb-num">{n}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ComplaintsPanel({ ward }: { ward: WardSummary }) {
  const { data, error } = useJson<Complaint[]>('complaints.json')
  const [stage, setStage] = useState<Stage>('received')
  if (error) return <p>{error}</p>
  if (!data) return <p>Loading…</p>
  const rows = data.filter((c) => c.ward === ward.ward_code)
  const today = dayNumber(maxReceived(data))
  const open = rows.filter((c) => c.is_open).sort((a, b) => a.received_at.localeCompare(b.received_at))
  const oldest = open.slice(0, 5)
  const selected = rows.filter((c) => inStage(c, stage))
  const label = STAGES.find((s) => s.key === stage)?.label ?? ''
  return (
    <div className="cvb-body">
      <div className="cvb-funnel">
        {STAGES.map((s, i) => (
          <span key={s.key} style={{ display: 'contents' }}>
            {i === 1 && <span className="cvb-flow" aria-hidden="true" />}
            <button type="button" className={s.key === stage ? 'sel' : undefined} onClick={() => setStage(s.key)}>
              <b>{rows.filter((c) => inStage(c, s.key)).length}</b>
              {s.label}
            </button>
          </span>
        ))}
      </div>
      <EvidenceDrawer
        key={stage}
        label={label}
        rows={selected}
        columns={COLS}
        filename={`complaints_${ward.ward_code.replace('/', '-')}_${stage}.csv`}
      />
      <div>
        <h4>Oldest open complaints</h4>
        {oldest.length === 0 ? (
          <p className="cvb-muted">No open complaints in Ward {ward.ward_code}.</p>
        ) : (
          <div className="cvb-scroll">
            <table className="cvb-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th className="cvb-num">Age (days)</th>
                  <th>Category</th>
                  <th>Locality</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {oldest.map((c) => (
                  <tr key={c.id}>
                    <td className="cvb-id">{c.id}</td>
                    <td className="cvb-num">{today - dayNumber(c.received_at)}</td>
                    <td>{c.category}</td>
                    <td>{c.locality_text}</td>
                    <td>{c.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="cvb-three">
        <Top title="Top categories" rows={topCounts(rows, (c) => c.category)} />
        <Top title="Top localities" rows={topCounts(rows, (c) => c.locality_text)} />
        <Top title="Language mix" rows={topCounts(rows, (c) => c.language, 4)} />
      </div>
      <SourceChip
        files={['complaints.csv', 'localities.csv', 'wards.csv']}
        columns={['status', 'received_at', 'category', 'locality_text', 'language', 'ward_code']}
        rule="Duplicates, rejected and forwarded complaints are excluded from open counts. Ward comes from ward_code, then a locality lookup, then the nearest ward centroid. Age is measured to the latest received_at in the data."
      />
    </div>
  )
}
