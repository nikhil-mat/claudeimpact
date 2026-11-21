import { useEffect, useState } from 'react'
import { mockProfile, type Profile } from './mock'

// MOCK DigiLocker sign-in. No network calls; any input is accepted.
type Step = 'start' | 'mobile' | 'otp' | 'fetching'

const fetchSteps = ['Verifying OTP', 'Fetching Aadhaar details', 'Fetching address', 'Linking documents']

export default function DigiLockerLogin({ onLogin }: { onLogin: (p: Profile) => void }) {
  const [step, setStep] = useState<Step>('start')
  const [mobile, setMobile] = useState('9876543210')
  const [otp, setOtp] = useState('123456')
  const [done, setDone] = useState(0)

  useEffect(() => {
    if (step !== 'fetching') return
    if (done >= fetchSteps.length) {
      const t = setTimeout(() => onLogin(mockProfile), 400)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setDone((d) => d + 1), 650)
    return () => clearTimeout(t)
  }, [step, done, onLogin])

  if (step === 'start') {
    return (
      <div className="screen login-start">
        <div className="brand-mark" aria-hidden>CI</div>
        <h1>Report civic issues in your ward</h1>
        <p className="muted">Sign in once with DigiLocker. Your name and address are filled in for you.</p>
        <button className="btn primary block" onClick={() => setStep('mobile')}>
          Sign in with DigiLocker
        </button>
        <p className="demo-note">Demo mode. This is a mock sign-in and no real data is sent anywhere.</p>
      </div>
    )
  }

  return (
    <div className="screen dl-sheet">
      <div className="dl-header">
        <span className="dl-title">DigiLocker</span>
        <span className="demo-pill">Mock</span>
      </div>

      {step === 'mobile' && (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault()
            setStep('otp')
          }}
        >
          <h2>Enter your mobile number</h2>
          <p className="muted small">Use the number linked to your Aadhaar. Any 10 digits work in this demo.</p>
          <label className="field">
            <span>Mobile number</span>
            <input
              inputMode="numeric"
              maxLength={10}
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
            />
          </label>
          <button className="btn primary block" disabled={mobile.length !== 10}>
            Send OTP
          </button>
        </form>
      )}

      {step === 'otp' && (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault()
            setStep('fetching')
          }}
        >
          <h2>Enter OTP</h2>
          <p className="muted small">Sent to +91 XXXXXX{mobile.slice(-4)}. Demo OTP: 123456</p>
          <label className="field">
            <span>6-digit OTP</span>
            <input
              className="otp-input"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            />
          </label>
          <div className="consent small">
            By continuing you allow this app to read your <strong>name, date of birth, gender and address</strong>{' '}
            from DigiLocker.
          </div>
          <button className="btn primary block" disabled={otp.length !== 6}>
            Verify &amp; allow
          </button>
          <button type="button" className="btn ghost block" onClick={() => setStep('mobile')}>
            Change number
          </button>
        </form>
      )}

      {step === 'fetching' && (
        <div className="stack">
          <h2>Fetching your details</h2>
          <ul className="checklist">
            {fetchSteps.map((s, i) => (
              <li key={s} className={i < done ? 'ok' : i === done ? 'busy' : ''}>
                <span className="tick" aria-hidden />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
