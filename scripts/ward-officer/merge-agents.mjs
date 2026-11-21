// Merges pre-run agent output into public/ward-officer/agents.json.
// Applies QC2 (fairness rewrites from Opus), then QC1 (evidence check, in code) as the final gate.
// Usage: node scripts/ward-officer/merge-agents.mjs <workflow-output.json> [later-output.json ...]
import { readFileSync, writeFileSync } from 'node:fs'
import assert from 'node:assert'

// Every ₹ figure in a line, in rupees. Handles "₹2.3 lakh", "₹1.2 crore", "₹23,000", "Rs 5 lakh".
export function rupees(text) {
  const out = []
  for (const m of text.matchAll(/(?:₹|Rs\.?\s?)\s?(-?[\d,]+(?:\.\d+)?)(?:\s*(lakh|crore|cr|L)\b)?/gi)) {
    const n = Number(m[1].replace(/,/g, ''))
    const unit = (m[2] || '').toLowerCase()
    out.push(Math.round(n * (unit === 'lakh' || unit === 'l' ? 1e5 : unit === 'crore' || unit === 'cr' ? 1e7 : 1)))
  }
  return out
}
assert.deepStrictEqual(rupees('₹2.3 lakh and ₹1,200 and Rs 1.5 crore'), [230000, 1200, 15000000])
assert.deepStrictEqual(rupees('₹88,512, Lady Jamshedji Road'), [88512])

// English money units left inside Marathi text -> Marathi words.
export const marathiUnits = (s) => s.replace(/\b(lakhs?|lacs?|L)\b/g, 'लाख').replace(/\b(crores?|Cr)\b/gi, 'कोटी')
assert.strictEqual(marathiUnits('₹105 lakh, ₹1.05 Cr, RD0077 Lane'), '₹105 लाख, ₹1.05 कोटी, RD0077 Lane')

const ids = (text) => text.match(/\b(WO25-\d{5}|BMC25-\d{6}|RD\d{4})\b/g) ?? []

// QC1: every id must belong to this ward's facts; every ₹ figure must be within 5% of a computed number.
export function qc1(text, known, numbers) {
  const badIds = ids(text).filter((i) => !known.has(i))
  const badRs = rupees(text).filter((v) => v !== 0 && !numbers.some((n) => Math.abs(n - Math.abs(v)) <= Math.max(0.05 * Math.abs(n), 1000)))
  return { pass: !badIds.length && !badRs.length, badIds, badRs }
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

// Several workflow outputs can be passed; a later file replaces earlier ones role by role
// (e.g. a re-run of only the auditor and brief agents after the facts changed).
const batches = process.argv.slice(2).flatMap((p) => {
  const raw = JSON.parse(readFileSync(p, 'utf8'))
  return typeof raw === 'string' ? JSON.parse(raw) : raw.result ?? raw
})
const facts = JSON.parse(readFileSync('public/ward-officer/facts.json', 'utf8'))
const F = Object.fromEntries(facts.wards.map((w) => [w.code, w]))
const out = {}

for (const b of batches.filter(Boolean)) {
  const changes = b.qc2?.changes ?? []
  const fix = (role, code, key) => changes.find((c) => c.role === role && c.code === code && c.key === key)
  for (const role of ['triage', 'auditor', 'planner', 'brief']) {
    for (const w of b.outs?.[role]?.wards ?? []) {
      if (!F[w.code]) continue
      const { known, numbers } = wardIndex(F[w.code])
      const slot = (out[w.code] ??= {})
      const check = (key, text) => {
        const c = fix(role, w.code, key)
        const final = c ? { en: c.en, mr: c.mr } : text
        const r = qc1(final.en + ' ' + final.mr, known, numbers)
        // Marathi units are swapped only after QC1, so the evidence check reads the agent's original figures.
        return { ...final, mr: marathiUnits(final.mr), qc1: r.pass, qc1Bad: r.pass ? undefined : [...r.badIds, ...r.badRs], qc2: c ? c.verdict : 'ok', qc2Reason: c?.reason }
      }
      if (role === 'brief') {
        slot.brief = { morning: check('morning', w.morning), corporator: check('corporator', w.corporator) }
      } else {
        const keyOf = (it) => it.id ?? it.wo ?? it.road
        slot[role] = {
          summary: check('summary', w.summary),
          items: w.items.map((it) => ({ key: keyOf(it), action: it.action, ...check(keyOf(it), it.line) })),
        }
      }
    }
  }
}

// Stats come from the final lines only, so replaced roles are not double-counted.
const stats = { qc1Pass: 0, qc1Fail: 0, qc2Reworded: 0, qc2Context: 0, failures: [] }
for (const [code, w] of Object.entries(out)) {
  const lines = [
    ...['triage', 'auditor', 'planner'].flatMap((r) => (w[r] ? [{ r, key: 'summary', l: w[r].summary }, ...w[r].items.map((i) => ({ r, key: i.key, l: i }))] : [])),
    ...(w.brief ? [{ r: 'brief', key: 'morning', l: w.brief.morning }, { r: 'brief', key: 'corporator', l: w.brief.corporator }] : []),
  ]
  for (const { r, key, l } of lines) {
    stats[l.qc1 ? 'qc1Pass' : 'qc1Fail']++
    if (l.qc2 === 'reworded') stats.qc2Reworded++
    if (l.qc2 === 'needs context') stats.qc2Context++
    if (!l.qc1) stats.failures.push({ ward: code, role: r, key, bad: l.qc1Bad, en: l.en })
  }
}
writeFileSync('public/ward-officer/agents.json', JSON.stringify({ stats, wards: out }))
console.log({ ...stats, failures: stats.failures.slice(0, 8) }, 'wards', Object.keys(out).length)
