import { useState } from 'react'
import { suggestedWardId, wards, type Profile } from './mock'

export default function WardSelect({
  profile,
  initialWardId,
  onSelect,
}: {
  profile: Profile
  initialWardId: string | null
  onSelect: (wardId: string) => void
}) {
  const [wardId, setWardId] = useState(initialWardId ?? suggestedWardId)

  return (
    <div className="screen stack">
      <section className="card profile-card">
        <div className="verified">Verified via DigiLocker</div>
        <h2>{profile.name}</h2>
        <dl>
          <dt>DOB</dt>
          <dd>{profile.dob}</dd>
          <dt>Gender</dt>
          <dd>{profile.gender}</dd>
          <dt>Aadhaar</dt>
          <dd>{profile.aadhaar}</dd>
          <dt>Address</dt>
          <dd>{profile.address}</dd>
        </dl>
      </section>

      <h2 className="section-title">Select your ward</h2>
      <div className="ward-list" role="radiogroup">
        {wards.map((w) => (
          <button
            key={w.id}
            role="radio"
            aria-checked={wardId === w.id}
            className={`ward-option ${wardId === w.id ? 'selected' : ''}`}
            onClick={() => setWardId(w.id)}
          >
            <span>
              <strong>{w.name}</strong>
              <span className="muted small">{w.area}</span>
            </span>
            {w.id === suggestedWardId && <span className="suggest">From your address</span>}
          </button>
        ))}
      </div>

      <div className="sticky-cta">
        <button className="btn primary block" onClick={() => onSelect(wardId)}>
          Continue
        </button>
      </div>
    </div>
  )
}
