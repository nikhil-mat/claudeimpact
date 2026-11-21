# Ward Desk (Ward Officer view)

A one-screen morning desk for a BMC ward officer (Assistant Municipal Commissioner), built on the
Claude Impact Lab "Follow the Rupee" dataset (synthetic, not real BMC data).

## Accounts (demo sign-in, one tap)
| Role | Sees | Does |
|---|---|---|
| Ward Officer (AMC) | Full desk for their ward | Approves, holds payments, recovers money, assigns field cards to the sub-engineer |
| Sub-engineer | Only cards assigned to them | Reports "Inspected: fixed / not fixed"; a fixed report SMSes the citizen |
| Commissioner (city) | All 24 wards in one table | Reads: payments to check, open complaints, missed deadlines, decided today, day closed (time + carried over) |

## What it shows
| Tab | What | Built by |
|---|---|---|
| Today | Close the day: decided, carried to tomorrow, ₹ held, citizens told; one tap sends the day report to the Deputy Commissioner. Due chips on hazard cards (24 h monsoon rule, High Court 48 h, days the complaint has waited), a Why? box, and a decision log (who, role, action, card, reason, time; undo adds an entry). 5 actions (recover warranty money, check a bill, re-inspect a repeat spot, refile a lost complaint, send a crew), WhatsApp copy, morning brief, corporator reply | Code + Brief agent |
| Who should have paid | Warranty (DLP) roads (the original road contractor owes the repair, not the contractor BMC paid), bills over 1.4x the rate card, double bills (same road + method within 7 days, no complaint). Utility-trench remarks shown as "worth checking", not counted | Code + Auditor agent |
| Fixed or just closed? | Resolved complaint followed by a new one within 50 m, 1 to 30 days later | Code |
| Lost complaints | Pothole photo filed under another category, bounced / closed pothole complaints, oldest open. Complaints with no ward are placed from the typed locality (`localities.csv` names + aliases, whole-word, 99.9% agree on complaints that do have a ward) or GPS | Code + Triage agent |
| Next rupee | Roads ranked by need (hospitals, flood spots, tide-sensitive flood spots from `tides.csv` / `flood_hotspots.csv`, accidents, failed patches, bus route, age), lasting method + cost. Patches that failed after a big-tide day are shown | Code + Planner agent |
| Contractors | Reopen, missed deadline, cost vs rate, heavy-rain share (context for fairness) | Code |
| Why this | Research basis: officer's day, pains by side, disagreements, portal gaps, devil's advocate | Research workflows |

All ₹ maths is in code. The 4 agents (Triage: Sonnet, Auditor: Opus, Planner: Sonnet, Brief: Sonnet) were
pre-run and only write words around the numbers, in English and Marathi.

## Two quality checks
- **QC1 Evidence (code, `scripts/ward-officer/merge-agents.mjs`)**: every work order, complaint or road ID in an
  agent line must exist in that ward's facts, and every ₹ figure must match a computed number (within 5%).
  Failing lines are held back from the screen.
- **QC2 Fairness (Opus)**: rewrites any line that blames without evidence, ignores rain, flood risk, crews or road
  owner, or whose Marathi changes the meaning.

## Rebuild data
```bash
node scripts/ward-officer/build-facts.mjs <path to Claude-Impact-Labs-data-2/data>   # writes public/ward-officer/facts.json
node scripts/ward-officer/merge-agents.mjs <agent workflow output.json>               # writes public/ward-officer/agents.json
```
