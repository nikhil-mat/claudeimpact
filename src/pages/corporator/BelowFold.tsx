import type { ReactNode } from 'react'
import { useJson } from './data.ts'
import type { Complaint, WardSummary, WorkOrder } from './types.ts'
import BriefPanel from './below/BriefPanel.tsx'
import CitizenVoicePanel from './below/CitizenVoicePanel.tsx'
import ComplaintsPanel from './below/ComplaintsPanel.tsx'
import RainTidesPanel from './below/RainTidesPanel.tsx'
import RoadSafetyPanel from './below/RoadSafetyPanel.tsx'
import './below/below.css'

function Annex({ letter, title, preview, children }: { letter: string; title: string; preview?: ReactNode; children: ReactNode }) {
  return (
    <details className="cvb-annex">
      <summary>
        <span className="cvb-letter">Annex {letter}</span>
        <span className="cvb-title">{title}</span>
        {preview && <span className="cvb-preview">{preview}</span>}
        <span className="cvb-chev" aria-hidden="true" />
      </summary>
      {children}
    </details>
  )
}

export default function BelowFold({ ward, workOrders }: { ward: WardSummary; workOrders: WorkOrder[] }) {
  // Same cached file the Complaints panel loads; no extra fetch.
  const complaints = useJson<Complaint[]>('complaints.json').data
  const received = complaints ? complaints.filter((c) => c.ward === ward.ward_code).length : null
  const failedN = workOrders.filter((w) => w.reopened).length
  return (
    <section className="cvb-annexures">
      <h2>Annexures</h2>
      <Annex
        letter="A"
        title="Complaints"
        preview={received !== null && <><b>{received}</b>received</>}
      >
        <ComplaintsPanel ward={ward} />
      </Annex>
      <Annex letter="B" title="Rain & tides">
        <RainTidesPanel ward={ward} />
      </Annex>
      <Annex
        letter="C"
        title="Road safety"
        preview={<><b>{failedN}</b>of {workOrders.length} repairs failed</>}
      >
        <RoadSafetyPanel ward={ward} workOrders={workOrders} />
      </Annex>
      <Annex letter="D" title="Citizen voice">
        <CitizenVoicePanel ward={ward} />
      </Annex>
      <Annex letter="E" title="Committee brief">
        <BriefPanel ward={ward} />
      </Annex>
    </section>
  )
}
