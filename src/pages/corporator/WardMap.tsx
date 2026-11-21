import { useState } from 'react'
import type { ReactNode } from 'react'
import type { AccidentsFile, Complaint, GeoFile, WardSummary, WorkOrder } from './types.ts'
import { useJson } from './data.ts'
import { EvidenceDrawer, SourceChip } from './Evidence.tsx'
import { formatInr } from './format.ts'
import './map.css'

const W = 900
const H = 225 // 4:1, matches the 320px desktop frame
const LAYERS = ['Hotspots', 'Hospitals', 'Schools', 'Road accidents', 'Open complaints'] as const
type Layer = (typeof LAYERS)[number]
const WIDTHS = [3, 4.5, 7.5, 10.5]
const RAMP = ['var(--f-rule)', 'var(--f-amber)', 'var(--f-red)', 'var(--f-red)']
const RAMP_OPACITY = [1, 1, 0.7, 1]
const INK = 'var(--f-ink)'
const RED = 'var(--f-red)'
const VIOLET = 'var(--f-stamp)'
const SHEET = 'var(--f-sheet)'

const mk = (children: ReactNode) => (
  <svg className="mk" viewBox="0 0 14 14" aria-hidden="true">{children}</svg>
)

export default function WardMap({ ward, workOrders }: { ward: WardSummary; workOrders: WorkOrder[] }) {
  const geo = useJson<GeoFile>('geo.json')
  const comp = useJson<Complaint[]>('complaints.json')
  const acc = useJson<AccidentsFile>('accidents.json')
  const [on, setOn] = useState<Record<Layer, boolean>>({
    Hotspots: true, Hospitals: true, Schools: false, 'Road accidents': true, 'Open complaints': true,
  })
  const error = geo.error ?? comp.error ?? acc.error
  if (error) return <p className="cv-muted">{error}</p>
  if (!geo.data || !comp.data || !acc.data) return <p className="cv-muted">Loading…</p>
  const code = ward.ward_code
  const gw = geo.data.wards.find((w) => w.ward_code === code)
  if (!gw) return <p className="cv-muted">No map geometry for Ward {code}.</p>

  const roads = geo.data.roads.filter((r) => r.ward === code)
  const hotspots = geo.data.hotspots.filter((h) => h.ward === code)
  const fac = geo.data.facilities.filter((f) => f.ward === code)
  const accidents = acc.data.rows.filter((a) => a.ward === code && a.road_caused)
  const complaints = comp.data.filter((c) => c.ward === code && c.is_open && c.lat != null && c.lon != null)
  // Frame the roads and markers (ward polygon is context and may clip); fall back to the ward if there are none.
  const fit: [number, number][] = [
    ...roads.flatMap((r) => r.coords),
    ...hotspots.map((h): [number, number] => [h.lon, h.lat]),
    ...fac.map((f): [number, number] => [f.lon, f.lat]),
    ...accidents.map((a): [number, number] => [a.lon, a.lat]),
    ...complaints.map((c): [number, number] => [c.lon!, c.lat!]),
  ]
  const pts = fit.length ? fit : gw.rings.flat()
  const lons = pts.map((p) => p[0])
  const lats = pts.map((p) => p[1])
  const minLon = Math.min(...lons), maxLon = Math.max(...lons)
  const minLat = Math.min(...lats), maxLat = Math.max(...lats)
  const k = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180)
  const bw = Math.max((maxLon - minLon) * k, 1e-9) * 1.24
  const bh = Math.max(maxLat - minLat, 1e-9) * 1.24
  const scale = Math.min(W / bw, H / bh)
  const ox = (W - (maxLon - minLon) * k * scale) / 2
  const oy = (H - (maxLat - minLat) * scale) / 2
  const px = (lon: number) => ox + (lon - minLon) * k * scale
  const py = (lat: number) => oy + (maxLat - lat) * scale
  const xy = (lon: number, lat: number) => `${px(lon).toFixed(1)},${py(lat).toFixed(1)}`

  const failBy = new Map<string, { road_id: string; road_name: string; failed_inr: number }>()
  for (const w of workOrders) {
    const r = failBy.get(w.road_id) ?? { road_id: w.road_id, road_name: w.road_name, failed_inr: 0 }
    r.failed_inr += w.b_fail
    failBy.set(w.road_id, r)
  }
  const failRows = [...failBy.values()].filter((r) => r.failed_inr > 0).sort((a, b) => b.failed_inr - a.failed_inr)
  const sorted = failRows.map((r) => r.failed_inr).sort((a, b) => a - b)
  const t1 = sorted[Math.floor(sorted.length / 3)] ?? 0
  const t2 = sorted[Math.floor((2 * sorted.length) / 3)] ?? 0
  // 0 none, 1 low, 2 medium, 3 high
  const tier = (v: number) => (v <= 0 ? 0 : v < t1 ? 1 : v < t2 ? 2 : 3)
  const tri = (x: number, y: number) => `${x - 9},${y + 7.5} ${x + 9},${y + 7.5} ${x},${y - 10.5}`
  const counts: Record<Layer, number> = {
    Hotspots: hotspots.length,
    Hospitals: fac.filter((f) => f.type === 'Hospital').length,
    Schools: fac.filter((f) => f.type !== 'Hospital').length,
    'Road accidents': accidents.length,
    'Open complaints': complaints.length,
  }

  return (
    <section className="cv-section cv-map">
      <h3>Ward {code} map: where repairs failed</h3>
      <div className="cv-map-layers">
        {LAYERS.map((l) => (
          <label key={l}>
            <input type="checkbox" checked={on[l]} onChange={() => setOn({ ...on, [l]: !on[l] })} /> {l} <b>{counts[l]}</b>
          </label>
        ))}
      </div>
      <svg className="cv-map-canvas" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Map of Ward ${code}`}>
        <title>{`Ward ${code} map`}</title>
        <path
          fillRule="evenodd"
          fill="var(--f-sheet-2)"
          stroke="var(--f-ink-2)"
          strokeWidth={1.5}
          strokeLinejoin="round"
          d={gw.rings.map((ring) => 'M' + ring.map(([lo, la]) => xy(lo, la)).join('L') + 'Z').join('')}
        >
          <title>{`Ward ${code} boundary`}</title>
        </path>
        {roads.map((r) => {
          const v = failBy.get(r.road_id)?.failed_inr ?? 0
          const i = tier(v)
          return (
            <polyline
              key={r.road_id}
              points={r.coords.map(([lo, la]) => xy(lo, la)).join(' ')}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              stroke={RAMP[i]}
              strokeOpacity={RAMP_OPACITY[i]}
              strokeWidth={WIDTHS[i]}
            >
              <title>{`${r.road_name}: ${formatInr(v)} failed`}</title>
            </polyline>
          )
        })}
        {on.Hotspots &&
          hotspots.map((h) => (
            <polygon
              key={h.id}
              className="m-hit"
              points={tri(px(h.lon), py(h.lat))}
              fill={h.tide_sensitive ? SHEET : INK}
              stroke={INK}
              strokeWidth={h.tide_sensitive ? 2.5 : 1}
              strokeLinejoin="round"
            >
              <title>{`Flood hotspot: ${h.name}${h.tide_sensitive ? ' (tide-sensitive)' : ''}, flagged ${h.years_flagged} yrs`}</title>
            </polygon>
          ))}
        {fac
          .filter((f) => on[f.type === 'Hospital' ? 'Hospitals' : 'Schools'])
          .map((f) => (
            <rect
              key={f.id}
              className="m-hit"
              x={px(f.lon) - 7.5}
              y={py(f.lat) - 7.5}
              width={15}
              height={15}
              rx={1.5}
              fill={f.type === 'Hospital' ? INK : SHEET}
              stroke={INK}
              strokeWidth={1.5}
            >
              <title>{`${f.type}: ${f.name}`}</title>
            </rect>
          ))}
        {on['Road accidents'] &&
          accidents.map((a) => (
            <g key={a.id} className="m-hit" stroke={RED} strokeWidth={2.5} strokeLinecap="round">
              <title>{`${a.severity} accident, ${a.vehicle_type}: ${a.cause} (${a.occurred_at})`}</title>
              <line x1={px(a.lon) - 6} y1={py(a.lat) - 6} x2={px(a.lon) + 6} y2={py(a.lat) + 6} />
              <line x1={px(a.lon) - 6} y1={py(a.lat) + 6} x2={px(a.lon) + 6} y2={py(a.lat) - 6} />
            </g>
          ))}
        {on['Open complaints'] &&
          complaints.map((c) => (
            <circle key={c.id} className="m-hit" cx={px(c.lon!)} cy={py(c.lat!)} r={5.5} fill={VIOLET} fillOpacity={0.7} stroke={VIOLET} strokeWidth={1}>
              <title>{`${c.id}: ${c.category}, ${c.upvotes} upvotes`}</title>
            </circle>
          ))}
      </svg>
      <div className="cv-map-legend">
        <div className="lg-roads">
          <span className="lg-title">Road colour/width = ₹ failed repairs</span>
          {['none', 'low', 'medium', 'high'].map((label, i) => (
            <span key={label}>
              <svg viewBox="0 0 36 14" aria-hidden="true">
                <line x1="4" y1="7" x2="32" y2="7" stroke={RAMP[i]} strokeOpacity={RAMP_OPACITY[i]} strokeWidth={WIDTHS[i]} strokeLinecap="round" />
              </svg>
              {label}
            </span>
          ))}
        </div>
        <span>{mk(<polygon points="7,2 12,11 2,11" fill={INK} stroke={INK} strokeWidth="1" strokeLinejoin="round" />)} hotspot</span>
        <span>{mk(<polygon points="7,2 12,11 2,11" fill={SHEET} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />)} tide-sensitive hotspot</span>
        <span>{mk(<rect x="2" y="2" width="10" height="10" rx="1.5" fill={INK} stroke={INK} strokeWidth="1.5" />)} hospital</span>
        <span>{mk(<rect x="2" y="2" width="10" height="10" rx="1.5" fill={SHEET} stroke={INK} strokeWidth="1.5" />)} school</span>
        <span>{mk(<g stroke={RED} strokeWidth="2.5" strokeLinecap="round"><line x1="3" y1="3" x2="11" y2="11" /><line x1="3" y1="11" x2="11" y2="3" /></g>)} road-caused accident</span>
        <span>{mk(<circle cx="7" cy="7" r="3.5" fill={VIOLET} fillOpacity="0.7" stroke={VIOLET} />)} open complaint</span>
      </div>
      <SourceChip
        files={['wards.geojson', 'roads.geojson', 'work_orders.csv', 'flood_hotspots.csv', 'facilities.csv', 'accidents.csv', 'complaints.csv']}
        rule="Road colour and width use the sum of b_fail (failed-repair rupees) per road_id in this ward, in terciles. Accidents shown are road-caused only. Complaints shown are open with a location."
      />
      <EvidenceDrawer
        label="Roads with failed repairs"
        rows={failRows}
        columns={[
          { key: 'road_id', label: 'Road' },
          { key: 'road_name', label: 'Name' },
          { key: 'failed_inr', label: '₹ failed', inr: true },
        ]}
        filename={`failed_roads_${code}.csv`}
        sumKey="failed_inr"
      />
    </section>
  )
}
