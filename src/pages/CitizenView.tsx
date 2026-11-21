import { useCallback, useEffect, useState } from 'react'
import DigiLockerLogin from './citizen/DigiLockerLogin'
import WardSelect from './citizen/WardSelect'
import ReportForm from './citizen/ReportForm'
import MyComplaints from './citizen/MyComplaints'
import ComplaintDetail from './citizen/ComplaintDetail'
import {
  complaintStage,
  loadComplaints,
  loadSession,
  problemById,
  saveComplaints,
  saveSession,
  seedComplaints,
  wardById,
  woById,
  type Complaint,
  type Profile,
  type Session,
} from './citizen/mock'
import './citizen/citizen.css'

// Citizen view (mobile-first). Flow: mock DigiLocker login → pick ward → report → my complaints → detail.
// Screens are internal state (the app router only matches top-level paths).
type Screen = 'report' | 'success' | 'complaints' | 'detail' | 'ward' | 'map'

const titles: Record<Screen, string> = {
  report: 'Report a problem',
  success: 'Submitted',
  complaints: 'My complaints',
  detail: 'Complaint',
  ward: 'Change ward',
  map: 'Complaint map',
}

export default function CitizenView() {
  const [session, setSession] = useState<Session | null>(loadSession)
  const [complaints, setComplaints] = useState<Complaint[]>(loadComplaints)
  const [screen, setScreen] = useState<Screen>('report')
  const [openId, setOpenId] = useState<string | null>(null)
  const [lastId, setLastId] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [now, setNow] = useState(Date.now)

  // Tick so tender statuses advance live on the complaint screens.
  useEffect(() => {
    if (screen !== 'complaints' && screen !== 'detail') return
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [screen])

  const saveList = (next: Complaint[]) => {
    setComplaints(next)
    saveComplaints(next)
  }

  const update = (s: Session | null) => {
    setSession(s)
    saveSession(s)
  }

  const onLogin = useCallback((profile: Profile) => {
    const s = { profile, wardId: null }
    setSession(s)
    saveSession(s)
    // First sign-in: give the demo citizen some past complaints at different stages.
    setComplaints((cur) => {
      if (cur.length) return cur
      const seeded = seedComplaints(Date.now())
      saveComplaints(seeded)
      return seeded
    })
  }, [])

  const go = (s: Screen) => {
    if (s === 'report') setFormKey((k) => k + 1) // fresh form
    setNow(Date.now())
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
  const needsAction = complaints.filter((c) => complaintStage(c, now) === 'finished').length

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
          <button className={screen === 'complaints' || screen === 'detail' ? 'active' : ''} onClick={() => go('complaints')}>
            My complaints <span className={`count ${needsAction ? 'alert' : ''}`}>{complaints.length}</span>
          </button>
          <button className={screen === 'map' ? 'active' : ''} onClick={() => go('map')}>
            Complaint map <span className="muted small">{ward?.id}</span>
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

  if (!ward || screen === 'ward') {
    return (
      <div className="citizen-app">
        <AppBar
          title={ward ? titles.ward : 'Select ward'}
          onMenu={ward ? () => setMenuOpen(true) : undefined}
          onComplaints={ward ? () => go('complaints') : undefined}
          badge={needsAction}
        />
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
    saveList([c, ...complaints])
    setLastId(c.id)
    setScreen('success')
  }

  const last = complaints.find((c) => c.id === lastId)
  const open = complaints.find((c) => c.id === openId)
  const lastWo = woById(last?.cycles[0].woId ?? null)

  return (
    <div className="citizen-app">
      <AppBar
        title={titles[screen]}
        onMenu={() => setMenuOpen(true)}
        onBack={screen === 'detail' ? () => go('complaints') : undefined}
        onComplaints={() => go('complaints')}
        complaintsActive={screen === 'complaints'}
        badge={needsAction}
      />

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
            <strong>{last.analysis?.department}</strong>, {ward.name}.
            {lastWo ? ' You can track the repair tender from My complaints.' : ''}
          </p>
          <div className="ticket">{last.id}</div>
          <button
            className="btn primary block"
            onClick={() => {
              setOpenId(last.id)
              go('detail')
            }}
          >
            Track this complaint
          </button>
          <button className="btn ghost block" onClick={() => go('report')}>
            Report another problem
          </button>
        </div>
      )}

      {screen === 'complaints' && (
        <MyComplaints
          complaints={complaints}
          now={now}
          onNew={() => go('report')}
          onOpen={(id) => {
            setOpenId(id)
            go('detail')
          }}
        />
      )}

      {screen === 'detail' && open && (
        <ComplaintDetail
          key={open.id}
          complaint={open}
          now={now}
          onUpdate={(c) => {
            saveList(complaints.map((x) => (x.id === c.id ? c : x)))
            setNow(Date.now())
          }}
        />
      )}

      {screen === 'map' && (
        // Same complaint map as the Ward Officer view (public/ward-officer/rupee/heatmap.html), opened on the citizen's ward.
        <iframe
          className="citizen-map"
          title={`Complaint map, ward ${ward.id}`}
          src={`${import.meta.env.BASE_URL}ward-officer/rupee/heatmap.html?ward=${encodeURIComponent(ward.id)}`}
        />
      )}

      {menuOpen && renderDrawer()}
    </div>
  )
}

function AppBar({
  title,
  onMenu,
  onBack,
  onComplaints,
  complaintsActive = false,
  badge = 0,
}: {
  title: string
  onMenu?: () => void
  onBack?: () => void
  onComplaints?: () => void
  complaintsActive?: boolean
  badge?: number
}) {
  return (
    <header className="app-bar">
      {onBack ? (
        <button className="icon-btn" onClick={onBack} aria-label="Back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ) : onMenu ? (
        <button className="icon-btn" onClick={onMenu} aria-label="Open menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          </svg>
        </button>
      ) : (
        <span className="icon-btn" />
      )}
      <h1>{title}</h1>
      {onComplaints ? (
        <button
          className={`complaints-btn ${complaintsActive ? 'active' : ''} ${badge > 0 ? 'alert' : ''}`}
          onClick={onComplaints}
          aria-label={badge > 0 ? `My complaints, ${badge} need your confirmation` : 'My complaints'}
        >
          My complaints
          {badge > 0 && <span className="complaints-badge">{badge}</span>}
        </button>
      ) : (
        <span className="icon-btn" />
      )}
    </header>
  )
}
