import { useMemo, useState } from 'react'
import PageShell from './PageShell'
import './corporator/corporator.css'
import type { WardsFile, WorkOrder } from './corporator/types.ts'
import { useJson } from './corporator/data.ts'
import { headlineParts, heldPer100 } from './corporator/format.ts'
import { SourceChip } from './corporator/Evidence.tsx'
import RupeeBar from './corporator/RupeeBar.tsx'
import { LastCard, WhereCard } from './corporator/Cards.tsx'
import NextRupeeCard from './corporator/NextRupeeCard.tsx'
import CommitteeQuestions from './corporator/CommitteeQuestions.tsx'
import WardMap from './corporator/WardMap.tsx'
import BelowFold from './corporator/BelowFold.tsx'

export default function CorporatorView() {
  const [code, setCode] = useState('E')
  const wards = useJson<WardsFile>('wards.json')
  const wos = useJson<WorkOrder[]>('work_orders.json')
  const byId = useMemo(() => new Map((wos.data ?? []).map((w) => [w.id, w])), [wos.data])
  const error = wards.error ?? wos.error
  const ward = wards.data?.wards.find((w) => w.ward_code === code) ?? wards.data?.wards[0]
  const workOrders = useMemo(
    () => (wos.data ?? []).filter((w) => w.ward === ward?.ward_code),
    [wos.data, ward?.ward_code],
  )
  const fileCode = ward?.ward_code ?? code
  return (
    <PageShell title="Corporator">
      <div className="cv">
        <header className="cv-band-wrap">
          <div className="cv-band">
            <div className="cv-brand">
              <span className="cv-brand-name">Follow the Rupee</span>
              <span className="cv-brand-sub">Corporator view</span>
            </div>
            <span className="cv-fileplate">FILE No. {fileCode}/MRR/2025</span>
            <div className="cv-band-right">
              {wards.data && ward && (
                <label className="cv-select">
                  <span>Ward</span>
                  <select value={ward.ward_code} onChange={(e) => setCode(e.target.value)}>
                    {wards.data.wards.map((w) => (
                      <option key={w.ward_code} value={w.ward_code}>
                        {w.ward_code} — {w.ward_name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <a href="#/" className="cv-back">All views</a>
            </div>
          </div>
          <div className="cv-tape" />
        </header>
        {error ? (
          <p className="placeholder">{error}</p>
        ) : !wards.data || !wos.data || !ward ? (
          <p className="cv-muted">Loading…</p>
        ) : (
          <>
            <section className="cv-sheet cv-verdict">
              <h2 className="cv-headline">
                {headlineParts(ward, wards.data.medians.per100.held).map((p, i) =>
                  p.bad ? (
                    <b key={i} className="cv-bad">{p.text}</b>
                  ) : p.sub ? (
                    <span key={i} className="cv-headline-sub">{p.text}</span>
                  ) : (
                    <span key={i}>{p.text}</span>
                  ),
                )}
              </h2>
              <div className="cv-hero">
                <p className="cv-hero-n cv-num">
                  <sup>₹</sup>
                  {heldPer100(ward.per100)}
                </p>
                <p className="cv-hero-l">of every ₹100 held up</p>
                <p className="cv-hero-m cv-num">Ward median ₹{Math.round(wards.data.medians.per100.held)}</p>
                <SourceChip
                  files={['work_orders.csv', 'rate_card.csv', 'roads.csv']}
                  rule="Share of the ward's spend left in the held up segment of the split below, per ₹100 with largest-remainder rounding; the median is across all wards."
                />
              </div>
            </section>
            <RupeeBar key={ward.ward_code} ward={ward} medians={wards.data.medians} workOrders={workOrders} />
            <div className="cv-cards">
              <WhereCard workOrders={workOrders} />
              <LastCard ward={ward} medians={wards.data.medians} workOrders={workOrders} />
              <NextRupeeCard ward={ward} />
            </div>
            <CommitteeQuestions ward={ward} workOrders={workOrders} byId={byId} />
            <WardMap ward={ward} workOrders={workOrders} />
            <BelowFold ward={ward} workOrders={workOrders} />
          </>
        )}
      </div>
    </PageShell>
  )
}
