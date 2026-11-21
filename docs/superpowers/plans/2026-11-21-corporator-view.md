# Corporator View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Each developer implements exactly one assigned task. There are no commit steps, because this workflow does not commit or push.**

**Goal:** A Corporator view (`#/corporator`) that shows, for one ward at a time, where the money went, whether the fixes held up, and where the next rupee should go. Every number has a source chip and an evidence drawer.

**Architecture:** `scripts/build_data.py` (Python + pandas) reads the dataset CSVs, tags every work order, and writes `public/data/*.json`. React fetches those files, then filters and sums the tagged rows, so every evidence drawer adds up to its headline number by construction. The Claude brief is generated at build time, and a labelled template is used when there is no API key.

**Tech Stack:** Python 3.13 + pandas (stdlib only otherwise), React 19 + TypeScript 7 + Vite 8, oxlint. Charts and the map are inline SVG and flex divs.

**Spec:** `docs/superpowers/specs/2026-11-21-corporator-view-design.md`. Read it before starting any task. Where this plan pins a value, the plan wins.

## Global Constraints

- Repo `C:\Users\Baabli\hackathon\repo`, branch `corporator-view`. **Do not `git commit` or `git push`.**
- The dataset is read-only, outside the repo: `C:/Users/Baabli/hackathon/data/data`. In Git Bash, always pass it quoted with forward slashes: `"C:/Users/Baabli/hackathon/data/data"`.
- Always run Python as `PYTHONUTF8=1 python ...`. Use pandas and the stdlib only (no shapely, no geopandas, no pip installs).
- Do not touch `src/pages/CitizenView.tsx`, `src/pages/WardOfficerView.tsx` or `src/App.tsx`. In `src/pages/registry.tsx`, change only the Corporator entry's `status` to `'active'`.
- Don't add npm dependencies or a router library. Wrap the page in `PageShell`. View sections go in `src/pages/corporator/`.
- Styles go in view CSS files and use only the `index.css` variables (`--text --text-h --bg --surface --border --accent --accent-bg --muted-bg`), or `color-mix()` of them. Light and dark mode must both stay legible. `#root` is 960px wide.
- TypeScript settings to respect: `erasableSyntaxOnly` (no `enum`, no parameter properties), `verbatimModuleSyntax` (use `import type` for types), and `noUnusedLocals`/`noUnusedParameters`. The lint rule `react/only-export-components` means `.tsx` files export components only, and helpers live in `.ts` files. Write JSON types as `type` aliases, not `interface`.
- Fetch data from `import.meta.env.BASE_URL + 'data/<file>'`.
- No `ANTHROPIC_API_KEY` is set. The key must never go into a `VITE_*` variable, into `src/`, or into git. Without a key, briefs are labelled exactly `template (Claude unavailable)`. The model is `claude-opus-5-5`.
- Copy rule: flags are **questions for the committee**. Never use "fraud", "scam", "theft" or "corrupt". Accidents "happened on a road with a recent failed repair". They are never described as caused by repairs.
- **Atomic writes:** `build_data.py` `main` first runs the self-tests, then computes every output, then runs every assert, and only then writes any file. A failed run leaves `public/data/` untouched, because UI tasks read it while Python tasks rerun the script.
- JSON output: `json.dump(obj, f, ensure_ascii=False, allow_nan=False, separators=(',', ':'))`, UTF-8. Convert every NaN to `null` first, sort rows by id, and use integer rupees except where a type below says otherwise.
- The finish line is that `PYTHONUTF8=1 python scripts/build_data.py "C:/Users/Baabli/hackathon/data/data"` exits 0 with all asserts passing, and `npm run build` and `npm run lint` both pass.

## Pinned data rules (verified against the data on 2026-11-21)

- `expected_inr = standard_rate_inr × area_sqm` when `unit == 'per sqm'`, otherwise `standard_rate_inr`. `ratio = cost_inr / expected_inr`.
- `flag_overbilled = ratio >= 1.4` gives **111**. (The largest normal ratio is 1.397, and none of the 111 is a twin.)
- `flag_twin = linked_complaint_ids blank` AND another row exists with the same road_id, repair_method and contractor_id, assigned within ±10 days. This gives **45**. `twin_of` is the matching row with a non-blank `linked_complaint_ids` that is nearest in `assigned_at`, which is deterministic. Pinned: `WO25-02485 → WO25-00057` and `WO25-02472 → WO25-00373`.
- `flag_dlp_review = roads.under_dlp == 'Y' AND unit == 'per sqm'` gives **259 rows, ₹6,026,225**.
- Buckets per row:
  - `b_twin` is the whole cost if the row is a twin.
  - Otherwise, `b_over = cost − 1.3×expected` if `flag_overbilled`, else 0. Round it to 2 dp.
  - `rem = cost − b_twin − b_over`.
  - `b_fail = rem` if `reopened_within_30d == 'Y'`, else 0.
  - `b_held = rem − b_fail`.
  
  So the four always sum to `cost_inr` within 0.01.
- `exp_fail` per row is the citywide share of `reopened_within_30d == 'Y'` for that row's `repair_method`. The expected failure rate of any subset is the mean of `exp_fail`.
- Ward E: spend **6,322,991**, budget **5,300,000**. The raw per-₹100 values are twin 1.11, over 5.66, fail 29.54, held 63.70. **Largest-remainder rounding gives 1 / 6 / 29 / 64.** The spec's "₹30" is pre-rounding and would sum to 101, so 29 is correct. The median held per ₹100 across the 24 wards is 71.79 (shown as ₹72), and E has the 4th-lowest held value. Ward T is the lowest at 53.63 and has no twins.
- Open complaint = `status in {'Open', 'In Progress'}`, giving **896**, of which **505** have lat/lon.
- Road-caused accident = `probable_cause in {'Pothole', 'Uneven road / open chamber', 'Waterlogged road', 'Skid on wet road'}`, giving **241**. `after_failed_repair` means a work order on the same `road_id` with `reopened_within_30d == 'Y'` and `0 < occurred_at − completed_at ≤ 45 days` (strict lower bound; the inclusive version gives 113). This gives **112**. `after_held_repair` uses the same rule with `'N'` and gives **178**. The citywide failed / held repair counts are **611 / 1888**.
- Complaint ward: use `ward_code` if present (`ward_source='given'`). Otherwise use the locality lookup (`'locality'`). Otherwise use the nearest `wards.csv` centroid if lat/lon is present (`'centroid'`). Otherwise `null`.
- Locality lookup works on `locality_text`, stripped and lower-cased. First try an exact match on `localities.locality` or any `;`-split alias, which covers Devanagari. If none matches, use a prefix match: every locality name or alias that starts with the text followed by a space or `(`. Use the match only if all candidates share one ward ("Malad", "Vile", "Saki" are truncated in the data), and take the coordinates of the first candidate in `localities.csv` row order. Otherwise there is no match.

## The JSON contract (`public/data/*.json`)

Task 3 copies this block verbatim into `src/pages/corporator/types.ts`. The Python tasks emit exactly these field names. Timestamps keep the CSV format `YYYY-MM-DD HH:MM`, and dates are `YYYY-MM-DD`.

```ts
export type Bucket = 'twin' | 'over' | 'fail' | 'held'
export type BucketSet = { twin: number; over: number; fail: number; held: number }

// work_orders.json : WorkOrder[]  (all 2499 rows)
export type WorkOrder = {
  id: string; ward: string; road_id: string; road_name: string; under_dlp: boolean
  work_type: string; repair_method: string; unit: 'per sqm' | 'per job'; standard_rate_inr: number
  contractor_id: string; contractor_name: string; contractor_since: number   // contractors.csv empanelled_since
  assigned_at: string; work_started_at: string | null; completed_at: string | null
  area_sqm: number; cost_inr: number; expected_inr: number; ratio: number   // ratio 3 dp
  sla_hours: number; sla_met: boolean; reopened: boolean; exp_fail: number  // exp_fail 4 dp
  complaint_ids: string[]; remark: string
  flag_overbilled: boolean; flag_twin: boolean; twin_of: string | null; flag_dlp_review: boolean
  b_twin: number; b_over: number; b_fail: number; b_held: number            // 2 dp
}

// wards.json : WardsFile
export type WardSummary = {
  ward_code: string; ward_name: string; zone: string; population_est: number
  area_km2: number; low_lying_index: number; engineering_crews: number; localities: string[]
  budget_inr: number; spend_inr: number; spend_pct_of_budget: number   // 119.3 = 119.3 %
  jobs: number; buckets: BucketSet                                     // rupees, sum = spend_inr ±1
  per100: BucketSet                                                    // unrounded, 2 dp
  dlp_review_inr: number; dlp_review_jobs: number; dlp_review_per100: number
  fail_rate: number; expected_fail_rate: number                        // 0..1, 4 dp
  sla_missed: number; sla_missed_rate: number
}
export type WardsFile = {
  medians: { spend_pct_of_budget: number; per100: BucketSet; dlp_review_per100: number
             fail_rate: number; expected_fail_rate: number; sla_missed_rate: number }
  wards: WardSummary[]                                                 // sorted by ward_code
}

// briefs.json : BriefsFile
export type Brief = { source: 'claude' | 'template (Claude unavailable)'
                      brief: string; social_summary: string; wo_ids: string[] }
export type BriefsFile = Record<string, Brief>                         // key = ward_code

// complaints.json : Complaint[]  (all 6501 rows)
export type Complaint = {
  id: string; received_at: string; channel: string; category: string
  description: string                                                  // truncated to 200 chars
  language: string; locality_text: string
  ward: string | null; ward_source: 'given' | 'locality' | 'centroid' | null
  lat: number | null; lon: number | null; upvotes: number; status: string
  resolved_at: string | null; is_open: boolean
  road_id: string | null; placement: 'gps' | 'locality' | 'ward' | null // set only when is_open
}

// accidents.json : AccidentsFile
export type Accident = {
  id: string; occurred_at: string; ward: string; road_id: string | null; lat: number; lon: number
  vehicle_type: string; severity: 'Minor' | 'Grievous' | 'Fatal'; cause: string
  road_caused: boolean; after_failed_repair: boolean; after_held_repair: boolean
  failed_wo_ids: string[]; held_wo_ids: string[]
}
export type AccidentsFile = {
  window_days: number; road_causes: string[]
  city: { failed_repairs: number; held_repairs: number; after_failed: number; after_held: number }
  rows: Accident[]
}

// context.json : ContextFile  (Monday-start weeks covering rainfall dates)
export type ContextWeek = {
  week_start: string; santacruz_mm: number; colaba_mm: number          // weekly sums, 1 dp
  red_alert_days: string[]                                             // dates either station is Red
  big_tide_days: string[]                                              // tides.big_tide_flag == 'Y'
  complaints: Record<string, number>                                   // ward -> complaints received that week
}
export type ContextFile = { weeks: ContextWeek[] }

// social.json : SocialPost[]  (all 650 rows)
export type SocialPost = {
  id: string; posted_at: string; source: string; author: string; text: string
  has_media: boolean; engagement: number; ward: string | null; locality: string | null
}

// geo.json : GeoFile   (coordinates are [lon, lat], 5 dp)
export type GeoFile = {
  wards: { ward_code: string; ward_name: string; zone: string; rings: [number, number][][] }[]
  roads: { road_id: string; ward: string; road_name: string; road_type: string; coords: [number, number][] }[]
  hotspots: { id: string; name: string; ward: string; lat: number; lon: number
              tide_sensitive: boolean; threshold_mm: number; years_flagged: number }[]
  facilities: { id: string; type: 'Hospital' | 'School'; name: string; ward: string
                lat: number; lon: number; ambulance_entry_road: string | null }[]
}

// next_rupee.json : NextRupeeFile
export type NextRupeeComponents = { complaints: number; severity: number; failed_repairs: number
  flood: number; traffic: number; accidents: number; facilities: number }
export type NextRupeeRoad = {
  road_id: string; road_name: string; under_dlp: boolean
  score: number                         // 0..100, 1 dp
  components: NextRupeeComponents       // each normalised 0..1 across the city
  reasons: string[]                     // human chips, e.g. "3 open complaints (41 upvotes)"
  work_type: string; method: string; unit: 'per sqm' | 'per job'; method_reopen_rate: number
  est_cost_inr: number; dlp_route: boolean; bmc_cost_inr: number   // dlp_route => bmc_cost_inr 0
  funded: boolean
  open_complaint_ids: string[]; failed_wo_ids: string[]; accident_ids: string[]
  facility_ids: string[]; hotspot_id: string | null; hotspot_m: number | null
}
export type NextRupeeWard = { budget_mode: 'remaining' | 'next_10L'; budget_inr: number
                              allocated_inr: number; candidates: NextRupeeRoad[] }  // score desc
export type NextRupeeFile = { weights: NextRupeeComponents; rule: string
                              wards: Record<string, NextRupeeWard> }
```

## Task graph

```
T1 (Python core) ──┬─> T2 (Python rest) ──┬─> T4 (Next-rupee card + map)   ┐
                   │                      ├─> T5 (Below-the-fold)          ├ T4, T5, T6 run in parallel
                   │                      └─> T6 (Claude brief)            ┘
                   └─> T3 (First screen UI)  ──> T4, T5        (T2 and T3 run in parallel)
```

## Review Focus

1. **A ward with no flag of a type** (Ward T has no twins, and some wards may have no overbilled jobs). The bar drops the zero segment and the remaining labels still total 100. The committee question for that type says "No … found in Ward X" instead of crashing or showing `undefined`. This is pinned by Task 3 Step 6.
2. **A drawer total that doesn't match the number above it.** Both the headline and the drawer footer are formatted from the same summed field (`b_twin`/`b_over`/`b_fail`/`b_held`, `cost_inr`). The over segment's drawer filters on `b_over > 0`, not on `flag_overbilled`. This is pinned by Task 3 Step 6.
3. **A ward under budget** (18 wards, for example T). The headline must not say "against" as if overspent, and next-rupee uses `budget_mode: 'remaining'`. This is pinned by Task 2's asserts and by the `headline` asserts in `check_format.ts` (Task 3 Step 1).
4. **Missing `public/data` files** (a teammate who never ran Python, or a 404). Each section shows a visible "Data not built: run scripts/build_data.py" message and the page never goes blank. `useJson` exposes `error`. This is pinned by Task 3 Step 6.
5. **Non-ASCII text in CSV downloads** (Marathi, Hindi, emoji, commas, quotes and newlines inside descriptions). `toCsv` quotes fields and `downloadCsv` adds a UTF-8 BOM, so Excel shows the text correctly. This is pinned by Task 3 Step 1 (`check_format.ts`).

---

### Task 1: Python core: tagged work orders, ward summaries, template briefs

**Files:**
- Create: `scripts/build_data.py`
- Generates: `public/data/work_orders.json`, `public/data/wards.json`, `public/data/briefs.json`
- Also run `npm ci` (or `npm install` if `ci` fails; package.json must stay unchanged) so `node_modules` exists for the UI tasks.

**Interfaces:**
- Consumes: the dataset CSVs (see the spec's data → panel map).
- Produces: the contract types `WorkOrder`, `WardsFile` and `BriefsFile` above, plus these Python functions, which later tasks extend in the same file:
  - `load(dataset_dir: Path) -> dict[str, pd.DataFrame]`, keyed by file stem (`'work_orders'`, `'rate_card'`, …). It skips `complaints_sample_200.csv`.
  - `tag_work_orders(d) -> pd.DataFrame`, with one row per WO and the contract columns.
  - `ward_summaries(wo: pd.DataFrame, d) -> dict`, the `WardsFile` dict.
  - `template_brief(ward: dict, wo_ward: pd.DataFrame, medians: dict) -> tuple[str, list[str]]`, returning the brief text and the WO ids it cites.
  - `build_briefs(wards_file: dict, wo: pd.DataFrame) -> dict`, the `BriefsFile` dict. `social_summary` is `""` for now; Task 2 fills it.
  - `write_json(name: str, obj) -> None`, called only after all asserts pass. It writes to `<repo>/public/data/<name>`, with the repo root resolved as `Path(__file__).resolve().parent.parent`. It creates the directory.
  - `run_asserts_core(wo, wards_file, briefs) -> None`.
  - `main(argv: list[str]) -> int`, with usage `build_data.py <dataset_dir>`.

- [ ] **Step 1: Write the asserts first.** `run_asserts_core` checks:
  ```python
  assert len(wo) == 2499
  assert wo.flag_overbilled.sum() == 111
  assert wo.flag_twin.sum() == 45
  tw = wo.set_index('id').twin_of
  assert tw['WO25-02485'] == 'WO25-00057' and tw['WO25-02472'] == 'WO25-00373'
  assert ((wo.b_twin + wo.b_over + wo.b_fail + wo.b_held - wo.cost_inr).abs() < 0.011).all()
  assert wo.flag_dlp_review.sum() == 259 and wo.loc[wo.flag_dlp_review, 'cost_inr'].sum() == 6026225
  for w in wards_file['wards']:
      assert abs(sum(w['buckets'].values()) - w['spend_inr']) <= 1, w['ward_code']
  e = next(w for w in wards_file['wards'] if w['ward_code'] == 'E')
  assert e['spend_inr'] == 6322991 and e['budget_inr'] == 5300000
  assert [round(e['per100'][k], 2) for k in ('twin','over','fail','held')] == [1.11, 5.66, 29.54, 63.70]
  assert round(wards_file['medians']['per100']['held']) == 72
  assert len(wards_file['wards']) == 24
  ids = set(wo.id)
  for code, b in briefs.items():
      assert set(b['wo_ids']) <= ids, code
      assert set(re.findall(r'WO25-\d{5}', b['brief'])) <= ids, code
      assert b['source'] in ('claude', 'template (Claude unavailable)')
  ```
  Print a short summary at the end: twins, overbilled, DLP rows and ₹, and Ward E per-100.

- [ ] **Step 2: Run it to see it fail.** Run `PYTHONUTF8=1 python scripts/build_data.py "C:/Users/Baabli/hackathon/data/data"`. The expected result is a failure (NameError or AssertionError) until the functions exist.

- [ ] **Step 3: Implement `load`, `tag_work_orders` and `ward_summaries`** following the pinned rules.
  - `road_name` and `under_dlp` come from `roads.csv`.
  - `contractor_name` comes from the WO row, and `contractor_since` is `contractors.csv` `empanelled_since`. Don't use `active_wards`; it is noise.
  - `complaint_ids` is the `|`-split of `linked_complaint_ids`, or `[]`.
  - `localities` is the `;`-split of `wards.localities`.
  - `budget_inr` is `monsoon_repair_budget_inr_2025`.
  - `per100[k] = 100 × buckets[k] / spend`.
  - `dlp_review_per100 = 100 × dlp_review_inr / spend`.
  - Medians are taken over the 24 ward values with `statistics.median`.
  - Include October work orders; do not filter by date.

- [ ] **Step 4: Implement `template_brief` and `build_briefs`.** The template brief is ~120–150 words, plain language, and written entirely as questions. It contains:
  - one sentence with spend vs budget and the per-₹100 split;
  - one question each for the largest twin, the largest `b_over` and the largest-cost DLP-review row in the ward, each naming its WO id (skip any type the ward lacks);
  - one question on the failure rate vs the expected rate.
  
  `wo_ids` lists exactly the ids cited. `source` is `'template (Claude unavailable)'`.

- [ ] **Step 5: Run the script and confirm it passes.** Run `PYTHONUTF8=1 python scripts/build_data.py "C:/Users/Baabli/hackathon/data/data"`. Expected: exit code 0, the summary is printed, and three JSON files appear in `public/data/`. Check that the JSON loads strictly: `python -c "import json;[json.load(open(f'public/data/{n}.json',encoding='utf-8')) for n in ('work_orders','wards','briefs')]"`.

- [ ] **Step 6: Run `npm ci`** and confirm that `node_modules/.bin/vite` exists and `git diff --stat package.json` is empty.

---

### Task 2: Python rest: complaints, accidents, context, social, geo, next-rupee

**Depends on:** Task 1. Edits `scripts/build_data.py` only.

**Files:**
- Modify: `scripts/build_data.py`
- Generates: `public/data/complaints.json`, `accidents.json`, `context.json`, `social.json`, `geo.json`, `next_rupee.json`, and rewrites `briefs.json` with `social_summary` filled in.

**Interfaces:**
- Consumes: the Task 1 functions (`load`, `tag_work_orders`, `ward_summaries`, `build_briefs`, `write_json`).
- Produces: the contract types `Complaint`, `AccidentsFile`, `ContextFile`, `SocialPost`, `GeoFile` and `NextRupeeFile`, through these functions:
  - `haversine_m(lat1, lon1, lat2, lon2) -> float`
  - `locality_index(d) -> tuple[dict[str, tuple[str, float, float]], list[tuple[str, str, float, float]]]`, which maps exact lower-cased names and aliases to `(ward, lat, lon)`, plus a list used for prefix matching.
  - `lookup_locality(text: str, idx) -> tuple[str, float, float] | None`, following the pinned exact-then-unique-ward-prefix rule.
  - `nearest_road(lat, lon, ward, roads_df) -> str | None`. It uses the minimum haversine distance to the start, end and midpoint of each road in that ward.
  - `build_complaints(d) -> list[dict]`
  - `build_accidents(d, wo) -> dict`
  - `build_context(d, complaints) -> dict`
  - `build_social(d) -> list[dict]`
  - `build_geo(d, dataset_dir) -> dict`
  - `build_next_rupee(d, wo, wards_file, complaints, accidents, geo) -> dict`
  - `template_social_summary(posts: list[dict]) -> str`
  - `run_asserts_rest(...) -> None`

- [ ] **Step 1: Write the asserts first** in `run_asserts_rest`:
  ```python
  op = [c for c in complaints if c['is_open']]
  assert len(complaints) == 6501 and len(op) == 896
  assert sum(c['lat'] is not None for c in op) == 505
  assert all(c['placement'] is None for c in complaints if not c['is_open'])
  assert sum(a['road_caused'] for a in acc['rows']) == 241
  assert acc['city'] == {'failed_repairs': 611, 'held_repairs': 1888, 'after_failed': 112, 'after_held': 178}
  assert sum(a['after_failed_repair'] for a in acc['rows']) == 112
  assert len(geo['wards']) == 24 and len(geo['roads']) == 291
  assert len(social) == 650
  road_ward = {r['road_id']: r['ward'] for r in geo['roads']}
  for code, nw in nr['wards'].items():
      funded = [c for c in nw['candidates'] if c['funded']]
      assert sum(c['bmc_cost_inr'] for c in funded) == nw['allocated_inr'] <= nw['budget_inr'], code
      for c in nw['candidates']:
          assert road_ward[c['road_id']] == code
          assert c['open_complaint_ids'] or c['failed_wo_ids'], c['road_id']
          assert (c['bmc_cost_inr'] == 0) == c['dlp_route']
  ```
  Also assert that `nr['wards']` has a key for every ward in `wards.json`, and that `budget_mode == 'remaining'` exactly when `spend_inr < budget_inr`.

- [ ] **Step 2: Run the build to see it fail.** Run `PYTHONUTF8=1 python scripts/build_data.py "C:/Users/Baabli/hackathon/data/data"`. Expected: failure until the builders exist.

- [ ] **Step 3: Implement the complaints and accidents builders.**
  - **Complaints.** Resolve the ward with the pinned rule. Truncate `description` to 200 chars. For open complaints, set the placement:
    - `'gps'`: lat/lon present, so `nearest_road` in the resolved ward;
    - `'locality'`: no lat/lon, so use the locality coords, then `nearest_road` in that ward;
    - `'ward'`: no locality match, so `road_id = null`.
    
    Print counts per `ward_source` and `placement` (not asserted).
  - **Accidents.** Apply the pinned window. `ward = ward_code` and `cause = probable_cause`. `failed_wo_ids` and `held_wo_ids` are the matching WO ids. `window_days = 45`. Note in a comment that an accident can be both after a failed repair and after a held one. The UI says so.

- [ ] **Step 4: Implement the context, social and geo builders.**
  - **Context.** Bucket rows into Monday-start weeks from the `rainfall_daily` date range. Sum rainfall per station, mark red-alert days (any station with `imd_alert == 'Red'`) and big-tide days, and count `complaints[ward]` for complaints received in that week (all statuses, resolved ward only).
  - **Social.** For each post, take the longest locality name or alias found in the lower-cased text. Latin needles must be ≥4 chars and need non-letter boundaries (`(?<![a-z])needle(?![a-z])`), and Devanagari needles use a plain substring at any length (keep परळ and शीव). `ward` and `locality` come from that match, or are null. `engagement = likes_or_forwards`. `author = author_handle`.
  - **Geo.** Read `wards.geojson` and `roads.geojson` (Polygon or MultiPolygon, flattened into `rings`). Hotspots and facilities come from their CSVs (`tide_sensitive = 'Y'`; a blank `ambulance_entry_road` becomes null).

- [ ] **Step 5: Implement `build_next_rupee`.**
  - **Candidates:** roads in the ward with ≥1 open complaint placed on them (`road_id`), or ≥1 reopened WO.
  - **Raw components** per candidate:
    - `complaints = n_open + 0.1 × sum(upvotes)`
    - `severity = 1 − (h − h_min)/(h_max − h_min)`, where `h` is the median `sla_hours` of WOs with the road's `work_type`. The road's `work_type` is the mode of its open complaints' `category`, mapped only when it equals a WO `work_type` ('Road related' and 'Other' are ignored). Otherwise it is the work_type of the latest reopened WO on the road. Otherwise `'Pothole'`.
    - `failed_repairs` = count of reopened WOs on the road
    - `flood` = 1.0 if a hotspot is within 300 m of the road's start, mid or end point, plus 0.5 if that hotspot is tide-sensitive
    - `traffic` = mean of `congestion_index_0_10/10`, `peak_hour_vehicles/max` and `bus_routes_count/max`
    - `accidents` = sum over road-caused accidents on the road of Fatal 5, Grievous 3, Minor 1
    - `facilities` = Hospital 2 + School 1 for each facility whose `ambulance_entry_road` is this road
  - **Normalisation:** divide each component by its maximum across all candidates in the city (0 if the max is 0).
  - **Weights** (emit them as `weights`): `complaints 0.25, severity 0.10, failed_repairs 0.20, flood 0.15, traffic 0.10, accidents 0.15, facilities 0.05`. `score = 100 × Σ w·c`, 1 dp.
  - **Method:** among WOs with that `work_type`, take the `repair_method` with ≥10 jobs and the lowest reopen rate. Cost is the rate × the median `area_sqm` of that method for per-sqm methods, or the per-job rate. Round to an integer.
  - **DLP route:** `dlp_route = under_dlp and unit == 'per sqm'`, and then `bmc_cost_inr = 0`. Otherwise `bmc_cost_inr = est_cost_inr`.
  - **Budget:** if `spend < budget`, use `('remaining', budget − spend)`. Otherwise use `('next_10L', 1_000_000)`. Go through the candidates by score, descending. A candidate is funded if `bmc_cost_inr ≤ left`, and then `left −= bmc_cost_inr`.
  - **Reasons:** short strings, included only for non-zero components, for example `"3 open complaints (41 upvotes)"`, `"2 failed repairs"`, `"Flood hotspot 180 m (tide-sensitive)"`, `"Congestion 8.7/10, 19 bus routes"`, `"1 fatal, 2 grievous road-caused accidents"`, `"Ambulance road for KEM Hospital"`, and `"Under DLP: call original contractor, ₹0 to BMC"`.
  - **`rule`:** one sentence describing the candidates, the weights and the budget rule, for the source chip.

- [ ] **Step 6: Implement `template_social_summary`** and pass it into `build_briefs` for each ward. It is exactly 3 lines joined by `\n`:
  - the post count and source mix;
  - the most-mentioned localities;
  - the most-engaged post, truncated to ~100 chars.
  
  Use `"No social posts matched this ward's localities."` when there are none. Write all nine files.

- [ ] **Step 7: Run the build and confirm it passes.** Run `PYTHONUTF8=1 python scripts/build_data.py "C:/Users/Baabli/hackathon/data/data"`. Expected: exit code 0, both assert groups pass, and nine JSON files exist in `public/data/`. Strict JSON check: `python -c "import json,glob;[json.load(open(f,encoding='utf-8')) for f in glob.glob('public/data/*.json')]"`. Spot-check Ward E's top 3 candidates in `next_rupee.json`.

---

### Task 3: First screen UI (ward selector, headline, ₹100 bar, cards, committee questions, evidence)

**Depends on:** Task 1. Runs in parallel with Task 2, so it must not touch `scripts/build_data.py` or `public/data/`.

**Files:**
- Create: `src/pages/corporator/types.ts`, which is the contract block above, verbatim.
- Create: `src/pages/corporator/data.ts`, `src/pages/corporator/format.ts`, `scripts/check_format.ts`
- Create: `src/pages/corporator/Evidence.tsx`, `src/pages/corporator/Trail.tsx`, `src/pages/corporator/RupeeBar.tsx`, `src/pages/corporator/Cards.tsx`, `src/pages/corporator/CommitteeQuestions.tsx`, `src/pages/corporator/corporator.css`
- Create **stubs** that Tasks 4 and 5 will overwrite: `src/pages/corporator/NextRupeeCard.tsx`, `src/pages/corporator/WardMap.tsx`, `src/pages/corporator/BelowFold.tsx`. Each is a default-export component with the props below. It renders `<p className="placeholder">Coming next for Ward {ward.ward_code}.</p>`, so every destructured prop is used and `noUnusedParameters` passes. The `workOrders` stubs also render `({workOrders.length} jobs)`.
- Modify: `src/pages/CorporatorView.tsx` (replace it), and `src/pages/registry.tsx` (the Corporator entry's `status: 'active'` only).

**Interfaces:**
- Consumes: `work_orders.json` and `wards.json` (from Task 1).
- Produces (Tasks 4 and 5 rely on these exact names):
  - `data.ts`: `useJson<T>(file: string): { data: T | null; error: string | null }`. It caches with a module-level `Map<string, Promise<unknown>>`, so each file is fetched once, from `import.meta.env.BASE_URL + 'data/' + file`. A non-OK response gives `error = 'Data not built: run scripts/build_data.py (' + file + ')'`.
  - `format.ts` (pure, with no `import.meta` and no DOM at import time):
    - `formatInr(n: number): string`. ≥1e7 gives `₹x.xxCr`, ≥1e5 gives `₹x.xL` (1 dp), and anything smaller uses `₹` + `en-IN` grouping. So 6322991 gives `₹63.2L` and 5300000 gives `₹53.0L`.
    - `pct(x: number, dp = 0): string`, where `x` is 0..1.
    - `largestRemainder(values: number[], total = 100): number[]`
    - `median(xs: number[]): number`
    - `toCsv(rows: object[], columns: { key: string; label: string }[]): string`, RFC-4180 quoted and `\r\n` separated.
    - `downloadCsv(filename: string, csv: string): void`, which prefixes `\ufeff` and saves via a Blob and an `<a download>`.
    - `headline(w: { ward_code: string; spend_inr: number; budget_inr: number; per100: BucketSet }, medianHeld: number): string`. It uses `import type { BucketSet } from './types.ts'`. Over budget (spend > budget) gives `Ward E spent ₹63.2L against a ₹53.0L budget. ₹64 of every ₹100 went on repairs that held up. Ward median: ₹72.` Otherwise it gives `Ward T spent ₹… of its ₹… budget. ₹… of every ₹100 went on repairs that held up. Ward median: ₹72.` The held value is the `largestRemainder` value of `[twin, over, fail, held]`, and the median is `Math.round(medianHeld)`.
  - `Evidence.tsx`:
    - `SourceChip({ files, columns, rule }: { files: string[]; columns?: string[]; rule: string })`, a `<details className="cv-chip">` with summary "Source", listing the files, columns and rule.
    - `EvidenceDrawer<T extends object>({ label, rows, columns, filename, sumKey }: { label?: string; rows: T[]; columns: { key: keyof T & string; label: string; inr?: boolean }[]; filename: string; sumKey?: keyof T & string })`, a `<details>` with summary `Show evidence (N rows) ▸`. It contains a scrollable table, a footer `Total: formatInr(Σ sumKey)` when `sumKey` is set, and a "Download CSV" button. Array cells are joined with `|`.
  - `Trail.tsx`: `Trail({ wo, byId }: { wo: WorkOrder; byId: Map<string, WorkOrder> })`. It renders this chain: `complaint ids` (from `wo.complaint_ids`, or from `byId.get(wo.twin_of)` when it is a twin) → `WO id` → `road_name (road_id) · DLP: yes/no` → `contractor_name` → `billed ₹cost vs expected ₹expected (ratio×)`.
  - Stub props, which Tasks 4 and 5 keep exactly:
    - `NextRupeeCard({ ward }: { ward: WardSummary })`
    - `WardMap({ ward, workOrders }: { ward: WardSummary; workOrders: WorkOrder[] })`, where `workOrders` is already filtered to the ward
    - `BelowFold({ ward, workOrders }: { ward: WardSummary; workOrders: WorkOrder[] })`
  - `corporator.css` shared classes for Tasks 4 and 5: `.cv` (the root), `.cv-section`, `.cv-card`, `.cv-cards` (a 3-column grid that collapses below 760px), `.cv-table`, `.cv-chip`, `.cv-drawer`, `.cv-reason` (pill), `.cv-muted`, `.cv-num` (tabular-nums), `.cv-expander` (for `<details>`), and the segment colour classes `.seg-twin`, `.seg-over`, `.seg-fail`, `.seg-held`. The colours are `held: var(--accent)`, `fail: color-mix(in srgb, var(--accent) 40%, var(--surface))`, `over: color-mix(in srgb, var(--text-h) 55%, var(--surface))` and `twin: var(--text-h)`. They are also exposed as the custom properties `--seg-twin`, `--seg-over`, `--seg-fail` and `--seg-held` on `.cv`, so the SVG can use `var(--seg-fail)`.

- [ ] **Step 1: Write `scripts/check_format.ts`, which fails first.** It uses `node:assert/strict` and imports `../src/pages/corporator/format.ts`:
  ```ts
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
  ```
  Run `node scripts/check_format.ts` (Node 22.20 strips types). It should fail because the module is not found.

- [ ] **Step 2: Implement `format.ts`, then run `node scripts/check_format.ts`.** Expected output: `format checks passed`.

- [ ] **Step 3: Create `types.ts`, `data.ts`, `Evidence.tsx`, `Trail.tsx` and `corporator.css`** as specified in Interfaces.

- [ ] **Step 4: Build `CorporatorView.tsx` and `RupeeBar.tsx`.**
  - **`CorporatorView`:**
    - `PageShell title="Corporator"` wrapping `<div className="cv">`. Import `./corporator/corporator.css`.
    - `useJson<WardsFile>('wards.json')` and `useJson<WorkOrder[]>('work_orders.json')`. Show the error text if either fails, and "Loading…" while pending.
    - A ward `<select>` (state, default `'E'`, options `ward_code — ward_name`).
    - The headline is `<h2>{headline(ward, medians.per100.held)}</h2>`.
    - Then the components in this order: `RupeeBar`, `<div className="cv-cards">` with `WhereCard`, `LastCard` and `NextRupeeCard`, then `CommitteeQuestions`, `WardMap` and `BelowFold`.
  - **`RupeeBar({ ward, workOrders }: { ward: WardSummary; workOrders: WorkOrder[] })`:**
    - A flex row of non-zero segments, with widths equal to the raw `per100` and labels equal to the `largestRemainder` values (`₹1 billed twice` and so on).
    - Clicking a segment selects it. Below the bar, an `EvidenceDrawer` shows the rows where `b_<seg> > 0`, with columns id, road_name, contractor_name, repair_method, cost_inr, expected_inr and `b_<seg>`, and `sumKey = 'b_<seg>'`.
    - A `SourceChip`: files `work_orders.csv, rate_card.csv, roads.csv`; rule "Each work order is split in priority order: billed twice (whole cost of an unlinked twin) → overbilled (cost − 1.3 × expected, only when ratio ≥ 1.4) → failed within 30 days → held up. Segments total the ward's spend, shown per ₹100 with largest-remainder rounding."
    - The DLP line: `of which {formatInr(dlp_review_inr)} was paid for surface repairs on roads still under DLP: needs review ▸`. It opens a drawer of `flag_dlp_review` rows with `sumKey='cost_inr'`. Show the median `dlp_review_per100` next to it.

- [ ] **Step 5: Build `Cards.tsx` (exporting `WhereCard` and `LastCard`) and `CommitteeQuestions.tsx`.**
  - **`WhereCard({ workOrders })`:** two small tables: by contractor (jobs, ₹, share) and by repair_method. Add a `SourceChip` and a drawer of all the ward's rows with `sumKey='cost_inr'`.
  - **`LastCard({ ward, medians, workOrders })`:** the ward's `fail_rate` vs `expected_fail_rate` vs `medians.fail_rate`, then a line `Missed SLA: {sla_missed} jobs ({pct(sla_missed_rate)}; ward median {pct(medians.sla_missed_rate)})`, then a per-contractor table: contractor (empanelled since `contractor_since`), jobs, failed, actual % and expected % (mean `exp_fail`). Add a `SourceChip` whose rule says "expected = citywide re-open rate of each job's repair method, averaged over this mix", and a drawer of `reopened` rows with `sumKey='b_fail'`.
  - **`CommitteeQuestions({ ward, workOrders, byId })`:** three questions, one per type, picked from the ward's rows. Each has a `Trail` and a one-row drawer.
    - The twin with max `cost_inr`: "Work order {id} ({formatInr(cost)}, {contractor}) has no linked complaint and repeats {twin_of} on the same road with the same method {n} days apart. Was the same repair billed twice?"
    - The row with max `b_over`: "{id} billed {formatInr(cost)} for {area} sqm of {method}; the rate card gives {formatInr(expected)} ({ratio}×). What explains the difference?"
    - The `flag_dlp_review` row with max `cost_inr`: "{road_name} is still under its defect liability period, yet BMC paid {formatInr(cost)} for {method} ({id}). Should the original contractor have done this at no cost?"
    
    If a type is missing, show `No {billed-twice | overbilled | DLP-review} jobs found in Ward {code}.`

- [ ] **Step 6: Manual check for the Review Focus items 1–4.** If you have no browser, report this step as **not done**; do not claim it passed. Run `npm run dev` and open `#/corporator`. Ward E should show the headline above, a bar labelled 1 / 6 / 29 / 64, and three questions with trails. Then check:
  - Each segment's drawer footer equals the segment's ₹ amount.
  - Switching to Ward T shows no twin segment and the labels still sum to 100.
  - Ward T (one of the 18 under-budget wards) uses the under-budget headline.
  - Temporarily renaming `public/data/wards.json` shows the "Data not built" message; then rename it back.
  - The page looks right with the OS in dark mode.

- [ ] **Step 7: Run the build checks.** Run `npm run build && npm run lint && node scripts/check_format.ts`. Expected: all three pass, with 0 lint errors.

---

### Task 4: Next-rupee card and SVG ward map

**Depends on:** Tasks 2 and 3. Runs in parallel with Tasks 5 and 6. Touches only the files below.

**Files:**
- Overwrite the stubs `src/pages/corporator/NextRupeeCard.tsx` and `src/pages/corporator/WardMap.tsx`.
- Create (optional): `src/pages/corporator/map.css`, imported from `WardMap.tsx`.

**Interfaces:**
- Consumes: `useJson`, `formatInr`, `pct`, `SourceChip`, `EvidenceDrawer` and the `.cv-*` / `--seg-*` styles from Task 3, plus `next_rupee.json`, `geo.json`, `complaints.json` and `accidents.json`.
- Produces: `NextRupeeCard({ ward }: { ward: WardSummary })` and `WardMap({ ward, workOrders }: { ward: WardSummary; workOrders: WorkOrder[] })`, with the props unchanged from the stubs.

- [ ] **Step 1: `NextRupeeCard`.**
  - Title "Where next?". Show the budget line: `budget_mode === 'remaining'` gives `{formatInr(budget_inr)} left in the 2025 budget`, and otherwise `Over budget: plan for the next ₹10.0L`. Then show the allocated amount.
  - List the top 3 candidates: road_name, score, `.cv-reason` chips from `reasons`, method, and `formatInr(bmc_cost_inr)`. Candidates with `dlp_route` show "₹0 to BMC (DLP)". Show funded or unfunded status.
  - Add a `SourceChip` with files `complaints.csv, localities.csv, work_orders.csv, flood_hotspots.csv, traffic.csv, accidents.csv, facilities.csv, rate_card.csv, roads.csv`. Its rule is `rule` plus the weights rendered as `complaints 25% · severity 10% · …`.
  - Add two `EvidenceDrawer`s with columns road_id, road_name, score, method, est_cost_inr, bmc_cost_inr and funded:
    - funded candidates only, with `sumKey='bmc_cost_inr'`, so the footer equals `allocated_inr`;
    - all candidates, labelled "All candidates", with no `sumKey`.

- [ ] **Step 2: `WardMap`.**
  - **Projection:** take the bbox of the ward's `rings`. `x = (lon − minLon) × cos(midLat)` and `y = maxLat − lat`, scaled into a `viewBox` about 900 wide. Points outside the ward polygon may still be drawn.
  - **Polygon:** a `<path fill-rule="evenodd">` with fill `var(--accent-bg)` and stroke `var(--border)`.
  - **Roads in the ward:** `<polyline>`s coloured by the ward's `Σ b_fail` on that `road_id`. Roads with 0 failed spend use `var(--border)`. Otherwise use `var(--seg-fail)`, with a stroke width from 2 to 7 by tercile, and a `<title>` showing road_name and ₹ failed. Add a legend.
  - **Layers** (checkbox toggles, all on except schools):
    - flood hotspots: triangles; tide-sensitive ones are outlined;
    - hospitals and schools;
    - road-caused accidents in the ward;
    - open complaints in the ward that have lat/lon.
    
    Every marker has a `<title>`.
  - Add a `SourceChip` (files `wards.geojson, roads.geojson, work_orders.csv, flood_hotspots.csv, facilities.csv, accidents.csv, complaints.csv`). Under the map, add a drawer of roads with ₹ failed (`sumKey`), whose total equals `ward.buckets.fail`.

- [ ] **Step 3: Manual check.** In `npm run dev`, Ward E shows the polygon, coloured roads, working layer toggles and 3 next-rupee roads with reasons. A ward in `'remaining'` mode shows the remaining-budget line. Check dark mode.

- [ ] **Step 4: Run the build checks.** Run `npm run build && npm run lint`. Both should pass.

---

### Task 5: Below-the-fold expanders (complaints, rain & tides, road safety, citizen voice, brief)

**Depends on:** Tasks 2 and 3. Runs in parallel with Tasks 4 and 6. Touches only the files below.

**Files:**
- Overwrite the stub `src/pages/corporator/BelowFold.tsx`.
- Create: `src/pages/corporator/below/ComplaintsPanel.tsx`, `RainTidesPanel.tsx`, `RoadSafetyPanel.tsx`, `CitizenVoicePanel.tsx` and `BriefPanel.tsx`.
- Create (optional): `src/pages/corporator/below/below.css`.
- Create (optional): `src/pages/corporator/below/stats.ts`, for any pure helpers. Don't export helpers from `.tsx` files.

**Interfaces:**
- Consumes: `useJson`, `formatInr`, `pct`, `median`, `SourceChip`, `EvidenceDrawer` and the `.cv-*` styles from Task 3, plus `complaints.json`, `context.json`, `accidents.json`, `social.json` and `briefs.json`.
- Produces: `BelowFold({ ward, workOrders }: { ward: WardSummary; workOrders: WorkOrder[] })`, with the same props as the stub. Each panel takes `{ ward: WardSummary }`; `RoadSafetyPanel` also takes `workOrders`.

- [ ] **Step 1: `BelowFold`** renders five `<details className="cv-expander">` elements, all closed by default, in this order: Complaints, Rain & tides, Road safety, Citizen voice, Committee brief. Each panel handles its own `useJson` error message.

- [ ] **Step 2: `ComplaintsPanel`** works on complaints where `ward === ward.ward_code`.
  - **Funnel:** received (all) → duplicates (`Closed - Duplicate`) → resolved (`Resolved`) / open (`is_open`) / rejected (`Rejected - *`) / forwarded (`Forwarded *`). Each count is a button that selects that stage, and one `EvidenceDrawer` shows the selected stage's rows.
  - The 5 oldest open complaints by `received_at` (id, age in days as of the latest `received_at` in the data, category, locality, description).
  - The top 5 categories and top 5 localities, and the language mix (`en, hi-en, mr, hi`).
  - A `SourceChip` noting that duplicates, rejected and forwarded complaints are excluded from open counts, and that ward comes from `ward_code`, then a locality lookup, then the nearest ward centroid.

- [ ] **Step 3: `RainTidesPanel`.**
  - An SVG chart over `weeks`: bars for `complaints[ward_code] ?? 0`, and two polylines for `santacruz_mm` and `colaba_mm` on a second scale, labelled at both axes. Mark weeks with red-alert days and with big-tide days using small markers above the bars, and add a legend.
  - Add a `SourceChip` (`rainfall_daily.csv, tides.csv, complaints.csv`) and a drawer of the weekly rows.

- [ ] **Step 4: `RoadSafetyPanel`.**
  - A table of the ward's accidents by cause × severity.
  - The road-caused count.
  - Road-caused accidents after a failed repair (count, and per 100 of the ward's failed repairs), and after a held repair (count, and per 100 of the ward's held repairs). Show the city baseline beside these from `city`: 112 of 611 vs 178 of 1888.
  - Fixed copy: "Counts accidents that happened on a road within 45 days after a repair there. This does not show the repair caused the accident. An accident can follow both a failed and a held repair on the same road, so the two counts overlap." Each accident is counted once in the cause table.
  - Add a drawer of the ward's accidents.

- [ ] **Step 5: `CitizenVoicePanel` and `BriefPanel`.**
  - **CitizenVoicePanel:** posts with `ward === ward_code`. Show the top 5 by `engagement` (source, date, text, engagement), and `briefs[ward].social_summary` split on `\n`, labelled with `briefs[ward].source`. Add a `SourceChip` (`social_posts.csv, localities.csv`, matched by locality name or alias in the text) and a drawer of all matched posts.
  - **BriefPanel:** `briefs[ward].brief` as paragraphs, a label badge showing `source` (`template (Claude unavailable)` is shown verbatim), and the cited `wo_ids`.

- [ ] **Step 6: Manual check.** In `npm run dev`, all five expanders open for Ward E. The funnel stages add up to received, so duplicates + resolved + open + rejected + forwarded equals received. The chart renders in light and dark mode. The brief shows the template label.

- [ ] **Step 7: Run the build checks.** Run `npm run build && npm run lint`. Both should pass.

---

### Task 6: Claude brief at build time, with template fallback and WO-id scrubbing

**Depends on:** Task 2. Edits `scripts/build_data.py` only, and runs in parallel with Tasks 4 and 5.

**Files:**
- Modify: `scripts/build_data.py`

**Interfaces:**
- Consumes: `build_briefs`, `template_brief`, `template_social_summary` and the `social` list (Tasks 1 and 2).
- Produces: `briefs.json` in the same `BriefsFile` shape, plus these functions:
  - `claude_text(prompt: str, max_tokens: int = 600) -> str | None`. It returns None when `ANTHROPIC_API_KEY` is unset or on any error (print the error type, never the key). It uses the `anthropic` package if it imports. Otherwise it uses a stdlib `urllib.request` POST to the Messages API. Model `claude-opus-5-5`. No pip install.
  - `scrub_wo_ids(text: str, allowed: set[str]) -> tuple[str, list[str]]`. It removes every `WO25-\d{5}` token not in `allowed`, then tidies the doubled spaces and the empty `()` left behind. It returns the cleaned text and the sorted list of kept ids that appear.

- [ ] **Step 1: Write the self-test first.** Add `_selftest_scrub()`, which `main` calls before the build:
  ```python
  t, ids = scrub_wo_ids('Check WO25-00004 and WO25-99999 (WO25-99998).', {'WO25-00004'})
  assert 'WO25-99999' not in t and 'WO25-99998' not in t and '()' not in t
  assert ids == ['WO25-00004']
  ```
  Run `PYTHONUTF8=1 python scripts/build_data.py "C:/Users/Baabli/hackathon/data/data"`. It should fail until `scrub_wo_ids` exists.

- [ ] **Step 2: Look up the request shape.** Use the `claude-api` skill if it is available, or the official Messages API docs, for the exact endpoint, headers and response shape. Do not write them from memory.

- [ ] **Step 3: Implement `claude_text` and `scrub_wo_ids`, and wire them into `build_briefs`.** For each ward:
  - **Brief prompt:** the ward's summary numbers (spend, budget, per-₹100, DLP review ₹, fail vs expected vs median) and the flagged WO ids with their key facts (twins, the top 5 by `b_over`, the top 5 DLP-review rows by cost). Ask for "a ~150-word committee brief in plain language, written as questions, no accusations, use only the numbers and ids given".
  - Scrub the result against the ids that were sent. `wo_ids` = the kept ids. `source = 'claude'`.
  - **Social prompt:** up to 20 of the ward's matched post texts. Ask for exactly 3 lines.
  - Per ward, it is all-or-nothing. If either call returns None, use both template texts with `source = 'template (Claude unavailable)'`. Otherwise use both Claude texts with `source = 'claude'`.
  - Print `briefs: N claude, M template`.

- [ ] **Step 4: Run without a key and confirm it passes.** Run `env -u ANTHROPIC_API_KEY PYTHONUTF8=1 python scripts/build_data.py "C:/Users/Baabli/hackathon/data/data"`. Expected: exit code 0, every assert passes (including the Task 1 brief-id asserts), `briefs: 0 claude, 24 template`, and every `briefs.json` entry has `source == "template (Claude unavailable)"`. Confirm that `grep -r "sk-ant" public src scripts` returns nothing.

- [ ] **Step 5 (only if a key is later provided by the user):** run the build with the key set in the shell environment only, then confirm the brief-id asserts pass and that `source == "claude"` for the wards that succeeded.
