import { useEffect, useState } from 'react'
import PageShell from './PageShell'
import './ward-officer/rupee-tabs.css'

// Ward Officer view: the Follow the Rupee dashboard and complaint map, as static pages in
// public/ward-officer/rupee/ (copied from the impactonyourmom app/ folder; same audit engine
// numbers as engine/). "Track a complaint" is left out here: it belongs to the Citizen view.
type Tab = 'money' | 'map'
const TABS: { key: Tab; label: string }[] = [
  { key: 'money', label: 'Money trail & audit' },
  { key: 'map', label: 'Complaint map' },
]
const base = `${import.meta.env.BASE_URL}ward-officer/rupee/`

export default function WardOfficerView() {
  const [tab, setTab] = useState<Tab>(() => (localStorage.getItem('wo-tab') === 'map' ? 'map' : 'money'))
  useEffect(() => localStorage.setItem('wo-tab', tab), [tab])

  return (
    <PageShell title="Ward Officer">
      <div className="wo-shell wo-wide">
        <nav className="wo-tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} className={tab === t.key ? 'on' : ''} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </nav>
        {tab === 'money' && <iframe className="wo-frame" title="Money trail and audit" src={`${base}index.html`} />}
        {tab === 'map' && <iframe className="wo-frame" title="Complaint map" src={`${base}heatmap.html`} />}
      </div>
    </PageShell>
  )
}
