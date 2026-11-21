import { useJson } from '../data.ts'
import { EvidenceDrawer, SourceChip } from '../Evidence.tsx'
import type { BriefsFile, SocialPost, WardSummary } from '../types.ts'
import './below.css'

export default function CitizenVoicePanel({ ward }: { ward: WardSummary }) {
  const posts = useJson<SocialPost[]>('social.json')
  const briefs = useJson<BriefsFile>('briefs.json')
  const error = posts.error ?? briefs.error
  if (error) return <p>{error}</p>
  if (!posts.data || !briefs.data) return <p>Loading…</p>
  const rows = posts.data.filter((p) => p.ward === ward.ward_code).sort((a, b) => b.engagement - a.engagement)
  const b = briefs.data[ward.ward_code]
  return (
    <div className="cvb-body">
      {b && (
        <div className="cvb-noting">
          <h4>
            Summary <span className="cvb-badge">{b.source}</span>
          </h4>
          {b.social_summary.split('\n').map((l, i) => (
            <p key={i}>
              {l}
            </p>
          ))}
        </div>
      )}
      <div>
        <h4>Top posts by engagement</h4>
        {rows.length === 0 ? (
          <p className="cvb-muted">No social posts matched Ward {ward.ward_code}.</p>
        ) : (
          rows.slice(0, 5).map((p) => (
            <div className="cvb-post" key={p.id}>
              <span className="cvb-muted">
                {p.source} · {p.posted_at.slice(0, 10)} · <span className="cvb-num">{p.engagement}</span> engagement
              </span>
              <div>{p.text}</div>
            </div>
          ))
        )}
      </div>
      <SourceChip
        files={['social_posts.csv', 'localities.csv']}
        columns={['text', 'likes_or_forwards', 'posted_at']}
        rule="A post is matched to a ward when its text contains a locality name or alias of that ward (longest match wins)."
      />
      <EvidenceDrawer
        rows={rows}
        columns={[
          { key: 'id', label: 'ID' },
          { key: 'posted_at', label: 'Posted' },
          { key: 'source', label: 'Source' },
          { key: 'locality', label: 'Locality' },
          { key: 'engagement', label: 'Engagement' },
          { key: 'text', label: 'Text' },
        ]}
        filename={`social_${ward.ward_code.replace('/', '-')}.csv`}
      />
    </div>
  )
}
