import {
  complaintStage,
  latestPhoto,
  problemById,
  roadById,
  stageLabel,
  wardById,
  type Complaint,
  type Stage,
} from './mock'

const STEPS: Stage[] = ['allotted', 'progress', 'finished', 'resolved']

export default function MyComplaints({
  complaints,
  now,
  onOpen,
  onNew,
}: {
  complaints: Complaint[]
  now: number
  onOpen: (id: string) => void
  onNew: () => void
}) {
  if (complaints.length === 0) {
    return (
      <div className="screen empty">
        <p>You haven't submitted any complaints yet.</p>
        <button className="btn primary" onClick={onNew}>
          Report a problem
        </button>
      </div>
    )
  }

  return (
    <div className="screen stack">
      {complaints.map((c) => {
        const stage = complaintStage(c, now)
        const photo = latestPhoto(c)
        const problem = problemById(c.problemId)
        const step = STEPS.indexOf(stage)
        return (
          <button key={c.id} className={`card complaint ${stage === 'finished' ? 'needs-action' : ''}`} onClick={() => onOpen(c.id)}>
            {photo ? <img src={photo} alt="" /> : <span className="thumb-icon">{problem?.label[0]}</span>}
            <span className="complaint-body">
              <span className="complaint-top">
                <strong>{problem?.label ?? 'Issue'}</strong>
                {c.cycles.length > 1 && <span className="tag">Reopened</span>}
              </span>
              <span className="muted small">
                {roadById(c.roadId)?.name ?? wardById(c.wardId)?.area} · {wardById(c.wardId)?.name}
              </span>
              <span className={`status s-${stage}`}>
                {stage === 'finished' ? 'Work finished · confirm?' : stageLabel[stage]}
              </span>
              {stage !== 'forwarded' && (
                <span className="mini-progress" aria-hidden>
                  {STEPS.map((s, i) => (
                    <span key={s} className={i <= step ? 'on' : ''} />
                  ))}
                </span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}
