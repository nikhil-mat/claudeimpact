import { useJson } from '../data.ts'
import { EvidenceDrawer, SourceChip } from '../Evidence.tsx'
import type { ContextFile, WardSummary } from '../types.ts'
import { weekRows } from './stats.ts'
import './below.css'

const W = 900
const H = 300
const L = 48
const R = 52
const T = 34
const B = 36

export default function RainTidesPanel({ ward }: { ward: WardSummary }) {
  const { data, error } = useJson<ContextFile>('context.json')
  if (error) return <p>{error}</p>
  if (!data) return <p>Loading…</p>
  const rows = weekRows(data.weeks, ward.ward_code)
  const n = rows.length
  if (n === 0) return <p className="cvb-muted">No weekly data.</p>
  const maxC = Math.max(1, ...rows.map((r) => r.complaints))
  const maxR = Math.max(1, ...rows.map((r) => Math.max(r.santacruz_mm, r.colaba_mm)))
  const pw = W - L - R
  const ph = H - T - B
  const step = pw / n
  const x = (i: number) => L + step * (i + 0.5)
  const yc = (v: number) => T + ph - (v / maxC) * ph
  const yr = (v: number) => T + ph - (v / maxR) * ph
  const line = (k: 'santacruz_mm' | 'colaba_mm') => rows.map((r, i) => `${x(i)},${yr(r[k])}`).join(' ')
  const labelEvery = Math.max(1, Math.ceil(n / 10))
  return (
    <div className="cvb-body">
      <svg
        className="cvb-chart"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Weekly complaints in Ward ${ward.ward_code} against rainfall`}
      >
        <line className="axis" x1={L} y1={T + ph} x2={W - R} y2={T + ph} />
        <line className="axis" x1={L} y1={T} x2={L} y2={T + ph} />
        <line className="axis" x1={W - R} y1={T} x2={W - R} y2={T + ph} />
        <text x={L - 6} y={T + 4} textAnchor="end">{maxC}</text>
        <text x={L - 6} y={T + ph} textAnchor="end">0</text>
        <text x={L} y={T - 28}>complaints / week</text>
        <text x={W - R + 6} y={T + 4}>{Math.round(maxR)}</text>
        <text x={W - R + 6} y={T + ph}>0</text>
        <text x={W - R + 6} y={T - 28} textAnchor="end">mm / week</text>
        {rows.map((r, i) => (
          <g key={r.week_start}>
            <rect
              className="bar"
              x={x(i) - step * 0.35}
              y={yc(r.complaints)}
              width={step * 0.7}
              height={T + ph - yc(r.complaints)}
            >
              <title>{`Week of ${r.week_start}: ${r.complaints} complaints, Santacruz ${r.santacruz_mm} mm, Colaba ${r.colaba_mm} mm`}</title>
            </rect>
            {r.red_alert_days && (
              <circle className="mk-red" cx={x(i)} cy={T - 8} r={4}>
                <title>{`Red alert: ${r.red_alert_days}`}</title>
              </circle>
            )}
            {r.big_tide_days && (
              <rect className="mk-tide" x={x(i) - 4} y={T - 24} width={8} height={8}>
                <title>{`Big tide: ${r.big_tide_days}`}</title>
              </rect>
            )}
            {i % labelEvery === 0 && (
              <text x={x(i)} y={T + ph + 16} textAnchor="middle">{r.week_start.slice(5)}</text>
            )}
          </g>
        ))}
        <polyline className="line-a" points={line('santacruz_mm')} />
        <polyline className="line-b" points={line('colaba_mm')} />
      </svg>
      <ul className="cvb-legend">
        <li>
          <i className="cvb-sw-bar" /> Complaints in Ward {ward.ward_code} (left axis)
        </li>
        <li>
          <i className="cvb-sw-line" /> Santacruz rainfall (right axis, solid)
        </li>
        <li>
          <i className="cvb-sw-dash" /> Colaba rainfall (right axis, dashed)
        </li>
        <li>
          <i className="cvb-sw-red" /> Red-alert week
        </li>
        <li>
          <i className="cvb-sw-tide" /> Big-tide week
        </li>
      </ul>
      <SourceChip
        files={['rainfall_daily.csv', 'tides.csv', 'complaints.csv']}
        columns={['rain_mm', 'imd_alert', 'big_tide_flag', 'received_at', 'ward_code']}
        rule="Weeks start on Monday. Rainfall is summed per station per week. A week is marked red-alert if either station had a Red alert day, and big-tide if any day is flagged. Complaints are all complaints received that week in this ward."
      />
      <EvidenceDrawer
        rows={rows}
        columns={[
          { key: 'week_start', label: 'Week start' },
          { key: 'complaints', label: 'Complaints' },
          { key: 'santacruz_mm', label: 'Santacruz mm' },
          { key: 'colaba_mm', label: 'Colaba mm' },
          { key: 'red_alert_days', label: 'Red-alert days' },
          { key: 'big_tide_days', label: 'Big-tide days' },
        ]}
        filename={`rain_tides_${ward.ward_code.replace('/', '-')}.csv`}
      />
    </div>
  )
}
