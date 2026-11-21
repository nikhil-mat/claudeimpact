// Research basis shown in the "Why this" tab. Collected 21 Nov 2026 from 4 independent lenses
// (official, officer, critic, tools), then checked for one-sidedness by a separate reviewer.
// Facts read from search results; items marked "unverified" should not be quoted as fact.

export type Side = 'Officer' | 'Citizen' | 'Official' | 'Research'

export const day = [
  { when: 'Morning', what: 'WhatsApp groups and messages about local problems.' },
  { when: 'Late morning', what: 'Site inspections. The Commissioner asks for morning and evening rounds.' },
  { when: 'Midday', what: 'Office. Walk-in citizens. Complaints from 1916, MyBMC app, web and social media arrive via MARG and SAP.' },
  { when: 'Afternoon', what: 'Meetings with corporators, MLAs and ward department heads.' },
  { when: 'Evening', what: 'Second inspection round, paperwork, follow-ups.' },
  { when: 'Monsoon', what: 'Leave cancelled until pre-monsoon work is done. Stay in office in heavy rain. Ward control room runs. Pothole fix target: 24 hours.' },
]

export const pains: { pain: string; side: Side[]; source: string }[] = [
  { pain: '"Closed" is not "fixed". Complaints are closed on paper while the problem stays.', side: ['Citizen', 'Research'], source: 'https://praja.org/media-room/4277' },
  { pain: 'Slow fixes: 41 days on average in 2024 against a 6-day norm.', side: ['Research'], source: 'https://www.praja.org/praja_docs/praja_downloads/Key%20Highlights%20of%20Report%20on%20Civic%20Issues%20in%20Mumbai%202024.pdf' },
  { pain: 'Too few people: about 41% of sanctioned BMC posts vacant (2024); hundreds of engineer posts empty.', side: ['Research', 'Officer'], source: 'https://www.freepressjournal.in/mumbai/mumbai-around-380-posts-of-sub-engineers-and-junior-engineers-in-bmc-lie-vacant' },
  { pain: '"Not our road": complaints bounce between wards, the roads department, MMRDA and PWD.', side: ['Citizen', 'Official'], source: 'https://www.dnaindia.com/mumbai/report-whose-road-is-it-anyway-mumbai-needs-unified-planning-body-2634075/amp' },
  { pain: 'Patch repairs don\'t last; potholes come back after the next heavy rain.', side: ['Citizen'], source: 'https://www.freepressjournal.in/mumbai/mumbai-citizens-complain-against-bmc-for-its-shoddy-work-on-potholes' },
  { pain: 'Officers transferred soon after enforcing rules; orders reversed within weeks.', side: ['Officer', 'Citizen'], source: 'https://www.freepressjournal.in/amp/mumbai/mumbai-dozens-of-bmc-officials-shunted-back-and-forth-as-the-orders-reversed-within-one-month' },
  { pain: 'Staff pulled onto voter-list (SIR) duty during the monsoon.', side: ['Official'], source: 'https://www.freepressjournal.in/mumbai/mumbai-bjp-corporator-makarand-narwekar-urges-bmc-to-exempt-civic-staff-from-sir-duty-amid-monsoon' },
  { pain: 'Wards get a shrinking share of a growing budget and little power to act.', side: ['Research', 'Citizen'], source: 'https://praja.org/praja_docs/praja_downloads/Report%20on%20Wardwise%20Budget%20in%20Mumbai%202025.pdf' },
]

export const disagreements = [
  { topic: 'Closure numbers', a: 'BMC reports high closure rates.', b: 'Citizens and Praja say many are closed only on paper.' },
  { topic: 'Potholes', a: 'BMC says concrete roads cut complaints.', b: 'Residents say patches fail; an RTI activist disputes "52,000 filled".' },
  { topic: 'Flooding blame', a: 'Citizens blame BMC.', b: 'Bombay High Court (2026): citizens are "equally responsible".' },
  { topic: 'Officers', a: 'Activists point to engineer-contractor links (allegations, not about ward officers as a group).', b: 'Others show officers boxed in: vacancies, transfers, shrinking ward budgets.' },
]

export const toolLessons = [
  'Closing a ticket is easier than fixing the road, and nobody checks. (Bengaluru Sahaaya, Pune PMC Care)',
  'Tools that add data entry for stretched staff get abandoned.',
  'Vendor-run stand-alone apps die; more than a dozen BBMP portals are dead.',
  'Adoption depends on daily routine and leadership, not software.',
]

// From a teardown of 18 complaint portals (MARG, QuickFix, Sahaaya, PMC Care, My GHMC, NYC 311, FixMyStreet, Singapore OneService...).
export const portalGaps = [
  'No portal links a complaint to the money spent on that road, the contractor, or the road\'s warranty.',
  'Every portal stops false closures with a rule ("citizen must confirm"). Hyderabad shows the rule gets faked. Nobody checks the data itself.',
  'Only Singapore answers "who owns this road?" automatically. No Indian portal does.',
  'All are built for citizens or headline numbers. None gives the ward officer a "do these 5 things today" list.',
  'Queues follow who complains most, which favours louder, richer areas (NYC). Few rank by need.',
]

export const devilsAdvocate = [
  { attack: 'Officers won\'t open another dashboard.', answer: 'Home is 5 actions with a WhatsApp-ready copy. Charts come second.' },
  { attack: '"Who should have paid" reads like an audit of the officer\'s own team.', answer: 'Framed as money to recover for the ward. Every flag says verify first. Nothing is sent without the officer.' },
  { attack: 'AI checking AI proves nothing.', answer: 'QC1 is plain code: a line citing an ID or ₹ figure not in the data is held back. Fairness is also computed in code (heavy-rain share, flood index); Opus is the second opinion.' },
  { attack: 'Fast fixes and lasting fixes pull against each other.', answer: 'The next-rupee list picks the lasting method where cheap patches already failed.' },
  { attack: 'It is synthetic data.', answer: 'Yes, and it says so on every screen. Each field maps to a real source: MARG export, BMC rate card, tender warranty clause.' },
]

export const designRules = [
  'Adds no data entry: reads what already exists.',
  'Answers in one screen, phone first.',
  'Every number shows where it came from; AI text is a draft the officer approves.',
  'Shows constraints (crews, flood risk, road owner) next to results, so slow does not read as lazy.',
  'No public ranking of officers.',
]
