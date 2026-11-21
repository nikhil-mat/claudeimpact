# Follow the Rupee

**Live demo: https://claudeimpact-followtherupee.pages.dev**

| View | Link | For |
|---|---|---|
| Citizen | [#/citizen](https://claudeimpact-followtherupee.pages.dev/#/citizen) | Report a road problem, track it through the repair tender, see your ward's complaint map |
| Corporator | [#/corporator](https://claudeimpact-followtherupee.pages.dev/#/corporator) | Where a ward's monsoon repair money went, whether it held up, what to ask the ward committee |
| Ward Officer | [#/ward-officer](https://claudeimpact-followtherupee.pages.dev/#/ward-officer) | Money trail and audit dashboard, and the complaint map with tenders and who's responsible |

Built at the Claude Impact Lab Mumbai (21 Nov 2026) on the "Follow the Rupee" dataset.
**All data is synthetic, all contractors are fictional, and tenders and officials shown on the map are dummy data.**

## What's in it

- **Citizen view**: mock DigiLocker sign-in, ward selection, photo report with mock analysis,
  "My complaints" that replays a real tender timeline, and a complaint map of the citizen's ward.
- **Corporator view**: the ward verdict and key figures, where each ₹100 went (held up / failed
  within 30 days / over-billed / billed twice), spend by contractor and method, repair durability,
  the next-rupee plan, three evidence-backed questions for the ward committee, a ward map of
  failed repairs, and annexures. Every figure has a source chip and an evidence drawer with CSV export.
- **Ward Officer view**: the Follow the Rupee dashboard (city overview, ward money trail, audit
  flags, contractor scorecards, next-rupee planner, method notes) and the complaint map: every
  complaint as a dot coloured by problem, roads covered by (dummy) tenders greyed out, and a
  "Who's responsible" card with a ready-to-send message to the corporator.

## One audit engine

`engine/build.py` is the single source for audit flags, so every view shows the same numbers:

- **Over-billed**: billed more than 1.35× the rate card (113 jobs).
- **Possible double billing**: a job with no linked complaint that repeats another job on the
  same road with the same method within 7 days (45 jobs).
- **Paid during DLP**: BMC paid for surface repairs on a road still under its defect liability
  period (274 jobs); drainage work on such roads is marked "review".

The Corporator data (`scripts/build_data.py`) and Ward Desk facts
(`scripts/ward-officer/build-facts.mjs`) read `engine/out/audit_flags.csv` instead of computing
their own flags.

## Run locally

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check and build to dist/
npm run lint
```

## Rebuild the data

```sh
git clone https://github.com/SumeetGDoshi/Claude-Impact-Labs-data-2 ../Claude-Impact-Labs-data-2
DATA=../Claude-Impact-Labs-data-2/data

python engine/build.py --data $DATA                      # audit engine → engine/out/
PYTHONUTF8=1 python scripts/build_data.py $DATA          # Corporator view → public/data/
node scripts/ward-officer/build-facts.mjs $DATA          # Ward Desk facts
node scripts/ward-officer/recheck-agents.mjs             # re-check Ward Desk text against new facts
node scripts/build-data.mjs $DATA                        # Citizen view → src/data/civic.json
```

`engine/build.py` and `scripts/build_data.py` need Python with pandas and numpy.
The Ward Officer dashboard and map in `public/ward-officer/rupee/` are static pages built by the
companion pipeline (the same audit engine); copy them across when that pipeline changes.

## Deploy

The live demo is on Cloudflare Pages (project `claudeimpact-followtherupee`):

```sh
npm run build
npx wrangler pages deploy dist --project-name claudeimpact-followtherupee --branch main
```

Run the deploy from outside the repo folder (or pass the full path to `dist`), because the repo's
`wrangler.jsonc` describes the Workers setup, not Pages. The app uses hash routes (`#/corporator`),
so any static host works.

## Data

Wards, roads and repair work orders in the Citizen view come from the
[Claude Impact Lab Mumbai dataset](https://github.com/SumeetGDoshi/Claude-Impact-Labs-data-2)
(CC BY 4.0). That data is **synthetic**: it is not BMC data and all contractors are fictional.

`src/data/civic.json` is generated from it:

```sh
git clone https://github.com/SumeetGDoshi/Claude-Impact-Labs-data-2 ../Claude-Impact-Labs-data-2
node scripts/build-data.mjs ../Claude-Impact-Labs-data-2/data
```

A new complaint is matched to a work order of the same category on the nearest road in the
chosen ward, and its status replays that tender's real timeline on a fast demo clock
(`HOUR_MS` in `src/pages/citizen/mock.ts`).

Map tiles © Esri. Ward outlines are clipped to Mumbai's land boundary from
© OpenStreetMap contributors (ODbL).
