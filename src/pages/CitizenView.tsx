import { useCallback, useState } from 'react'
import DigiLockerLogin from './citizen/DigiLockerLogin'
import WardSelect from './citizen/WardSelect'
import ReportForm from './citizen/ReportForm'
import MyComplaints from './citizen/MyComplaints'
import {
  loadComplaints,
  loadSession,
  problemById,
  saveComplaints,
  saveSession,
  wardById,
  type Complaint,
  type Profile,
  type Session,
} from './citizen/mock'
import './citizen/citizen.css'

// Citizen view (mobile-first). Flow: mock DigiLocker login → pick ward → report → my complaints.
// Screens are internal state (the app router only matches top-level paths).
type Screen = 'report' | 'success' | 'complaints' | 'ward'

const titles: Record<Screen, string> = {
  report: 'Report a problem',
  success: 'Submitted',
  complaints: 'My complaints',
  ward: 'Change ward',
}

export default function CitizenView() {
  const [session, setSession] = useState<Session | null>(loadSession)
  const [complaints, setComplaints] = useState<Complaint[]>(loadComplaints)
  const [screen, setScreen] = useState<Screen>('report')
  const [last, setLast] = useState<Complaint | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)

  const update = (s: Session | null) => {
    setSession(s)
    saveSession(s)
  }

  const onLogin = useCallback((profile: Profile) => {
    const s = { profile, wardId: null }
    setSession(s)
    saveSession(s)
  }, [])

  const go = (s: Screen) => {
    if (s === 'report') setFormKey((k) => k + 1) // fresh form
    setScreen(s)
    setMenuOpen(false)
  }

  if (!session) {
    return (
      <div className="citizen-app">
        <DigiLockerLogin onLogin={onLogin} />
      </div>
    )
  }

  const ward = wardById(session.wardId)

  if (!ward || screen === 'ward') {
    return (
      <div className="citizen-app">
        <AppBar title={ward ? titles.ward : 'Select ward'} initial={session.profile.name[0]} onMenu={ward ? () => setMenuOpen(true) : undefined} />
        <WardSelect
          profile={session.profile}
          initialWardId={session.wardId}
          onSelect={(wardId) => {
            update({ ...session, wardId })
            go('report')
          }}
        />
        {menuOpen && renderDrawer()}
      </div>
    )
  }

  function onSubmitted(c: Complaint) {
    const next = [c, ...complaints]
    setComplaints(next)
    saveComplaints(next)
    setLast(c)
    setScreen('success')
  }

  function renderDrawer() {
    return (
      <div className="drawer-backdrop" onClick={() => setMenuOpen(false)}>
        <nav className="drawer" onClick={(e) => e.stopPropagation()}>
          <div className="drawer-profile">
            <div className="avatar lg">{session!.profile.name[0]}</div>
            <div>
              <strong>{session!.profile.name}</strong>
              <div className="muted small">Verified via DigiLocker</div>
            </div>
          </div>
          <button className={screen === 'report' ? 'active' : ''} onClick={() => go('report')}>
            Report a problem
          </button>
          <button className={screen === 'complaints' ? 'active' : ''} onClick={() => go('complaints')}>
            My complaints <span className="count">{complaints.length}</span>
          </button>
          <button className={screen === 'ward' ? 'active' : ''} onClick={() => go('ward')}>
            Change ward <span className="muted small">{ward?.name}</span>
          </button>
          <hr />
          <button
            onClick={() => {
              update(null)
              setMenuOpen(false)
              setScreen('report')
            }}
          >
            Log out
          </button>
          <a href="#/">← Back to gateway</a>
        </nav>
      </div>
    )
  }

  return (
    <div className="citizen-app">
      <AppBar title={titles[screen]} initial={session.profile.name[0]} onMenu={() => setMenuOpen(true)} />

      {screen === 'report' && <ReportForm key={formKey} ward={ward} onSubmit={onSubmitted} />}

      {screen === 'success' && last && (
        <div className="screen success">
          <div className="success-check" aria-hidden>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2>Complaint submitted</h2>
          <p className="muted">
            Your {problemById(last.problemId)?.label.toLowerCase()} report was sent to{' '}
            <strong>{last.analysis.department}</strong>, {ward.name}.
          </p>
          <div className="ticket">{last.id}</div>
          <button className="btn primary block" onClick={() => go('complaints')}>
            View my complaints
          </button>
          <button className="btn ghost block" onClick={() => go('report')}>
            Report another problem
          </button>
        </div>
      )}

      {screen === 'complaints' && <MyComplaints complaints={complaints} onNew={() => go('report')} />}

      {menuOpen && renderDrawer()}
    </div>
  )
}

function AppBar({ title, initial, onMenu }: { title: string; initial: string; onMenu?: () => void }) {
  return (
    <header className="app-bar">
      {onMenu ? (
        <button className="icon-btn" onClick={onMenu} aria-label="Open menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          </svg>
        </button>
      ) : (
        <span className="icon-btn" />
      )}
      <h1>{title}</h1>
      <div className="avatar">{initial}</div>
    </header>
  )
}
