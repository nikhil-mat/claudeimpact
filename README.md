# MonsoonWatch — Civic Infrastructure Intelligence

An independent platform for investigating public infrastructure spending, tracking civic complaints, and supporting evidence-based accountability across Mumbai's 24 administrative wards.

> **⚠️ Demonstration Platform** — Uses synthetic challenge data from Claude Impact Labs. Not affiliated with the Brihanmumbai Municipal Corporation or any government body. All figures are simulated, not verified BMC records.

## Features

### Three Role-Based Portals

**🔵 Citizen Portal**
- Dashboard with ward-level complaint statistics
- Search and filter 6,500+ historical complaints
- Track complaint-to-work-order repair outcomes
- Explore flood hotspots, hospitals, schools, and road infrastructure

**🟢 Ward Office Portal**
- Complaint queue with ward/status/category filters
- Work order explorer with SLA and completion tracking
- Repair audit engine with 5 deterministic rule-based checks
- Summary reports with budget, complaint, and audit statistics

**🔴 Corporator Portal**
- Ward Money Trail: budget vs spending across all 24 wards
- Spending Explorer: work order cost analysis with rate card deviation
- Contractor Scorecards: performance metrics for all 8 empanelled contractors
- Infrastructure Risk: flood hotspots, congestion, accidents, facilities
- Methodology: transparent explanation of all calculations and audit rules

### Audit Engine (Deterministic, Rule-Based)

| Rule | Description | Threshold |
|------|-------------|-----------|
| `COST_DEVIATION` | Billed amount vs rate card expected cost | >40% above standard |
| `DLP_REPAIR` | Repair billed on road under Defect Liability Period | Any DLP road |
| `SLA_MISSED` | Work order not completed within SLA hours | sla_met = N |
| `REOPENED` | Repair reopened within 30 days | reopened_within_30d = Y |
| `DUPLICATE_BILLING` | Same road + work type within 7 days | ≤7 days apart |

All audit flags include work order ID, supporting values, and the specific rule triggered. Language uses "Requires Review" and "Potential Cost Deviation" — never definitive accusations.

## Dataset

All data comes from the [Claude Impact Labs Data 2](https://github.com/SumeetGDoshi/Claude-Impact-Labs-data-2) synthetic challenge dataset, licensed CC BY 4.0.

| Dataset | Records | Purpose |
|---------|---------|---------|
| complaints.csv | 6,501 | Citizen complaints across all channels |
| work_orders.csv | 2,499 | Repair work orders linked to complaints |
| contractors.csv | 8 | Empanelled contractor details |
| rate_card.csv | 10 | Standard repair rates per method |
| roads.csv | 291 | Road segments with DLP info |
| wards.csv | 24 | Ward boundaries and budgets |
| flood_hotspots.csv | 28 | Known flood-prone locations |
| rainfall_daily.csv | 244 | Daily rainfall with IMD categories |
| tides.csv | 244 | High tide data |
| traffic.csv | 291 | Road-level congestion metrics |
| accidents.csv | 420 | Road accidents with severity |
| facilities.csv | 160 | Hospitals, schools, critical facilities |

## Tech Stack

- **Framework:** Next.js 14 (App Router, Server Components)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 3.4
- **Data parsing:** PapaParse
- **Icons:** Lucide React
- **No external database** — all CSV data loaded server-side with module-level caching

## Getting Started

```bash
npm install
npm run dev    # Development server at localhost:3000
npm run build  # Production build
```

## Architecture

```
src/
├── app/                    # Next.js App Router pages
│   ├── citizen/            # Citizen portal (dashboard, complaints, infrastructure)
│   ├── corporator/         # Corporator portal (overview, spending, contractors, risk, methodology)
│   ├── ward-office/        # Ward Office portal (queue, work orders, audit, reports)
│   └── page.tsx            # Landing page with role selection
├── components/
│   ├── data-display/       # DataTable (sortable, paginated)
│   ├── filters/            # WardFilter, StatusFilter, SearchFilter
│   ├── landing/            # RoleCard
│   ├── layout/             # Navbar, Footer, PageHeader
│   └── ui/                 # Button, MetricCard, StatusBadge, SeverityBadge, DisclaimerBanner, Skeleton
├── config/
│   └── roles.ts            # Role definitions with nav items and accents
├── data/
│   └── dataset/            # Claude Impact Labs CSV + GeoJSON files
└── lib/
    ├── data/
    │   ├── types.ts        # All entity + computed types
    │   ├── loader.ts       # CSV loading with caching
    │   ├── queries.ts      # Budget, spending, scorecard calculations
    │   ├── audit.ts        # 5-rule audit engine
    │   └── index.ts        # Re-exports
    ├── constants.ts        # Ward codes, complaint types, enums
    └── types.ts            # Original Phase 1 types
```

## License

Dataset: CC BY 4.0 (Claude Impact Labs)
