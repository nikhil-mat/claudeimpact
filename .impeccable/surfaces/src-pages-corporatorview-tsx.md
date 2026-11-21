---
version: 1
slug: "src-pages-corporatorview-tsx"
primary_target: "src/pages/CorporatorView.tsx"
related_targets: ["src/pages/corporator"]
---

## Scope
Corporator view (`#/corporator`): `src/pages/CorporatorView.tsx` and `src/pages/corporator/**`. Mode: **Operate**. Audience: hackathon judges watching a projected 3-minute demo, standing in for a BMC ward corporator preparing for a ward committee meeting.

## Direction contract

THESIS: the ward's monsoon money trail is laid out as an official government file, so every number reads as a matter on the record that the committee must answer. The screen refuses the category default of a grey KPI-tile dashboard with a blue accent.

OWN-WORLD:
- **Palette:** a khaki file-board shell (#C9AE74) with a red-tape rule under it (#B3261E). Noting-sheet green panels (#EEF2E3) sit on a paler board ground. Text is ink black (#1C1B19). Stamp-pad violet (#5B3E96) is reserved for flags and committee matters. Held-up money is a deep register green (#2F6B3A). Red is only for over budget and failed repairs.
- **Type:** Archivo for all UI and the large numerals (tabular). Courier Prime is used only for file numbers, work-order and complaint ids, and source chips.
- **Stamps:** stamps are bordered, slightly rotated violet capsules. Two are used: NEEDS REVIEW and FOR COMMITTEE.
- **Dark mode:** a night-office version of the same palette, with deep olive-ink panels and the khaki shell kept.

STORY: the judge reads the verdict sentence and the giant "₹64 of every ₹100 held up". They see where each ₹100 went as one register bar. They scan the three answers (where it went, whether it lasted, where next). Then they open a committee matter and follow its trail from complaint through to the bill. Any figure opens its source rows.

FIRST VIEWPORT (1440 wide):
- **Shell band:** a khaki band across the full width. On the left, "Follow the Rupee" and "Corporator view". Next to it, a typewriter file plate reading `FILE No. <ward>/MRR/2025`. On the right, the ward select and a "← All views" link.
- **Verdict panel:** the verdict sentence at about 44px with red figures, beside the giant ₹64 numeral (about 120px) and the ward median.
- **Register bar:** the full-width register bar at 52px, with ₹ values inside the segments and the labels under them. Below it, the NEEDS REVIEW stamp line for DLP.
- **Answer panels:** three noting-sheet panels in a row.
- **Committee matter:** the first committee matter peeks in at the fold, in a violet-ruled panel.

FORM: Sarkari File, my rank 1 of 7, chosen by the user as IMPECCABLE’S PICK. seed:8130ee479cf07d66

Signature move: committee matters are stamped noting entries. Each one has its WO id as the headline in Courier, a violet FOR COMMITTEE stamp, and its trail set as a file-movement line (complaint → WO → road → contractor → ₹). Navigation and controls stay standard web controls.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Constraints
- Data, numbers, evidence drawers and source chips stay exactly as computed. The redesign doesn't change any figure or claim.
- Source chips use the real file names already in the code. Don't invent files such as "inspections".
- No new npm dependencies. Fonts are self-hosted from `public/fonts/`.
- The wide layout applies to the Corporator view only. Other views keep the 960px `#root`.
