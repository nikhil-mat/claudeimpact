import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { fileToSmallDataUrl, mockAnalysis, problemById, toSmallDataUrl, type Analysis } from './mock'

// Camera box with mock AI analysis. Used by the report form and the "not resolved" re-capture.
type Cam = 'idle' | 'starting' | 'live' | 'analyzing' | 'done'

const ANALYSIS_MS = 2800

export type Capture = { photo: string; analysis: Analysis }

export default function PhotoCapture({
  problemId,
  onChange,
  onCaptureStart,
  autoOpen = false,
}: {
  problemId: string
  onChange: (c: Capture | null) => void
  onCaptureStart?: () => void
  autoOpen?: boolean
}) {
  const [cam, setCam] = useState<Cam>('idle')
  const [photo, setPhoto] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<number | undefined>(undefined)
  const lastProblem = useRef(problemId)

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      window.clearTimeout(timerRef.current)
    },
    [],
  )

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
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      setCam('live')
    } catch {
      setCam('idle') // no camera / denied / not HTTPS → native picker
      fileRef.current?.click()
    }
  }

  function analyse(url: string, pid: string) {
    setPhoto(url)
    setAnalysis(null)
    setCam('analyzing')
    onChange(null)
    onCaptureStart?.()
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      const a = mockAnalysis(pid)
      setAnalysis(a)
      setCam('done')
      onChange({ photo: url, analysis: a })
    }, ANALYSIS_MS)
  }

  // Category changed after a photo was taken → re-run the mock analysis.
  useEffect(() => {
    if (lastProblem.current === problemId) return
    lastProblem.current = problemId
    if (photo) analyse(photo, problemId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemId])

  useEffect(() => {
    if (autoOpen) openCamera()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    if (file) analyse(await fileToSmallDataUrl(file), problemId)
  }

  function retake() {
    window.clearTimeout(timerRef.current)
    setPhoto(null)
    setAnalysis(null)
    onChange(null)
    openCamera()
  }

  return (
    <>
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
      {cam === 'live' && (
        <button className="link small" onClick={() => { stopStream(); setCam('idle') }}>
          Cancel
        </button>
      )}
      {cam === 'done' && (
        <button className="link small" onClick={retake}>
          Retake photo
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
    </>
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
