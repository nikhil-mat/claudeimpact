# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **Primary (demo day, 21 Nov 2026):** hackathon judges at Claude Impact Lab Mumbai, watching a 3-minute walkthrough of the app on a projected screen. They score audit accuracy (25%), fair accountability (20%), budget recommendation (20%), complaint-to-work-order trail (15%), and usability and demo clarity (20%).
- **Personas the app stands in for:** a BMC ward corporator preparing for a ward committee meeting (Corporator view), a citizen tracking a complaint (Citizen view), and a ward officer managing repairs (Ward Officer view).

## Product Purpose
The app follows Mumbai's monsoon road-repair money. For each ward it shows where the money went, whether the repairs lasted, and where the next rupee should go. Success means a judge understands the ward's verdict within 5 seconds, and can click any number to see the exact source rows that prove it.

## Positioning
Every number is traceable. Each figure carries its source (file, columns, rule) and opens the rows behind it, and every audit flag shows its full trail: complaint → work order → road → contractor → ₹ billed vs ₹ expected. Claude only writes prose around numbers computed in advance. It never invents figures or ids.

## Operating Context
- A static React + TypeScript + Vite site with hash routing and a page registry (`src/pages/registry.tsx`).
- The data is precomputed by `scripts/build_data.py` into `public/data/*.json`. The dataset is synthetic and all contractors are fictional.
- The demo ward is E (Byculla). It is projected on a large screen.

## Capabilities and Constraints
- Corporator view sections:
  - a headline verdict
  - a "where each ₹100 went" bar (billed twice / overbilled / failed within 30 days / held up), with a separate line for surface repairs on DLP roads, which need review
  - three answer cards: where the money went, whether it lasted, where to spend next
  - three questions for the ward committee, each with its trail
  - a ward map
  - expanders for complaints, rain and tides, road safety, citizen voice and the committee brief
- Flags are worded as questions for the committee, never as accusations. Accident links are shown as co-occurrence, never as cause.
- No new npm dependencies. Charts and the map are inline SVG.
- The Corporator view may use a wide layout. The 960px `#root` cap stays in place for the other views, which must not be touched.
- There is no Claude API key yet, so the briefs are filled-in templates and labelled that way.

## Brand Commitments
None binding. Light and dark mode must both work.

## Evidence on Hand
Only the synthetic dataset in `public/data/`. No real BMC data, testimonials or real contractor names.

## Product Principles
1. Verdict first, evidence one click away.
2. Fair before fierce: compare against what was expected and the ward median, and ask questions instead of accusing.
3. Show the trail: every claim links to rows a judge can check.
4. Readable on a projector: large numbers, clear hierarchy, nothing that needs squinting.
