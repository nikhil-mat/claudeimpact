import { useEffect, useMemo, useState } from 'react'
import PageShell from './PageShell'
import './corporator/corporator.css'
import type { WardsFile, WorkOrder } from './corporator/types.ts'
import { useJson } from './corporator/data.ts'
import { formatInr, headlineParts, heldPer100, pct } from './corporator/format.ts'
import { SourceChip } from './corporator/Evidence.tsx'
import RupeeBar from './corporator/RupeeBar.tsx'
import { LastCard, WhereCard } from './corporator/Cards.tsx'
import NextRupeeCard from './corporator/NextRupeeCard.tsx'
import CommitteeQuestions from './corporator/CommitteeQuestions.tsx'
import WardMap from './corporator/WardMap.tsx'
import BelowFold from './corporator/BelowFold.tsx'

// Section jump bar. The app router owns the URL hash, so these scroll instead of using #anchors.
const SECTIONS = [
  { id: 'cv-s-verdict', label: 'Verdict' },
  { id: 'cv-s-split', label: 'Each ₹100' },
  { id: 'cv-s-answers', label: 'Spend · durability · next' },
  { id: 'cv-s-committee', label: 'Committee' },
  { id: 'cv-s-map', label: 'Map' },
  { id: 'cv-s-annex', label: 'Annexures' },
] as const

function useActiveSection(ready: boolean) {
  const [active, setActive] = useState<string>(SECTIONS[0].id)
  useEffect(() => {
    if (!ready || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (hit) setActive(hit.target.id)
      },
      { rootMargin: '-120px 0px -60% 0px' },
    )
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [ready])
  return active
}

const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

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
  const ready = Boolean(wards.data && wos.data && ward)
  const active = useActiveSection(ready)
  const over = ward ? ward.spend_inr - ward.budget_inr : 0

  return (
    <PageShell title="Corporator">
      <div className="cv">
        <header className="cv-top">
          <div className="cv-band">
            <div className="cv-brand">
              <span className="cv-brand-name">Follow the <em>Rupee</em></span>
              <span className="cv-brand-sub">Corporator view · synthetic data, fictional contractors</span>
            </div>
            <div className="cv-band-right">
              {wards.data && ward && (
                <label className="cv-select">
                  <span className="cv-select-l">Ward</span>
                  <select value={ward.ward_code} onChange={(e) => setCode(e.target.value)}>
                    {wards.data.wards.map((w) => (
                      <option key={w.ward_code} value={w.ward_code}>
                        {w.ward_code} · {w.ward_name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <a href="#/" className="cv-back">All views</a>
            </div>
          </div>
          {ready && (
            <nav className="cv-jump" aria-label="Sections">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={active === s.id ? 'on' : ''}
                  aria-current={active === s.id ? 'true' : undefined}
                  onClick={() => jump(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </nav>
          )}
        </header>
        {error ? (
          <p className="placeholder">{error}</p>
        ) : !wards.data || !wos.data || !ward ? (
          <div className="cv-loading" aria-busy="true">
            <span />
            <span />
            <span />
            <p className="cv-muted">Loading the ward file…</p>
          </div>
        ) : (
          <div className="cv-body" key={ward.ward_code}>
            <section id="cv-s-verdict" className="cv-sheet cv-verdict cv-anchor">
              <div className="cv-verdict-main">
                <p className="cv-eyebrow">
                  Ward {ward.ward_code} · {ward.ward_name} · {ward.zone}
                </p>
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
              </div>
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
              <dl className="cv-strip cv-num">
                <div>
                  <dt>Spent</dt>
                  <dd>{formatInr(ward.spend_inr)}</dd>
                </div>
                <div>
                  <dt>Budget</dt>
                  <dd>{formatInr(ward.budget_inr)}</dd>
                </div>
                <div className={over > 0 ? 'bad' : 'ok'}>
                  <dt>{over > 0 ? 'Over budget' : 'Under budget'}</dt>
                  <dd>{formatInr(Math.abs(over))}</dd>
                </div>
                <div>
                  <dt>Repair jobs</dt>
                  <dd>{ward.jobs.toLocaleString('en-IN')}</dd>
                </div>
                <div className={ward.fail_rate > wards.data.medians.fail_rate ? 'bad' : 'ok'}>
                  <dt>Failed in 30 days</dt>
                  <dd>{pct(ward.fail_rate, 1)}</dd>
                </div>
                <div className={ward.sla_missed_rate > wards.data.medians.sla_missed_rate ? 'bad' : 'ok'}>
                  <dt>Missed deadline</dt>
                  <dd>{pct(ward.sla_missed_rate)}</dd>
                </div>
              </dl>
            </section>
            <div id="cv-s-split" className="cv-anchor">
              <RupeeBar key={ward.ward_code} ward={ward} medians={wards.data.medians} workOrders={workOrders} />
            </div>
            <div id="cv-s-answers" className="cv-cards cv-anchor">
              <WhereCard workOrders={workOrders} />
              <LastCard ward={ward} medians={wards.data.medians} workOrders={workOrders} />
              <NextRupeeCard ward={ward} />
            </div>
            <div id="cv-s-committee" className="cv-anchor">
              <CommitteeQuestions ward={ward} workOrders={workOrders} byId={byId} />
            </div>
            <div id="cv-s-map" className="cv-anchor">
              <WardMap ward={ward} workOrders={workOrders} />
            </div>
            <div id="cv-s-annex" className="cv-anchor">
              <BelowFold ward={ward} workOrders={workOrders} />
            </div>
          </div>
        )}
      </div>
    </PageShell>
  )
}
