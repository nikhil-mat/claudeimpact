import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import {
  fileToSmallDataUrl,
  makeId,
  problemById,
  problems,
  toSmallDataUrl,
  type Analysis,
  type Complaint,
  type GeoFix,
  type Ward,
} from './mock'

type Cam = 'idle' | 'starting' | 'live' | 'analyzing' | 'done'

const ANALYSIS_MS = 2800

export default function ReportForm({ ward, onSubmit }: { ward: Ward; onSubmit: (c: Complaint) => void }) {
  const [problemId, setProblemId] = useState('')
  const [cam, setCam] = useState<Cam>('idle')
  const [photo, setPhoto] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [geo, setGeo] = useState<GeoFix | null>(null)
  const [geoBusy, setGeoBusy] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<number | undefined>(undefined)

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  // Release camera + timers when leaving the screen.
  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      window.clearTimeout(timerRef.current)
    },
    [],
  )

  // Attach the stream once the <video> is rendered.
  useEffect(() => {
    const v = videoRef.current
    if (cam === 'live' && v && streamRef.current) {
      v.srcObject = streamRef.current
      v.play().catch(() => {})
    }
  }, [cam])

  async function openCamera() {
    if (!problemId) return
    if (!navigator.mediaDevices?.getUserMedia) {
      fileRef.current?.click()
      return
    }
    setCam('starting')
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      setCam('live')
    } catch {
      // No camera / permission denied / not HTTPS — fall back to the native picker.
      setCam('idle')
      fileRef.current?.click()
    }
  }

  function capture() {
    const v = videoRef.current
    if (!v || !v.videoWidth) return
    const url = toSmallDataUrl(v, v.videoWidth, v.videoHeight)
    stopStream()
    analyse(url, problemId)
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    analyse(await fileToSmallDataUrl(file), problemId)
  }

  // Fake AI analysis: shimmer for a few seconds, then return canned result.
  function analyse(url: string, pid: string) {
    setPhoto(url)
    setAnalysis(null)
    setCam('analyzing')
    locate()
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      const p = problemById(pid) ?? problems[problems.length - 1]
      setAnalysis({ ...p.analysis, confidence: 88 + Math.floor(Math.random() * 10) })
      setCam('done')
    }, ANALYSIS_MS)
  }

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
        setGeo({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: Math.round(p.coords.accuracy),
          approx: false,
        })
        setGeoBusy(false)
      },
      fallback,
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    )
  }

  function pickProblem(id: string) {
    setProblemId(id)
    if (photo) analyse(photo, id) // re-run the mock analysis for the new category
  }

  function retake() {
    window.clearTimeout(timerRef.current)
    setPhoto(null)
    setAnalysis(null)
    openCamera()
  }

  function submit() {
    if (!photo || !analysis || !geo) return
    setSubmitting(true)
    timerRef.current = window.setTimeout(
      () =>
        onSubmit({
          id: makeId(),
          wardId: ward.id,
          problemId,
          photo,
          analysis,
          location: geo,
          createdAt: Date.now(),
          status: 'Submitted',
        }),
      900,
    )
  }

  const canSubmit = cam === 'done' && !!analysis && !!geo && !submitting

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
            onClick={() => pickProblem(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Camera / photo box */}
      <div
        className={`camera-box ${cam} ${!problemId ? 'disabled' : ''}`}
        onClick={() => {
          if (cam === 'idle') openCamera()
          else if (cam === 'live') capture()
        }}
        role="button"
        tabIndex={0}
        aria-label={cam === 'live' ? 'Take photo' : 'Open camera'}
      >
        {cam === 'idle' && (
          <div className="camera-empty">
            <CameraIcon />
            <span>{problemId ? 'Tap to open camera' : 'Pick a problem first'}</span>
          </div>
        )}
        {cam === 'starting' && <div className="camera-empty">Starting camera…</div>}
        {cam === 'live' && (
          <>
            <video ref={videoRef} playsInline muted />
            <span className="shutter" aria-hidden />
          </>
        )}
        {(cam === 'analyzing' || cam === 'done') && photo && (
          <div className="scan-frame">
            <div className="photo-wrap">
              <img src={photo} alt="Captured issue" />
              {cam === 'analyzing' && (
                <>
                  <span className="shimmer" />
                  <span className="scanline" />
                  <span className="scan-label">Analysing image…</span>
                </>
              )}
              {cam === 'done' && analysis && (
                <span className="bbox">
                  <span className="bbox-tag">
                    {problemById(problemId)?.label} · {analysis.confidence}%
                  </span>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />

      {cam === 'idle' && problemId && (
        <button className="link small" onClick={() => fileRef.current?.click()}>
          Or upload a photo
        </button>
      )}
      {(cam === 'done' || cam === 'live') && (
        <button className="link small" onClick={cam === 'live' ? () => { stopStream(); setCam('idle') } : retake}>
          {cam === 'live' ? 'Cancel' : 'Retake photo'}
        </button>
      )}

      {analysis && (
        <div className="card result">
          <div className="result-title">{analysis.title}</div>
          <div className="result-meta">
            <span className={`sev ${analysis.severity.toLowerCase()}`}>{analysis.severity} severity</span>
            <span className="muted small">Routed to {analysis.department}</span>
          </div>
        </div>
      )}

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

function CameraIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M4 8h3l2-2.5h6L17 8h3v11H4z" strokeLinejoin="round" />
      <circle cx="12" cy="13.5" r="3.5" />
    </svg>
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
