// Re-runs QC1 (evidence check) on the existing public/ward-officer/agents.json against the current
// facts.json, without re-running the agents. Use after the audit engine's numbers change:
// any line whose IDs or ₹ figures no longer match the facts is marked qc1:false and hidden by the UI.
// Same rules as merge-agents.mjs (kept in sync by hand; that script writes on import, so it is not imported).
// Usage: node scripts/ward-officer/recheck-agents.mjs
import { readFileSync, writeFileSync } from 'node:fs'

function rupees(text) {
  const out = []
  for (const m of text.matchAll(/(?:₹|Rs\.?\s?)\s?(-?[\d,]+(?:\.\d+)?)(?:\s*(lakh|crore|cr|L|लाख|कोटी)(?![A-Za-z]))?/gi)) {
    const n = Number(m[1].replace(/,/g, ''))
    const unit = (m[2] || '').toLowerCase()
    out.push(Math.round(n * (['lakh', 'l', 'लाख'].includes(unit) ? 1e5 : ['crore', 'cr', 'कोटी'].includes(unit) ? 1e7 : 1)))
  }
  return out
}
const ids = (text) => text.match(/\b(WO25-\d{5}|BMC25-\d{6}|RD\d{4})\b/g) ?? []
function qc1(text, known, numbers) {
  const badIds = ids(text).filter((i) => !known.has(i))
  const badRs = rupees(text).filter((v) => v !== 0 && !numbers.some((n) => Math.abs(n - Math.abs(v)) <= Math.max(0.05 * Math.abs(n), 1000)))
  return { pass: !badIds.length && !badRs.length, bad: [...badIds, ...badRs] }
}
function wardIndex(w) {
  const known = new Set(), numbers = []
  const walk = (v) => {
    if (typeof v === 'string' && /^(WO25-\d{5}|BMC25-\d{6}|RD\d{4})$/.test(v)) known.add(v)
    else if (typeof v === 'number') numbers.push(Math.abs(v))
    else if (v && typeof v === 'object') Object.values(v).forEach(walk)
  }
  walk(w)
  numbers.push(Math.abs(w.budget - w.spent))
  return { known, numbers }
}

const facts = JSON.parse(readFileSync('public/ward-officer/facts.json', 'utf8'))
const F = Object.fromEntries(facts.wards.map((w) => [w.code, w]))
const agents = JSON.parse(readFileSync('public/ward-officer/agents.json', 'utf8'))
const stats = { qc1Pass: 0, qc1Fail: 0, qc2Reworded: agents.stats?.qc2Reworded ?? 0, qc2Context: agents.stats?.qc2Context ?? 0, failures: [] }
let newlyHidden = 0
for (const [code, w] of Object.entries(agents.wards)) {
  if (!F[code]) continue
  const { known, numbers } = wardIndex(F[code])
  const gate = (role, key, l) => {
    const r = qc1(`${l.en} ${l.mr}`, known, numbers)
    if (l.qc1 && !r.pass) newlyHidden++
    l.qc1 = r.pass
    l.qc1Bad = r.pass ? undefined : r.bad
    stats[r.pass ? 'qc1Pass' : 'qc1Fail']++
    if (!r.pass) stats.failures.push({ ward: code, role, key, bad: r.bad, en: l.en })
  }
  for (const role of ['triage', 'auditor', 'planner']) {
    if (!w[role]) continue
    gate(role, 'summary', w[role].summary)
    for (const it of w[role].items) gate(role, it.key, it)
  }
  if (w.brief) { gate('brief', 'morning', w.brief.morning); gate('brief', 'corporator', w.brief.corporator) }
}
agents.stats = stats
writeFileSync('public/ward-officer/agents.json', JSON.stringify(agents))
console.log({ qc1Pass: stats.qc1Pass, qc1Fail: stats.qc1Fail, newlyHidden })
