import { useJson } from '../data.ts'
import type { BriefsFile, WardSummary } from '../types.ts'
import './below.css'

export default function BriefPanel({ ward }: { ward: WardSummary }) {
  const { data, error } = useJson<BriefsFile>('briefs.json')
  if (error) return <p>{error}</p>
  if (!data) return <p>Loading…</p>
  const b = data[ward.ward_code]
  if (!b) return <p className="cvb-muted">No brief for Ward {ward.ward_code}.</p>
  return (
    <div className="cvb-body">
      <div className="cvb-noting">
        <div>
          <span className="cvb-badge">{b.source}</span>
        </div>
        {b.brief
          .split('\n')
          .filter((p) => p.trim())
          .map((p, i) => (
            <p key={i}>{p}</p>
          ))}
      </div>
      <p className="cvb-muted">Work orders cited: {b.wo_ids.length ? b.wo_ids.join(', ') : 'none'}</p>
    </div>
  )
}
