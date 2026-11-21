import { useEffect, useRef, useState } from 'react'
import PhotoCapture, { type Capture } from './PhotoCapture'
import { makeId, matchTender, nearestRoad, problemById, problems, type Complaint, type GeoFix, type Ward } from './mock'

export default function ReportForm({ ward, onSubmit }: { ward: Ward; onSubmit: (c: Complaint) => void }) {
  const [problemId, setProblemId] = useState('')
  const [shot, setShot] = useState<Capture | null>(null)
  const [geo, setGeo] = useState<GeoFix | null>(null)
  const [geoBusy, setGeoBusy] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const timerRef = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  function locate() {
    if (geo || geoBusy) return
    setGeoBusy(true)
    const fallback = () => {
      // Demo fallback: ward centre with a little jitter, flagged as approximate.
      const j = () => (Math.random() - 0.5) * 0.004
      setGeo({ lat: ward.lat + j(), lng: ward.lng + j(), accuracy: 250, approx: true })
      setGeoBusy(false)
    }
    if (!navigator.geolocation) return fallback()
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setGeo({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: Math.round(p.coords.accuracy), approx: false })
        setGeoBusy(false)
      },
      fallback,
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    )
  }

  function submit() {
    if (!shot || !geo) return
    setSubmitting(true)
    const problem = problemById(problemId)
    const tender = problem?.workType ? matchTender(ward, geo, problem.workType) : null
    const road = tender ? null : nearestRoad(ward, geo)
    const now = Date.now()
    timerRef.current = window.setTimeout(
      () =>
        onSubmit({
          id: makeId(),
          wardId: ward.id,
          problemId,
          roadId: tender?.road ?? road?.id ?? null,
          photo: shot.photo,
          analysis: shot.analysis,
          location: geo,
          createdAt: now,
          cycles: [{ woId: tender?.id ?? null, startedAt: now }],
        }),
      900,
    )
  }

  const canSubmit = !!shot && !!geo && !submitting

  return (
    <div className="screen stack report">
      <div className="ward-chip">
        {ward.name} · <span className="muted">{ward.area}</span>
      </div>

      <h2 className="section-title">What's your problem?</h2>
      <div className="problem-grid" role="radiogroup">
        {problems.map((p) => (
          <button
            key={p.id}
            role="radio"
            aria-checked={problemId === p.id}
            className={`chip ${problemId === p.id ? 'selected' : ''}`}
            onClick={() => setProblemId(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <PhotoCapture problemId={problemId} onChange={setShot} onCaptureStart={locate} />

      {(geo || geoBusy) && (
        <div className={`gps ${geo ? 'ok' : ''}`}>
          <PinIcon />
          {geo ? (
            <span>
              GPS location captured
              <span className="muted small block">
                {geo.lat.toFixed(5)}, {geo.lng.toFixed(5)} · ±{geo.accuracy} m{geo.approx ? ' (approx, demo)' : ''}
              </span>
            </span>
          ) : (
            <span>Capturing GPS location…</span>
          )}
        </div>
      )}

      <div className="sticky-cta">
        <button className="btn primary block" disabled={!canSubmit} onClick={submit}>
          {submitting ? 'Submitting…' : 'Submit'}
        </button>
      </div>
    </div>
  )
}

function PinIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.3" />
    </svg>
  )
}
