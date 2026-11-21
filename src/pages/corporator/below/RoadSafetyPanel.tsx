import { useJson } from '../data.ts'
import { EvidenceDrawer, SourceChip } from '../Evidence.tsx'
import type { Accident, AccidentsFile, WardSummary, WorkOrder } from '../types.ts'
import { causeSeverity, per100 } from './stats.ts'
import './below.css'

export default function RoadSafetyPanel({ ward, workOrders }: { ward: WardSummary; workOrders: WorkOrder[] }) {
  const { data, error } = useJson<AccidentsFile>('accidents.json')
  if (error) return <p>{error}</p>
  if (!data) return <p>Loading…</p>
  const rows = data.rows.filter((a) => a.ward === ward.ward_code)
  const failedN = workOrders.filter((w) => w.reopened).length
  const heldN = workOrders.length - failedN
  const roadCaused = rows.filter((a) => a.road_caused)
  const afterFailed = roadCaused.filter((a) => a.after_failed_repair).length
  const afterHeld = roadCaused.filter((a) => a.after_held_repair).length
  const c = data.city
  const table = causeSeverity(rows)
  return (
    <div className="cvb-body">
      <p>
        <strong className="cvb-num">{rows.length}</strong> accidents in Ward {ward.ward_code}, of which{' '}
        <strong className="cvb-num">{roadCaused.length}</strong> were road-caused ({data.road_causes.join(', ')}).
      </p>
      {table.length === 0 ? (
        <p className="cvb-muted">No accidents recorded in Ward {ward.ward_code}.</p>
      ) : (
        <table className="cvb-table">
          <thead>
            <tr>
              <th>Cause</th>
              <th className="cvb-num">Minor</th>
              <th className="cvb-num">Grievous</th>
              <th className="cvb-num">Fatal</th>
              <th className="cvb-num">Total</th>
            </tr>
          </thead>
          <tbody>
            {table.map((r) => (
              <tr key={r.cause}>
                <td>{r.cause}</td>
                <td className="cvb-num">{r.Minor}</td>
                <td className="cvb-num">{r.Grievous}</td>
                <td className="cvb-num">{r.Fatal}</td>
                <td className="cvb-num">{r.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <table className="cvb-table">
        <thead>
          <tr>
            <th>Road-caused accidents</th>
            <th className="cvb-num">This ward</th>
            <th className="cvb-num">Per 100 repairs (this ward)</th>
            <th className="cvb-num">City baseline (per 100)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>After a failed repair</td>
            <td className="cvb-num">{afterFailed}</td>
            <td className="cvb-num">{per100(afterFailed, failedN)} (of {failedN} repairs)</td>
            <td className="cvb-num">
              {c.after_failed} / {c.failed_repairs.toLocaleString('en-IN')} = {per100(c.after_failed, c.failed_repairs)}
            </td>
          </tr>
          <tr>
            <td>After a held repair</td>
            <td className="cvb-num">{afterHeld}</td>
            <td className="cvb-num">{per100(afterHeld, heldN)} (of {heldN} repairs)</td>
            <td className="cvb-num">
              {c.after_held} / {c.held_repairs.toLocaleString('en-IN')} = {per100(c.after_held, c.held_repairs)}
            </td>
          </tr>
        </tbody>
      </table>
      <p className="cvb-note">
        Counts accidents that happened on a road within {data.window_days} days after a repair there. This does not
        show the repair caused the accident. An accident can follow both a failed and a held repair on the same road,
        so the two counts overlap.
      </p>
      <p className="cvb-muted">Each accident is counted once in the cause table.</p>
      <SourceChip
        files={['accidents.csv', 'work_orders.csv']}
        columns={['probable_cause', 'severity', 'road_id', 'occurred_at', 'completed_at', 'reopened_within_30d']}
        rule={`Road-caused = ${data.road_causes.join(', ')}. After a repair = a work order on the same road completed 0 to ${data.window_days} days before the accident. Failed = re-opened within 30 days. Per 100 uses the ward's failed or held repairs as the base.`}
      />
      <EvidenceDrawer<Accident>
        rows={rows}
        columns={[
          { key: 'id', label: 'ID' },
          { key: 'occurred_at', label: 'When' },
          { key: 'road_id', label: 'Road' },
          { key: 'severity', label: 'Severity' },
          { key: 'cause', label: 'Cause' },
          { key: 'road_caused', label: 'Road-caused' },
          { key: 'after_failed_repair', label: 'After failed' },
          { key: 'after_held_repair', label: 'After held' },
          { key: 'failed_wo_ids', label: 'Failed WOs' },
          { key: 'held_wo_ids', label: 'Held WOs' },
        ]}
        filename={`accidents_${ward.ward_code.replace('/', '-')}.csv`}
      />
    </div>
  )
}
