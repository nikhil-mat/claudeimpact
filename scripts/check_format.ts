import assert from 'node:assert/strict'
import { largestRemainder, formatInr, median, toCsv, headline } from '../src/pages/corporator/format.ts'

assert.deepEqual(largestRemainder([1.11, 5.66, 29.54, 63.70]), [1, 6, 29, 64])
assert.equal(largestRemainder([0, 40.5, 59.5]).reduce((a, b) => a + b), 100)
assert.equal(largestRemainder([0, 40.5, 59.5])[0], 0)
assert.equal(formatInr(6322991), '₹63.2L')
assert.equal(formatInr(5300000), '₹53.0L')
assert.equal(median([3, 1, 2]), 2); assert.equal(median([1, 2, 3, 4]), 2.5)
assert.equal(toCsv([{ a: 'x,"y"\nz', b: 'मराठी 🌊' }], [{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }]),
             'A,B\r\n"x,""y""\nz",मराठी 🌊')
const p = { twin: 1.11, over: 5.66, fail: 29.54, held: 63.70 }
assert.equal(headline({ ward_code: 'E', spend_inr: 6322991, budget_inr: 5300000, per100: p }, 71.79),
  'Ward E spent ₹63.2L against a ₹53.0L budget. ₹64 of every ₹100 went on repairs that held up. Ward median: ₹72.')
assert.equal(headline({ ward_code: 'T', spend_inr: 4000000, budget_inr: 5000000, per100: p }, 71.79),
  'Ward T spent ₹40.0L of its ₹50.0L budget. ₹64 of every ₹100 went on repairs that held up. Ward median: ₹72.')
console.log('format checks passed')
