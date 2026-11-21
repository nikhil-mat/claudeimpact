# Corporator View — Design

Date: 2026-11-21 · Event: Claude Impact Lab Mumbai (one-day hackathon, demo today)
Repo: `nikhil-mat/claudeimpact` (React 19 + TypeScript + Vite, hash router, page registry). Branch: `corporator-view`.
Dataset: `SumeetGDoshi/Claude-Impact-Labs-data-2`, cloned locally at `C:\Users\Baabli\hackathon\data`. All synthetic.

## Intent

The app has three views (Citizen, Corporator, Ward Officer) behind a gateway. This doc covers **only the Corporator view**. The other views come later, and they reuse the same generated data.

A corporator opens their ward and within 10 seconds knows **where the money went, whether the fixes lasted, and where the next rupee should go**. They can click any number through to the exact source rows. Transparency is the product: **every number shows its source and opens its evidence.**

Judging weights this targets: Audit accuracy 25%, Fair accountability 20%, Budget smarts 20%, Connects the trail 15%, Usable+demo 20%.

## Goals
- The first screen gives a verdict, not a dashboard: a headline sentence, a "where each ₹100 went" bar, 3 answer cards, 3 committee questions and a map.
- Every metric carries a **source chip** (files, columns, rule) and a **Show evidence** drawer listing the exact rows. The rows in a drawer always add up to the number above it. Drawers can be downloaded as CSV.
- Every audit flag shows a **trail**: complaint id(s) → work order → road (DLP status) → contractor → ₹ billed vs ₹ expected.
- Uses all the data files. `complaints_sample_200.csv` is excluded because it is a subset of `complaints.csv`.
- Comparisons are fair. Contractors are compared on actual vs expected for their repair-method mix, and the median across the 24 wards is shown next to every ward number.

## Non-goals
- No login, backend, database or write-back.
- No city-wide league table of wards. Each corporator sees their own ward plus the median.
- The Citizen and Ward Officer views get their own designs.
- No live "ask Claude" box. It would need a backend to keep the API key safe. It's a stretch goal, built only if there's time, via a dev-server proxy.

## Anti-goals (failure even if it works)
- Any accusation. Flags are worded as **questions for the committee**, never as "fraud".
- Claude inventing numbers or ids. Claude only writes prose around precomputed numbers. Every work-order id it cites is checked against the data, and invalid ids are removed.
- Bar segments that overlap or don't add up to ₹100.
- Showing accidents as caused by repairs. The data only supports "happened on a road with a recent failed repair".

## Constraints
- Must follow the repo conventions in `src/pages/registry.tsx`. This view lives in `src/pages/CorporatorView.tsx`, with its sections in `src/pages/corporator/`. Edit `registry.tsx` only to change this view's status to `active`. Don't add a router library. Use `PageShell`.
- Others may be working in this repo (the registry marks the Citizen view as the priority). Work only on the `corporator-view` branch and push only when the user asks.
- `#root` is capped at 960px, and the theme supports light and dark mode through CSS variables in `index.css`. New styles go in a view-specific CSS file and must use those variables.
- No new npm dependencies for the must-have features. The bar is built from flex divs. Charts and the map are inline SVG.
- The finish line is `npm run build` and `npm run lint` passing, then a manual check in `npm run dev`.
- Python 3.13 and pandas are installed for the build script. On Windows, set `PYTHONUTF8=1`, because Marathi, Hindi and emoji text otherwise crashes the default code page.
- No `ANTHROPIC_API_KEY` is set at the moment. The Claude text is generated at build time. Without a key, the app falls back to a ready-made brief built from the numbers. The key never goes into the browser, any `VITE_*` variable, or git.

## Approaches considered

**How to show the source of each number:**
- **A. Source chip + evidence drawer on every number (chosen).** Judges can check any figure in one click without leaving the screen.
- B. A separate Evidence tab. The page stays cleaner, but the evidence is a tab away from the number, which hurts the demo.
- C. A Claude-written brief with citations as the main trail. It reads well, but Claude could cite things that aren't in the data. It's used only for the brief, with every id checked.

**Stack (decided after the repo turned out to be React):** a Python build script computes everything and writes JSON, and React only renders it. Streamlit was the original plan and was dropped because the repo is React. Computing in TypeScript in the browser would need a CSV parser dependency and would mean rewriting analysis that is already verified in pandas.

## Architecture

```
dataset CSVs ──> scripts/build_data.py ──> public/data/*.json (committed) ──> React (fetch, filter, sum)
                        └─ optional Claude call per ward (build time, with ANTHROPIC_API_KEY) ─┘
```

- **`scripts/build_data.py <dataset_dir>`** loads the CSVs, tags every work-order row, computes the per-ward tables and writes JSON. Its asserts must pass (see Tests). The JSON is committed, so teammates don't need Python.
- **Work-order rows are tagged in Python:** `expected_inr`, `ratio`, `flag_overbilled`, `flag_twin` + `twin_of`, `flag_dlp_review`, and the bucket amounts `b_twin`, `b_over`, `b_fail`, `b_held`, plus contractor name and the linked complaint ids. React only filters and sums these rows, so every evidence drawer adds up to its headline number by construction.
- **Output files** (the exact split is the builder's call): `work_orders.json` (tagged), `wards.json` (summary per ward, including medians), `next_rupee.json`, `complaints_summary.json`, `accidents.json`, `context.json` (rain and tides weekly), `social.json`, `geo.json` (ward polygons, road lines, hotspots, facilities), `briefs.json`.

## Verified data findings (recon, 2026-11-21)

Expected cost is `standard_rate_inr × area_sqm` for per-sqm methods and `standard_rate_inr` for per-job methods. `ratio = cost_inr / expected`.

| Flag | Rule | Citywide |
|---|---|---|
| **Overbilled** | ratio ≥ 1.4. The data has a clean gap: normal jobs are at ≤ ~1.3, then a cluster at 1.4–3.1 | 111 jobs. Mahalaxmi Civil (CT03) has 43 and Arabian Sea (CT07) has 37 |
| **Billed twice** | `linked_complaint_ids` blank AND a twin exists: same road_id, repair_method and contractor, assigned within 10 days | All 45 unlinked jobs have a twin, with the same area, cost within ±4%, 1–4 days apart |
| **Paid on DLP road (needs review)** | road `under_dlp = Y` AND a surface method (unit = per sqm: cold mix, hot mix, mastic, paver blocks) | 259 jobs, ₹60.3L. These fail 34% of the time vs 17% for per-job work on DLP roads. Pumping and desilting are excluded because they aren't surface defects. The data has no DLP length or original contractor, so this stays "review", not violation |
| Failed fix | `reopened_within_30d = Y` | 9% to 39% by contractor. The expected rate for each contractor's method mix is about 24–25% |
| Missed SLA | `sla_met = N` | count only |

**Fairness checks done:** every contractor works in wards with similar flood risk (low-lying index ~0.66). Repairs in heavy-rain weeks fail at the same rate as in dry weeks (24% vs 25%), and every contractor had similar rain exposure. So context doesn't explain the gap between contractors, but the app still shows actual vs expected.

**Accidents:** 241 road-caused accidents (Pothole, Uneven road / open chamber, Waterlogged road, Skid on wet road). 112 happened within 45 days after a failed repair on the same road (from 611 failed repairs), and 178 after a repair that held (from 1,888 repairs). That is about twice the rate per repair. It's shown below the fold together with this baseline.

**Noise, not a flag:** `contractors.active_wards` doesn't match where contractors actually work (80% of jobs are outside the listed wards). Don't use it.

**Demo ward: E.** It spent ₹63.2L against a ₹53.0L budget (119%), and every flag type appears there. Per ₹100: billed twice ₹1, overbilled ₹6, failed ₹30, held up ₹64. The median of held-up spend across the 24 wards is ₹72, which makes E the 4th worst. (Ward T is the worst at ₹54, but it has no double billing.)

## "Where each ₹100 went" bar: outcome-only, mutually exclusive
Each work order is split in this priority order:
1. **Billed twice:** the whole cost of the unlinked twin.
2. **Overbilled:** only the excess, `cost − 1.3 × expected`. The remainder carries on to the next step.
3. **Failed within 30 days:** the remaining cost.
4. **Held up:** the remaining cost.

The segments add up exactly to the ward's spend and are shown per ₹100. Clicking a segment opens its rows. **DLP is not a segment.** It is a separate line under the bar: "of which ₹X was paid for surface repairs on roads still under DLP: needs review ▸".

## First screen layout (top to bottom)
1. **Ward selector** (defaults to E) and a headline built from the numbers: "Ward E spent ₹63.2L against a ₹53.0L budget. ₹64 of every ₹100 went on repairs that held up. Ward median: ₹72."
2. **The ₹100 bar**, with its source chip, an evidence drawer per segment, and the DLP line.
3. **Three cards:**
   - *Where did it go?* Spend by contractor and repair method (count, ₹, share).
   - *Did it last?* The ward's failure rate vs the expected rate for its mix vs the ward median, plus a per-contractor table of actual vs expected.
   - *Where next?* The top 3 roads (see Next-rupee), each with reason chips, a recommended method and an estimated cost.
4. **3 questions for the ward committee:** the top flag of each type in this ward, worded as a question, each with its trail.
5. **Map** (SVG): the ward polygon and road lines coloured by ₹ spent on failed repairs. Flood hotspots, hospitals and schools, road-caused accidents and open complaints are layers that can be switched on and off.
6. **Below the fold**, as expanders:
   - *Complaints:* what happened to them (received → duplicates → resolved / open / rejected / forwarded), the oldest open ones, top categories and localities, and the language mix.
   - *Rain & tides:* weekly complaints against Santacruz/Colaba rainfall, with red-alert and big-tide days marked.
   - *Road safety:* accidents by cause and severity, and road-caused accidents on roads with a recent failed repair, shown with the baseline.
   - *Citizen voice:* social posts matched to the ward by locality name or alias, the top posts by engagement, and a 3-line Claude summary.
   - *Committee brief:* the Claude brief, or the fallback brief.

## Next-rupee ranking (per road segment)
- **Candidates:** roads in the ward with at least one open or in-progress complaint mapped to them, or a failed repair.
- **Score:** a weighted sum of components, each normalised across the city. The weights are the builder's call, but they must be shown in the source chip:
  - open complaints, plus upvotes
  - **severity:** complaints have no severity field, so use the median `sla_hours` from work_orders for that work type (fewer hours means more severe)
  - failed repairs on the road
  - a flood hotspot within ~300 m, with a bonus if it is tide-sensitive
  - traffic: congestion index, peak vehicles and bus routes
  - road-caused accidents, weighted up for fatal and grievous ones
  - a hospital or school whose `ambulance_entry_road` is this road
- **Method:** for that work type, recommend the method with the lowest re-open rate. Estimated cost = rate × median area for that method, or the per-job rate.
- **Budget:** if the ward has budget left, spend it. If it is over budget, plan for the **next ₹10L**. Fill the budget greedily by score.
- **DLP roads:** only *surface* work (pothole and broken paver blocks, the per-sqm methods) is recommended as "call the original contractor under DLP, ₹0 to BMC". Drainage, waterlogging, manhole and cave-in work on a DLP road is costed and funded normally. This matches the DLP flag rule. *(Builder's call.)*

## Placing complaints on roads
- Exclude complaints marked `Closed - Duplicate`, `Rejected - *` and `Forwarded *` from open-issue counts. That leaves 896 open or in-progress complaints: 505 have lat/lon and all have locality_text.
- If lat/lon is present, use the nearest road in the same ward (haversine distance to the segment's endpoints and midpoint).
- Otherwise, look up `locality_text` in localities.csv (name and aliases, case-insensitive, including Devanagari), then take the nearest road in that ward.
- Otherwise, count it at ward level only.

## Data → panel map
- wards.csv/.geojson → header, map
- work_orders + rate_card + contractors + roads → bar, cards, flags
- roads.geojson → map
- complaints + localities → complaints panel, next-rupee
- rainfall + tides → context chart, next-rupee
- flood_hotspots → map, next-rupee
- traffic → next-rupee
- accidents → road safety, map, next-rupee
- facilities → map, next-rupee
- social_posts + localities → citizen voice

## Claude text (build time)
- For each ward, send the ward summary and its flagged work-order ids, and ask for a ~150-word committee brief in plain language, worded as questions, with no accusations. Then drop any WO id that isn't in the list that was sent.
- Social summary: 3 lines summarising the ward's matched posts.
- Model: `claude-opus-5-5`.
- Without a key, generate a brief from a template filled with the same numbers, and label it "template (Claude unavailable)".

## Tests (asserts in the build script, plus a check in the app)
- For each ward, the bar buckets add up to the ward's spend, within ₹1.
- Exactly 45 twins and 111 overbilled jobs at ratio ≥ 1.4.
- Every WO id in `briefs.json` exists in `work_orders.json`.
- `npm run build` and `npm run lint` pass.

## Build order
1. The build script and its asserts.
2. The first screen for ward E (headline, bar, cards, committee questions, evidence drawers).
3. Next-rupee ranking.
4. The map and the below-the-fold expanders.
5. Claude briefs, once there's a key.

## Calls made after the builder review
- The bar's displayed values round so the segments always total 100 (largest-remainder method).
- The road-safety panel counts each accident once. "After a failed repair" and "after a repair that held" can overlap, and the panel says so.
- Some work orders are dated in October. They are included, because the ward totals only match when they are.

## Left to the builder
Colours within the theme variables, chart styling, risk weights (shown in the source chip), distance thresholds, the JSON file split, and prompt wording.
