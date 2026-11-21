---
name: Follow the Rupee (Corporator view)
description: A ward's monsoon road-repair money laid out as an official government file; every figure a matter on the record.
colors:
  file-shell: "#c9ae74"
  file-shell-ink: "#1c1b19"
  file-shell-muted: "#4a3f27"
  red-tape: "#b3261e"
  board-ground: "#e9e4d3"
  noting-sheet: "#eef2e3"
  noting-sheet-nested: "#e3e9d4"
  sheet-rule: "#c5cdb1"
  ink: "#1c1b19"
  ink-secondary: "#4b4a3f"
  ink-tertiary: "#6d6b58"
  stamp-violet: "#5b3e96"
  stamp-violet-wash: "rgba(91, 62, 150, 0.08)"
  over-budget-red: "#b3261e"
  register-green: "#2f6b3a"
  overbill-amber: "#8a6a1f"
typography:
  hero:
    fontFamily: "Archivo, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(5rem, 8vw, 7.5rem)"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "-0.04em"
  verdict:
    fontFamily: "Archivo, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(1.9rem, 2.9vw, 2.75rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "Archivo, Segoe UI, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Archivo, Segoe UI, system-ui, sans-serif"
    fontSize: "1.15rem"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "Archivo, Segoe UI, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.45
  small:
    fontFamily: "Archivo, Segoe UI, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Archivo, Segoe UI, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.45
  file-mark:
    fontFamily: "Courier Prime, Courier New, monospace"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: "0.02em"
rounded:
  ctl: "8px"
  sheet: "12px"
  segment: "4px"
  stamp: "6px"
  pill: "999px"
spacing:
  s-1: "4px"
  s-2: "8px"
  s-3: "12px"
  s-4: "16px"
  s-5: "24px"
  s-6: "32px"
  s-7: "48px"
  s-8: "64px"
components:
  sheet:
    backgroundColor: "{colors.noting-sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "24px 32px"
  answer-card:
    backgroundColor: "{colors.noting-sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "24px"
  committee-matter:
    backgroundColor: "{colors.noting-sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "24px 32px"
  annexure:
    backgroundColor: "{colors.noting-sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    height: "56px"
  stamp:
    backgroundColor: "{colors.stamp-violet-wash}"
    textColor: "{colors.stamp-violet}"
    typography: "{typography.label}"
    rounded: "{rounded.stamp}"
    padding: "2px 10px"
  source-chip:
    backgroundColor: "{colors.noting-sheet-nested}"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  file-plate:
    textColor: "{colors.file-shell-ink}"
    typography: "{typography.file-mark}"
    padding: "4px 10px"
  select-control:
    backgroundColor: "{colors.noting-sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.ctl}"
    padding: "8px 12px"
  drawer-button:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.noting-sheet}"
    rounded: "{rounded.ctl}"
    padding: "6px 14px"
  register-segment:
    textColor: "{colors.noting-sheet}"
    rounded: "{rounded.segment}"
    height: "56px"
    padding: "0 14px"
---

# Design System: Follow the Rupee (Corporator view)

## Overview

**Creative North Star: "The Sarkari File"**

The ward's monsoon money trail is set as an official government file. A khaki file-cover band with a red-tape rule sits on top; noting-sheet green panels lie on a paler board; a violet stamp-pad ink marks what the committee must answer. Every number reads as a matter on the record, not as a KPI tile. The surface is a document first and a dashboard second, tuned for a projected screen: very large numerals, wide 1440px column, generous sheet padding.

Density is moderate and ruled: hairline rules (not shadows) separate rows and sheets, text is tinted ink rather than grey, and the typewriter face appears only where a clerk would type (file numbers, work-order ids, source chips). Controls stay ordinary web controls; the file metaphor lives in colour, stamps, rules and the trail line, not in skeuomorphic chrome.

Scope boundary: this world applies to the Corporator view only (`#/corporator`, `src/pages/CorporatorView.tsx`, `src/pages/corporator/`). The gateway, Citizen and Ward Officer views still use the older generic teal theme in `src/index.css` and are not covered by this document.

**Key Characteristics:**
- Khaki shell band and red-tape rule frame the page; sheets are green-tinted paper on a paler board.
- One violet reserved for flags and committee matters; red only for over budget and failed; green only for money that held.
- Archivo carries all UI and every large numeral (tabular); Courier Prime only for ids and file marks.
- Depth is a 1px sage rule, not a shadow.
- Dark mode is a night-office version of the same file, shell kept khaki.

## Colors

A khaki, sage and ink palette with three semantic inks (violet, red, green) plus one amber, each with a single job. Values are the light theme; the dark theme (prefers-color-scheme) is recorded in the sidecar.

### Primary
- **Stamp-Pad Violet** (`{colors.stamp-violet}`): flags, committee matters, links, drawer/expander summaries, focus ring, selection, trail arrows and the stamp capsule. Its wash (`{colors.stamp-violet-wash}`) backs stamps and summary hover.

### Secondary
- **Khaki File Cover** (`{colors.file-shell}`): the header band (full-bleed) and the 4px top tab on each answer card.
- **Red Tape** (`{colors.red-tape}`): the 3px rule under the shell band.

### Tertiary (semantic inks)
- **Register Green** (`{colors.register-green}`): money that held; the giant hero numeral, the "held" register segment, funded marks.
- **Over-Budget Red** (`{colors.over-budget-red}`): over budget and failed repairs; emphasised figures in the verdict (`cv-bad`), big KPI numerals, the billed-twice segment. Same value as red tape.
- **Overbill Amber** (`{colors.overbill-amber}`): the overbilled-excess segment only.

### Neutral
- **Board Ground** (`{colors.board-ground}`): page background behind the sheets.
- **Noting-Sheet Green** (`{colors.noting-sheet}`): every sheet, card, annexure and drawer panel.
- **Nested Sheet** (`{colors.noting-sheet-nested}`): zebra/hover rows, chips, notes, map layer pills.
- **Sheet Rule** (`{colors.sheet-rule}`): all borders and ruled lines.
- **Ink** (`{colors.ink}`): primary text, also the "failed within 30 days" segment and selected-state fills.
- **Secondary Ink** (`{colors.ink-secondary}`) and **Tertiary Ink** (`{colors.ink-tertiary}`): supporting text and captions; tinted olive, not grey.
- **Shell Ink / Shell Muted** (`{colors.file-shell-ink}`, `{colors.file-shell-muted}`): text on the khaki band.

### Named Rules
**The One Job Rule.** Violet means flag or committee; red means over budget or failed; green means held. No colour borrows another's job, and none is decorative.

**The Four-Segment Ramp Rule.** The Rs100 register bar is exactly four segments: held (green), failed within 30 days (ink), overbilled (amber), billed twice (red). New data categories do not get a fifth hue.

**The Tinted Ink Rule.** Text greys are olive-tinted inks (`ink-secondary`, `ink-tertiary`), never neutral grey. All corporator styles read the `--f-*` tokens in `tokens.css`; no hard-coded colours.

## Typography

**Display / UI Font:** Archivo (variable 400 to 800, with Segoe UI, system-ui, sans-serif), self-hosted from `public/fonts/`
**File-mark Font:** Courier Prime 400/700 (with Courier New, monospace), self-hosted
**Numerals:** tabular (`font-variant-numeric: tabular-nums`) across the whole view.

**Character:** A heavy, confident grotesque for statements and numbers, with a typewriter face reserved for the clerk's marks. Weight, not size alone, carries emphasis (800 for numerals and section titles).

### Hierarchy
- **Hero** (800, clamp(5rem, 8vw, 7.5rem), 0.9): the single giant "₹64 of every ₹100" numeral in register green, right-aligned.
- **Verdict** (700, clamp(1.9rem, 2.9vw, 2.75rem), 1.15, max 24em, balanced): the verdict sentence; figures inside it go red at 800.
- **Headline** (800, 1.5rem, 1.2): section headings (`cv-sec-h`) and brand name.
- **Title** (700, 1.15rem): annexure titles; matter question runs at 1.35rem / 600.
- **Body** (400, 1rem, 1.45): default; tables and drawers use Small (0.875rem).
- **Label** (700, 0.75rem): stamps, table column heads, chips (chips set in Courier Prime).
- **File mark** (Courier Prime 700, 0.875rem to 1.5rem): work-order ids as matter headlines (1.5rem), file plate (1rem), complaint ids, annexure letters, trail line.

### Named Rules
**The Typewriter Only Rule.** Courier Prime appears only on file numbers, work-order and complaint ids, source chips, annexure letters and the file-movement trail. Never for prose or headings.

**The Big Numeral Rule.** Key figures are set at 3.25rem or larger (answer-card KPIs clamp 3.25 to 4.5rem) in weight 800 with tight tracking (-0.04em).

## Layout

The Corporator view breaks out of the shared 960px column: `#root` becomes max-width 1440px with 32px side padding, only while `.cv` is present. Vertical flow is a single column with 32px (`s-6`) gaps between major blocks: shell band, verdict sheet, register bar sheet, three answer cards (3-column grid, 24px gap), committee matters (two-column, 1.1fr / 1fr), ward map, then the annexure list (48px top margin). The shell band and tape rule bleed edge-to-edge using a 100vmax box-shadow/clip-path trick while content stays in the 1440px column.

Spacing is a 4px-based scale (4, 8, 12, 16, 24, 32, 48, 64). Sheets pad 24px 32px; answer cards 24px. Below 1100px the 3-column and 2-column grids collapse to one column, the hero numeral left-aligns, the legend stacks, and the ward select goes full width. Below 600px the DLP line stacks and register labels shrink. Map canvas is 520px tall (360px under 800px). Prose in the noting entry is capped at 70ch.

## Elevation & Depth

Flat and ruled. Sheets, cards, matters and annexures are separated from the board by a single 1px sage rule (`{colors.sheet-rule}`) and the tonal step from board to sheet; there is no shadow on them. Emphasis comes from colour tabs (4px khaki top tab on answer cards, 3px violet top rule on committee matters) and from the rotated stamp.

### Shadow Vocabulary
- **Sheet shadow** (`box-shadow: 0 1px 2px rgba(60, 48, 20, 0.08), 0 6px 18px -8px rgba(60, 48, 20, 0.18)`): defined as `--shadow-sheet` and used only by the ward map container.

### Named Rules
**The Single Elevation Rule.** The sheet is the only elevation: a ruled 1px border at rest. Hover and selection change fill, outline or brightness; they do not lift.

## Shapes

Soft-cornered paper, small-cornered controls. Sheets are 12px radius; controls (select, buttons, scroll wells, notes) 8px; register segments 4px; stamps 6px; chips and reason pills fully round (999px). Stamps are bordered (2px) capsules rotated -2 degrees, the one deliberate tilt in an otherwise orthogonal layout. Dashed 1px rules mark secondary separations (the DLP line). Focus is a 2px violet outline with 2px offset on every focusable element.

## Components

### Shell band
Khaki full-bleed band with the brand name (800, 1.5rem), a Courier file plate (2px ink border, no radius) reading `FILE No. <ward>/MRR/2025`, and on the right the ward select and an underlined "All views" back link with a masked arrow glyph. A 3px red tape rule sits directly beneath.

### Sheets, cards and matters
Noting-sheet green, 12px radius, 1px sage rule. The answer card adds a 4px khaki top tab; the committee matter adds a 3px violet top rule. Card headings are 0.8125rem 700 secondary ink (see not-canonized note).

### Stamps
Violet text on violet wash, 2px violet border, 6px radius, 800 weight 0.75rem uppercase, rotated -2deg. Two exist: NEEDS REVIEW and FOR COMMITTEE.

### Register bar
Four flush segments (56px tall, 3px gaps, 4px radius) containing rupee values at 800 1.5rem in sheet colour. Segments are buttons: hover brightens 12%, selected shows a 3px ink outline offset 3px, focus a 3px violet outline. Legend cells sit beneath, aligned to segments; the DLP line below is separated by a dashed rule.

### Source chips and drawers
Chips are `details` pills in Courier 0.75rem (nested-sheet fill, sage border, chevron); open they show a bordered body, absolutely positioned under headers and hero. Drawers and expanders use violet underlined summaries with a wash on hover, a 280px scrolling ruled table, and an ink-fill button that inverts to outline on hover.

### Tables
Collapsed borders, sage hairlines, 0.875rem; sticky header in secondary ink with a 1.5px ink underline; numeric columns right-aligned; row hover is the nested-sheet fill.

### Committee matter (signature)
Two-column sheet: left a matter number (violet 700), the FOR COMMITTEE stamp, the work-order id as Courier 1.5rem headline and the question at 1.35rem / 600; right the file-movement trail, a wrapping Courier list whose items are joined by violet arrows (complaint, WO, road, contractor, rupees).

### Annexures
Collapsible sheets, 56px minimum summary: Courier violet annexure letter, 1.15rem title, right-aligned preview figure, rotating chevron (reduced-motion safe). Inside: ruled tables, funnel stat boxes (selected = ink fill), inline SVG charts using stamp-violet lines and ink-tertiary bars.

### Ward map
Sheet-coloured panel with layer toggle pills (36px tall, 999px radius, violet accent-color checkboxes), a 520px SVG canvas and a ruled legend.

## Do's and Don'ts

### Do:
- **Do** read every colour from the `--f-*` tokens in `src/pages/corporator/tokens.css`; add dark-mode values alongside any new token.
- **Do** keep violet for flags and committee matters, red for over budget and failed, green for held.
- **Do** separate surfaces with the 1px sage rule on a noting-sheet fill, and use the 4px spacing scale.
- **Do** set ids and file numbers in Courier Prime and everything else in Archivo with tabular numerals.
- **Do** keep controls as standard web controls with the 2px violet focus-visible outline.
- **Do** word flags as questions for the committee (PRODUCT.md), and keep the stamp as the marker for them.

### Don't:
- **Don't** use a grey KPI-tile dashboard with a blue accent; that is the category default this world refuses.
- **Don't** introduce a fifth register-bar hue or reuse violet, red or green outside their jobs.
- **Don't** add shadows to sheets or cards; hover and selection do not lift.
- **Don't** apply these tokens to the gateway, Citizen or Ward Officer views; they remain on the older teal theme in `src/index.css` (known scope boundary).
- **Don't** hard-code colours or fonts in corporator CSS, or load fonts from outside `public/fonts/`.
