import { useState } from 'react'
import PhotoCapture, { type Capture } from './PhotoCapture'
import {
  cycleStage,
  fmtHours,
  hoursToNextStage,
  latestPhoto,
  matchTender,
  problemById,
  roadById,
  stageLabel,
  wardById,
  woById,
  type Complaint,
  type Cycle,
  type Stage,
} from './mock'

// One complaint: tender timeline, "was it resolved?" check, and re-capture when it wasn't.
export default function ComplaintDetail({
  complaint: c,
  now,
  onUpdate,
}: {
  complaint: Complaint
  now: number
  onUpdate: (c: Complaint) => void
}) {
  const [reopening, setReopening] = useState(false)
  const [shot, setShot] = useState<Capture | null>(null)

  const problem = problemById(c.problemId)
  const ward = wardById(c.wardId)
  const cycle = c.cycles[c.cycles.length - 1]
  const stage = cycleStage(cycle, now)
  const wo = woById(cycle.woId)
  const road = roadById(wo?.road ?? c.roadId)
  const photo = latestPhoto(c)

  const setCycle = (patch: Partial<Cycle>, extra: Cycle[] = []) =>
    onUpdate({ ...c, cycles: [...c.cycles.slice(0, -1), { ...cycle, ...patch }, ...extra] })

  function confirmResolved() {
    setCycle({ verdict: 'yes' })
  }

  function reopen() {
    if (!shot || !ward || !problem?.workType) return
    const used = c.cycles.map((x) => x.woId).filter((x): x is string => !!x)
    const next = matchTender(ward, c.location, problem.workType, used)
    setCycle({ verdict: 'no' }, [{ woId: next?.id ?? null, startedAt: Date.now(), photo: shot.photo, analysis: shot.analysis }])
    setReopening(false)
    setShot(null)
  }

  function skipAhead() {
    const h = hoursToNextStage(cycle, now)
    if (cycle.frozenH !== undefined) setCycle({ frozenH: cycle.frozenH + h })
    else setCycle({ skipH: (cycle.skipH ?? 0) + h })
  }

  return (
    <div className="screen stack detail">
      <div className="detail-photo">
        {photo ? <img src={photo} alt="Reported issue" /> : <span className="thumb-icon lg">{problem?.label[0]}</span>}
      </div>

      <div>
        <div className="detail-head">
          <h2>{problem?.label}</h2>
          <span className={`status s-${stage}`}>{stageLabel[stage]}</span>
        </div>
        <div className="muted small">
          {road ? `${road.name} · ` : ''}
          {ward?.name} · {c.id}
        </div>
        {c.description && <p className="quote">“{c.description}”</p>}
      </div>

      {c.cycles.length > 1 && (
        <div className="rounds small">
          {c.cycles.slice(0, -1).map((x, i) => (
            <div key={i}>
              Round {i + 1}: {woById(x.woId)?.id ?? 'Forwarded'} · you said <strong>not resolved</strong>
            </div>
          ))}
          <div>
            Round {c.cycles.length}: reopened with a new photo
          </div>
        </div>
      )}

      {wo ? (
        <>
          <Timeline stage={stage} a={wo.a} s={wo.s} cDone={wo.c} />

          {stage !== 'submitted' && (
            <section className="card tender">
              <div className="tender-row">
                <span className="muted small">Work order</span>
                <strong>{wo.id}</strong>
              </div>
              <div className="tender-row">
                <span className="muted small">Contractor</span>
                <span>{wo.contractor}</span>
              </div>
              <div className="tender-row">
                <span className="muted small">Repair</span>
                <span>{wo.method}</span>
              </div>
              <div className="tender-row">
                <span className="muted small">Target</span>
                <span>
                  {wo.sla} h{' '}
                  {(stage === 'finished' || stage === 'resolved') && (
                    <span className={wo.slaMet ? 'ok-text' : 'late-text'}>{wo.slaMet ? '· on time' : '· late'}</span>
                  )}
                </span>
              </div>
              {wo.linked > 1 && (
                <div className="muted small linked">{wo.linked - 1} other {wo.linked === 2 ? 'citizen' : 'citizens'} reported this too</div>
              )}
            </section>
          )}
        </>
      ) : (
        <section className="card">
          <strong>Forwarded to {problem?.analysis.department}</strong>
          <p className="muted small">This isn't handled through a road repair tender. The department will follow up directly.</p>
        </section>
      )}

      {stage === 'finished' && !reopening && (
        <section className="card confirm">
          <strong>Was it resolved on your end?</strong>
          <div className="confirm-actions">
            <button className="btn yes" onClick={confirmResolved}>
              ✓ Yes
            </button>
            <button className="btn no" onClick={() => setReopening(true)}>
              ✕ No
            </button>
          </div>
        </section>
      )}

      {reopening && (
        <section className="stack">
          <h2 className="section-title">Show us what's still wrong</h2>
          <PhotoCapture problemId={c.problemId} onChange={setShot} autoOpen />
          <button className="btn primary block" disabled={!shot} onClick={reopen}>
            Reopen complaint
          </button>
          <button className="btn ghost block" onClick={() => { setReopening(false); setShot(null) }}>
            Cancel
          </button>
        </section>
      )}

      {stage === 'resolved' && <div className="resolved-banner">Thanks for confirming. This complaint is closed.</div>}

      {wo && hoursToNextStage(cycle, now) > 0 && (
        <button className="link small demo-skip" onClick={skipAhead}>
          Demo: skip to next stage
        </button>
      )}
    </div>
  )
}

function Timeline({ stage, a, s, cDone }: { stage: Stage; a: number; s: number; cDone: number }) {
  const order: Stage[] = ['submitted', 'allotted', 'progress', 'finished', 'resolved']
  const at = order.indexOf(stage)
  const steps = [
    { label: 'Complaint received', note: 'Sent to your ward office' },
    { label: 'Tender allotted', note: `${fmtHours(a)} after your complaint` },
    { label: 'Work in progress', note: `Started ${fmtHours(s)} after your complaint` },
    { label: 'Work finished', note: `Done in ${fmtHours(cDone)}` },
    { label: 'Confirmed by you', note: 'You said it’s fixed' },
  ]
  return (
    <ol className="timeline">
      {steps.map((st, i) => {
        // "Work in progress" pulses while ongoing; otherwise the next step (what we're waiting on) pulses.
        const ongoing = stage === 'progress'
        const state =
          i < at || (i === at && !ongoing) ? 'done' : (ongoing && i === at) || (!ongoing && i === at + 1) ? 'current' : 'todo'
        return (
          <li key={st.label} className={state}>
            <span className="dot" aria-hidden />
            <span>
              <strong>{st.label}</strong>
              {(state === 'done' || (ongoing && i === at)) && <span className="muted small block">{st.note}</span>}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
