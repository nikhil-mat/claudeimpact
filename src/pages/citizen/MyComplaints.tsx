import { problemById, wardById, type Complaint } from './mock'

export default function MyComplaints({ complaints, onNew }: { complaints: Complaint[]; onNew: () => void }) {
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
      {complaints.map((c) => (
        <article key={c.id} className="card complaint">
          <img src={c.photo} alt="" />
          <div className="complaint-body">
            <div className="complaint-top">
              <strong>{problemById(c.problemId)?.label ?? 'Issue'}</strong>
              <span className="status">{c.status}</span>
            </div>
            <div className="muted small">
              {wardById(c.wardId)?.name} · {new Date(c.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
            </div>
            <div className="muted small">
              {c.id} · {c.analysis.department}
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}
