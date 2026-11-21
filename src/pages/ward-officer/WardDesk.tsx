import { useEffect, useState } from 'react'
import type { AgentBlock, Agents, Facts, Flag, Lang, Line, Ward } from './types'
import { day, designRules, devilsAdvocate, disagreements, pains, portalGaps, toolLessons } from './research'
import './ward-officer.css'

const T = {
  en: {
    pick: 'Your ward', budget: 'Budget', spent: 'Spent', shp: 'Payments to check', reworded: 'Reworded for fairness', outOf: 'out of 1', badgeNote: 'Every AI line passed the evidence check (lines that failed are hidden). Tags appear only when the fairness check reworded a line or added a caveat; hover to see why.', kinds: { road: 'pothole / road', water: 'waterlogging', manhole: 'manhole', other: 'other' }, crews: 'Crews / day', flood: 'Flood risk',
    tabs: ['Today', 'Citizens', 'Who should have paid', 'Fixed or just closed?', 'Lost complaints', 'Next rupee', 'Contractors', 'Why this'],
    today: "Today's 5 actions", asOf: 'Data as of 10 Oct 2025 (event dataset)', verify: 'Verify first', copyAll: 'Copy for WhatsApp',
    repeatsH: 'Marked resolved, then a new complaint at the same spot (within 50 m, 1 to 30 days later)',
    morning: 'Morning brief', corp: 'Reply to corporator', copy: 'Copy', copied: 'Copied',
    qc1: 'Evidence checked', qc2: 'Fairness checked', ctx: 'Needs context', held: 'lines held back: they cited an ID or ₹ figure that is not in the data',
    synthetic: 'Sample data from the Claude Impact Lab event. Not real BMC data. AI text is a draft: check before you send.',
    worth: 'Worth checking (not in total)', types: { warranty: 'Road under warranty', overbill: 'Over the rate card', double: 'Billed twice', utility: 'Utility trench' },
    loading: 'Loading…', noAgent: 'Agent notes not generated yet. Numbers below come straight from the data.',
    misfiled: 'Photo shows a pothole, filed as something else', bounced: 'Pothole complaints bounced or closed', open: 'Oldest still open',
    placed: (n: number, g: number) => `${n} complaints had no ward. Placed here from the typed locality (incl. Marathi spellings)${g ? `, ${g} more from GPS` : ''}.`,
    placedH: 'Had no ward in the system, placed here (open ones listed)', tide: 'big tides block drains here', tideReopen: (n: number) => `${n} patch failed after a big-tide day`,
    contractorNote: 'Read with context: heavy-rain share and flood risk change what a fair reopen rate looks like.',
    cols: ['Contractor', 'Jobs', 'Failed in 30 days', 'Missed deadline', 'Cost vs rate', 'Heavy-rain jobs'],
  },
  mr: {
    pick: 'तुमचा वॉर्ड', budget: 'बजेट', spent: 'खर्च', shp: 'तपासायची देयके', reworded: 'न्याय्यतेसाठी पुन्हा लिहिले', outOf: '1 पैकी', badgeNote: 'प्रत्येक AI ओळ पुरावा तपासणीत पास झाली (अपयशी ओळी लपवल्या). न्याय्यता तपासणीने ओळ बदलली किंवा इशारा जोडला तरच टॅग दिसतो.', kinds: { road: 'खड्डा / रस्ता', water: 'पाणी साचणे', manhole: 'मॅनहोल', other: 'इतर' }, crews: 'रोजची पथके', flood: 'पूर धोका',
    tabs: ['आज', 'नागरिक', 'कोणी भरायला हवे होते', 'खरंच दुरुस्त?', 'हरवलेल्या तक्रारी', 'पुढचा रुपया', 'कंत्राटदार', 'का?'],
    today: 'आजची 5 कामे', asOf: 'डेटा 10 ऑक्टो 2025 पर्यंतचा (इव्हेंट डेटासेट)', verify: 'आधी तपासा', copyAll: 'WhatsApp साठी कॉपी',
    repeatsH: 'सोडवली म्हणून बंद, नंतर त्याच जागी नवी तक्रार (50 मी. आत, 1 ते 30 दिवसांत)',
    morning: 'सकाळचा आढावा', corp: 'नगरसेवकांना उत्तर', copy: 'कॉपी', copied: 'कॉपी झाले',
    qc1: 'पुरावा तपासला', qc2: 'न्याय्यता तपासली', ctx: 'संदर्भ हवा', held: 'ओळी रोखल्या: त्यात डेटामध्ये नसलेला ID किंवा ₹ आकडा होता',
    synthetic: 'Claude Impact Lab मधील नमुना डेटा. खरा BMC डेटा नाही. AI मजकूर हा मसुदा आहे: पाठवण्यापूर्वी तपासा.',
    worth: 'तपासण्यासारखे (एकूणात नाही)', types: { warranty: 'हमी कालावधीतील रस्ता', overbill: 'दरपत्रकापेक्षा जास्त', double: 'दोनदा बिल', utility: 'युटिलिटी खोदकाम' },
    loading: 'लोड होत आहे…', noAgent: 'एजंटच्या नोंदी अजून तयार नाहीत. खालील आकडे थेट डेटामधून आहेत.',
    misfiled: 'फोटोत खड्डा, पण दुसऱ्या प्रकारात नोंद', bounced: 'परत पाठवलेल्या / बंद केलेल्या खड्डा तक्रारी', open: 'सर्वात जुन्या उघड्या तक्रारी',
    placed: (n: number, g: number) => `${n} तक्रारींना वॉर्ड नव्हता. लिहिलेल्या ठिकाणावरून (मराठी नावांसह) इथे जोडल्या${g ? `, आणखी ${g} GPS वरून` : ''}.`,
    placedH: 'प्रणालीत वॉर्ड नव्हता, इथे जोडल्या (उघड्या खाली)', tide: 'मोठ्या भरतीत इथले नाले तुंबतात', tideReopen: (n: number) => `${n} दुरुस्ती मोठ्या भरतीनंतर उखडली`,
    contractorNote: 'संदर्भासह वाचा: मुसळधार पावसातील कामे आणि पूर धोका यामुळे योग्य अपयश दर बदलतो.',
    cols: ['कंत्राटदार', 'कामे', '30 दिवसांत अपयशी', 'मुदत चुकली', 'दराच्या तुलनेत खर्च', 'मुसळधार पावसातील कामे'],
  },
}

// Indian money format: ₹4.2 L, ₹1.3 Cr.
const inr = (lang: Lang, n: number) =>
  Math.abs(n) >= 1e7 ? `₹${(n / 1e7).toFixed(2)} ${lang === "mr" ? "कोटी" : "Cr"}` : Math.abs(n) >= 1e5 ? `₹${(n / 1e5).toFixed(1)} ${lang === "mr" ? "लाख" : "L"}` : `₹${Math.round(n).toLocaleString('en-IN')}`
// Today's 5 actions: built in code from the facts, so every ID and ₹ figure is real.
function todayActions(w: Ward, lang: Lang): string[] {
  const mr = lang === 'mr'
  const out: string[] = []
  const war = w.flags.find((f) => f.type === 'warranty')
  if (war) out.push(mr
    ? `${war.roadName} (${war.road}) हमी कालावधीत आहे: मूळ रस्ता कंत्राटदाराने मोफत दुरुस्ती करायला हवी. ${war.wo} वर ${war.contractor} ला ${inr(lang, war.amount)} दिले: हमी अटी तपासा व मूळ कंत्राटदाराकडून वसूल करा.`
    : `${war.roadName} (${war.road}) is under warranty: the original road contractor should repair it free, yet ${war.wo} paid ${war.contractor} ${inr(lang, war.amount)}. Check the warranty terms and claim from the original contractor.`)
  const bill = w.flags.find((f) => f.type === 'overbill' || f.type === 'double')
  if (bill) out.push(mr
    ? `${bill.wo} चे पेमेंट तपासा: ${bill.type === 'double' ? `${bill.twin} सारखेच काम 7 दिवसांत पुन्हा` : `दरपत्रकाच्या ${bill.ratio}x`}. ${inr(lang, bill.amount)} वसूल करता येतील.`
    : `Check payment on ${bill.wo}: ${bill.type === 'double' ? `same job as ${bill.twin} within 7 days` : `billed ${bill.ratio}x the rate card`}. ${inr(lang, bill.amount)} to recover.`)
  const rep = w.repeats.examples[0]
  if (rep) out.push(mr
    ? `${rep.locality} येथे पुन्हा पाहणी करा: ${rep.closed} बंद झाल्यावर ${rep.days} दिवसांत त्याच जागी ${rep.again} आली.`
    : `Re-inspect ${rep.locality}: ${rep.again} came in ${rep.days} days after ${rep.closed} was closed, at the same spot.`)
  const lost = w.complaints.misfiledExamples[0]
  if (lost) out.push(mr
    ? `${lost.id} खड्डा म्हणून पुन्हा नोंदवा (फोटोत खड्डा, नोंद "${lost.category}").`
    : `Refile ${lost.id} as a pothole (photo shows one, filed as "${lost.category}").`)
  const road = w.nextRupee[0]
  if (road) out.push(mr
    ? `पथक ${road.name} (${road.road}) वर पाठवा: ${method(lang, road.method)}, अंदाजे ${road.underWarranty ? '₹0' : inr(lang, road.estCost)}.`
    : `Send a crew to ${road.name} (${road.road}): ${road.method}, about ${road.underWarranty ? '₹0' : inr(lang, road.estCost)}.`)
  return out.slice(0, 5)
}

const METHOD_MR: Record<string, string> = {
  'Cold mix patch': 'कोल्ड मिक्स पॅच', 'Hot mix patch': 'हॉट मिक्स पॅच', 'Mastic asphalt': 'मॅस्टिक अस्फाल्ट',
  'Paver blocks relaid': 'पेव्हर ब्लॉक पुन्हा बसवले', 'Dewatering pump deployed': 'पाणी उपसा पंप', 'Drain desilting': 'नाले गाळ काढणे',
  'Pump + debris removal': 'पंप + कचरा काढणे', 'Manhole cover replaced + grating': 'मॅनहोल झाकण + जाळी बदलली',
  'Excavation, pipeline repair, PQC patch': 'खोदकाम, पाइपलाइन दुरुस्ती, PQC पॅच', 'Desilting and garbage removal': 'गाळ व कचरा काढणे',
  'Call original contractor (under warranty)': 'मूळ कंत्राटदाराला बोलवा (हमी कालावधी)',
}
const method = (lang: Lang, m: string) => (lang === 'mr' ? METHOD_MR[m] ?? m : m)

// What each of today's actions lets the officer do. Same order and conditions as todayActions().
type ActKind = 'warranty' | 'bill' | 'repeat' | 'refile' | 'crew'
type Act = { key: string; kind: ActKind; amount: number; citizen?: string; since?: string }
function actionMeta(w: Ward): Act[] {
  const out: Act[] = []
  const war = w.flags.find((f) => f.type === 'warranty')
  if (war) out.push({ key: 'warranty:' + war.wo, kind: 'warranty', amount: war.amount })
  const bill = w.flags.find((f) => f.type === 'overbill' || f.type === 'double')
  if (bill) out.push({ key: 'bill:' + bill.wo, kind: 'bill', amount: bill.amount })
  const rep = w.repeats.examples[0]
  if (rep) out.push({ key: 'repeat:' + rep.again, kind: 'repeat', amount: 0, citizen: rep.again, since: rep.againAt })
  const lost = w.complaints.misfiledExamples[0]
  if (lost) out.push({ key: 'refile:' + lost.id, kind: 'refile', amount: 0, citizen: lost.id, since: lost.at })
  const road = w.nextRupee[0]
  if (road) out.push({ key: 'crew:' + road.road, kind: 'crew', amount: 0 })
  return out.slice(0, 5)
}
const ACT = {
  en: {
    warranty: ['Send notice to original contractor', 'Notice sent: claim raised'],
    bill: ['Hold payment, ask engineer why', 'Payment on hold'],
    repeat: ['Schedule re-inspection', 'Re-inspection scheduled'],
    refile: ['Refile as pothole', 'Refiled as pothole'],
    crew: ['Assign crew', 'Crew assigned'],
    ok: 'Checked: no issue', undo: 'Undo', citizen: 'Citizen sees on their complaint',
    login: 'Sign in to Ward Desk', name: 'Your name', ward: 'Your ward', go: 'Sign in', demoNote: 'Demo sign-in: no password, nothing leaves this browser.',
    approve: 'Approve & send', dismiss: 'No issue', steps: ['Review', 'Decide', 'Sent automatically'], outbox: 'Outbox', pending: 'to decide', sentTo: 'Sent to', corpTo: 'Corporator(s), ward', corpSubj: 'Daily ward update', corpWait: 'Corporator update sends itself when all actions are decided', simNote: 'Demo: messages are simulated. In use they would go through the BMC email/SMS gateway.', empty: 'Nothing sent yet. Approve an action above.', summary: 'This morning',
    cz: { notFixedH: 'Citizens say "not fixed"', notFixedSub: 'After each repair the citizen gets an SMS: Fixed? Yes / No. These said No (repair reopened within 30 days).', reopen: 'Reopen job + flag contractor', reopened: 'Job reopened, contractor flagged', inboxH: 'Smart inbox: complaints grouped into issues', inboxSub: 'Claude groups complaints about the same problem at the same place, across app, helpline, web and languages.', complaints: 'complaints', merge: 'Merge into 1 issue + 1 work order', merged: 'Merged: 1 work order, all complainants told', journeyH: 'Complaint journey and deadline', journeySub: 'Every complaint shows where it is stuck. Overdue ones can be escalated.', received: 'Received', assigned: 'Assigned', due: 'Due', overdue: 'days overdue', escalate: 'Escalate to Deputy Commissioner', escalated: 'Escalated, citizen told the new date', handoffH: 'Not our road: hand off, don\'t reject', handoffSub: 'Instead of a silent rejection, the complaint is forwarded with a letter and the citizen is told who owns the road.', forward: 'Forward with letter + tell citizen', forwarded: 'Forwarded, citizen told who owns it', ofTotal: 'of', upv: 'upvotes', sms: 'SMS to citizen' },
    signout: 'Sign out', reset: 'Reset demo', hello: 'Signed in as', progress: 'done today', held: 'claimed or on hold', citizens: 'citizens updated',
    as: 'Sign in as', roles: { officer: 'Ward Officer (AMC)', engineer: 'Sub-engineer', commissioner: 'Commissioner (city)' },
    roleNote: { officer: 'Decides, holds payments, recovers money, assigns field work.', engineer: 'Inspects and fixes what the ward officer assigns, reports back.', commissioner: 'Sees every ward at a glance.' },
    assign: 'Assign to sub-engineer', assigned: 'With sub-engineer', reported: 'Sub-engineer reported', fixed: 'fixed', notFixed: 'not fixed, needs a bigger repair',
    myJobs: 'My jobs from the ward officer', noJobs: 'Nothing assigned yet. The ward officer assigns field work from the Today page.',
    repFixed: 'Inspected: fixed', repNot: 'Inspected: not fixed', citySms: 'Your complaint was inspected and fixed',
    due24: '24 h monsoon rule (High Court: 48 h)', waiting: (d: number) => `complaint waiting ${d} days`, why: 'Why? (saved in the log)',
    logH: 'Decision log', logEmpty: 'No decisions yet.', logV: { eod: 'sent day report', approved: 'approved', ok: 'no issue', asg: 'assigned to sub-engineer', fixed: 'reported fixed', notfixed: 'reported not fixed', undo: 'undid' } as Record<string, string>,
    cityH: 'All wards', cityCols: ['Ward', 'Payments to check', 'Open complaints', 'Missed deadline', 'Failed in 30 days', 'Today decided', 'Day closed'],
    eodH: 'Close the day', eodDone: 'decided', eodCarry: 'carried to tomorrow', eodSend: 'Send day report to Deputy Commissioner', eodSent: 'Day report sent', eodTo: 'Deputy Municipal Commissioner (zone)',
    eodSubj: (d: number, n: number, c: number, h: string) => `Ward day report: ${d}/${n} decided, ${c} carried over, ${h} held or claimed`, carried: 'carried',
  },
  mr: {
    warranty: ['मूळ कंत्राटदाराला नोटीस पाठवा', 'नोटीस पाठवली: दावा केला'],
    bill: ['पेमेंट थांबवा, अभियंत्याला कारण विचारा', 'पेमेंट थांबवले'],
    repeat: ['पुन्हा पाहणी ठरवा', 'पुन्हा पाहणी ठरली'],
    refile: ['खड्डा म्हणून पुन्हा नोंदवा', 'खड्डा म्हणून नोंदवले'],
    crew: ['पथक नेमा', 'पथक नेमले'],
    ok: 'तपासले: अडचण नाही', undo: 'रद्द करा', citizen: 'नागरिकाला त्यांच्या तक्रारीवर दिसते',
    login: 'Ward Desk मध्ये साइन इन करा', name: 'तुमचे नाव', ward: 'तुमचा वॉर्ड', go: 'साइन इन', demoNote: 'डेमो साइन-इन: पासवर्ड नाही, काहीही या ब्राउझरबाहेर जात नाही.',
    approve: 'मंजूर करा व पाठवा', dismiss: 'अडचण नाही', steps: ['पाहा', 'निर्णय', 'आपोआप पाठवले'], outbox: 'पाठवलेले', pending: 'निर्णय बाकी', sentTo: 'पाठवले:', corpTo: 'नगरसेवक, वॉर्ड', corpSubj: 'दैनिक वॉर्ड अहवाल', corpWait: 'सर्व कामांवर निर्णय झाल्यावर नगरसेवकांना अहवाल आपोआप जाईल', simNote: 'डेमो: संदेश प्रत्यक्ष पाठवले जात नाहीत. वापरात ते BMC ईमेल/SMS प्रणालीतून जातील.', empty: 'अजून काही पाठवले नाही. वरील काम मंजूर करा.', summary: 'आज सकाळी',
    cz: { notFixedH: 'नागरिक म्हणतात "दुरुस्त झाले नाही"', notFixedSub: 'प्रत्येक दुरुस्तीनंतर नागरिकाला SMS: दुरुस्त झाले? हो / नाही. यांनी नाही म्हटले (30 दिवसांत पुन्हा उघडले).', reopen: 'काम पुन्हा उघडा + कंत्राटदार नोंद', reopened: 'काम पुन्हा उघडले, कंत्राटदाराची नोंद', inboxH: 'स्मार्ट इनबॉक्स: तक्रारी एका मुद्द्यात', inboxSub: 'एकाच जागी एकाच अडचणीच्या तक्रारी (ॲप, हेल्पलाइन, वेब, सर्व भाषा) Claude एकत्र करते.', complaints: 'तक्रारी', merge: '1 मुद्दा + 1 काम आदेश करा', merged: 'एकत्र केले: 1 काम आदेश, सर्व तक्रारदारांना कळवले', journeyH: 'तक्रारीचा प्रवास व मुदत', journeySub: 'प्रत्येक तक्रार कुठे अडली ते दिसते. मुदत संपलेल्या वर नेता येतात.', received: 'मिळाली', assigned: 'नेमली', due: 'मुदत', overdue: 'दिवस उशीर', escalate: 'उपायुक्तांकडे पाठवा', escalated: 'वर पाठवले, नागरिकाला नवी तारीख कळवली', handoffH: 'आमचा रस्ता नाही: नाकारू नका, सुपूर्द करा', handoffSub: 'शांतपणे नाकारण्याऐवजी पत्रासह पुढे पाठवा आणि रस्ता कोणाचा ते नागरिकाला सांगा.', forward: 'पत्रासह पाठवा + नागरिकाला कळवा', forwarded: 'पाठवले, नागरिकाला मालक कळवला', ofTotal: 'पैकी', upv: 'अपवोट', sms: 'नागरिकाला SMS' },
    signout: 'साइन आउट', reset: 'डेमो रीसेट', hello: 'साइन इन:', progress: 'आज पूर्ण', held: 'दावा केले / थांबवले', citizens: 'नागरिकांना कळवले',
    as: 'यांच्या रूपात साइन इन', roles: { officer: 'वॉर्ड अधिकारी (सहाय्यक आयुक्त)', engineer: 'उप-अभियंता', commissioner: 'आयुक्त (शहर)' },
    roleNote: { officer: 'निर्णय घेतात, पेमेंट थांबवतात, पैसे वसूल करतात, फील्ड काम नेमतात.', engineer: 'वॉर्ड अधिकाऱ्यांनी नेमलेली पाहणी व दुरुस्ती करतात, अहवाल देतात.', commissioner: 'सर्व वॉर्ड एका नजरेत.' },
    assign: 'उप-अभियंत्याला नेमा', assigned: 'उप-अभियंत्याकडे', reported: 'उप-अभियंत्याचा अहवाल', fixed: 'दुरुस्त', notFixed: 'दुरुस्त नाही, मोठी दुरुस्ती हवी',
    myJobs: 'वॉर्ड अधिकाऱ्यांनी नेमलेली माझी कामे', noJobs: 'अजून काही नेमले नाही. वॉर्ड अधिकारी "आज" पानावरून फील्ड काम नेमतात.',
    repFixed: 'पाहणी: दुरुस्त', repNot: 'पाहणी: दुरुस्त नाही', citySms: 'तुमच्या तक्रारीची पाहणी झाली, दुरुस्त झाले',
    due24: 'पावसाळी नियम 24 तास (उच्च न्यायालय: 48 तास)', waiting: (d: number) => `तक्रार ${d} दिवस प्रलंबित`, why: 'का? (नोंदीत जतन)',
    logH: 'निर्णय नोंद', logEmpty: 'अजून निर्णय नाही.', logV: { eod: 'दैनिक अहवाल पाठवला', approved: 'मंजूर', ok: 'अडचण नाही', asg: 'उप-अभियंत्याला नेमले', fixed: 'दुरुस्त कळवले', notfixed: 'दुरुस्त नाही कळवले', undo: 'रद्द केले' } as Record<string, string>,
    cityH: 'सर्व वॉर्ड', cityCols: ['वॉर्ड', 'तपासायची देयके', 'उघड्या तक्रारी', 'मुदत चुकली', '30 दिवसांत अपयशी', 'आज निर्णय', 'दिवस बंद'],
    eodH: 'दिवस बंद करा', eodDone: 'निर्णय झाले', eodCarry: 'उद्यावर', eodSend: 'उपायुक्तांना दैनिक अहवाल पाठवा', eodSent: 'दैनिक अहवाल पाठवला', eodTo: 'उप महापालिका आयुक्त (परिमंडळ)',
    eodSubj: (d: number, n: number, c: number, h: string) => `वॉर्ड दैनिक अहवाल: ${d}/${n} निर्णय, ${c} उद्यावर, ${h} थांबवले/दावा`, carried: 'उद्यावर',
  },
}

// Messages an approval sends automatically. Demo: simulated, nothing leaves the browser.
type Msg = { ch: 'email' | 'sms'; to: string; subject: string }
function messagesFor(a: Act, text: string, lang: Lang): Msg[] {
  const mr = lang === 'mr'
  const ref = a.key.split(':')[1]
  const M: Record<ActKind, Msg[]> = {
    warranty: [{ ch: 'email', to: mr ? 'मूळ रस्ता कंत्राटदार (रस्ते विभागामार्फत)' : 'Original road contractor (via Roads Dept)', subject: (mr ? 'दोष दायित्व नोटीस: ' : 'Defect-liability notice: ') + ref }],
    bill: [{ ch: 'email', to: mr ? 'उप-अभियंता + लेखा विभाग' : 'Sub-engineer + Accounts', subject: (mr ? 'पेमेंट रोखले, कारण कळवा: ' : 'Payment on hold, explain rate: ') + ref }],
    repeat: [
      { ch: 'email', to: mr ? 'उप-अभियंता' : 'Sub-engineer', subject: (mr ? 'पुन्हा पाहणी आदेश: ' : 'Re-inspection order: ') + ref },
      { ch: 'sms', to: (mr ? 'नागरिक, तक्रार ' : 'Citizen, complaint ') + ref, subject: mr ? 'तुमच्या तक्रारीची पुन्हा पाहणी ठरली आहे' : 'Your complaint is scheduled for re-inspection' },
    ],
    refile: [
      { ch: 'email', to: mr ? 'तक्रार कक्ष (MARG)' : 'Complaint desk (MARG)', subject: (mr ? 'खड्डा म्हणून पुन्हा वर्गीकरण: ' : 'Recategorise as pothole: ') + ref },
      { ch: 'sms', to: (mr ? 'नागरिक, तक्रार ' : 'Citizen, complaint ') + ref, subject: mr ? 'तुमची तक्रार खड्डा म्हणून नोंदवली, पथक नेमले जाईल' : 'Your complaint is now logged as a pothole' },
    ],
    crew: [{ ch: 'email', to: mr ? 'देखभाल पथक प्रमुख' : 'Maintenance crew lead', subject: (mr ? 'काम आदेश: ' : 'Work order: ') + text.split(':')[0].replace(/^Send a crew to |^पथक /, '') }],
  }
  return M[a.kind]
}

type Role = 'officer' | 'engineer' | 'commissioner'
const ROLES: Role[] = ['officer', 'engineer', 'commissioner']
const FIELD: ActKind[] = ['repeat', 'crew'] // field work a sub-engineer can take
const HAZARD: ActKind[] = ['repeat', 'refile', 'crew'] // a road hazard, so the 24 h / 48 h repair rules apply
const AS_OF = Date.parse('2025-10-10T23:59') // dataset "today"
type LogE = { at: string; who: string; role: Role; ward: string; key: string; v: string; reason?: string }
const logVerb = (v: string) => (/^\d\d:\d\d$/.test(v) ? 'approved' : v.startsWith('rep:') ? v.split(':')[1] : v)
const approved = (st?: string) => !!st && /^\d\d:\d\d$/.test(st)
const now = () => new Date().toTimeString().slice(0, 5)
const pct = (x: number) => `${Math.round(x * 100)}%`
const base = import.meta.env.BASE_URL
const confirmReset = () => true // demo: reset without a blocking dialog

function Badges({ l, lang }: { l: Line; lang: Lang }) {
  const t = T[lang]
  return (
    <span className="wd-badges">
      {l.qc2 === 'needs context' && <span className="wd-qc warn" title={l.qc2Reason}>⚠ {t.ctx}</span>}
      {l.qc2 === 'reworded' && <span className="wd-qc ok" title={l.qc2Reason}>✎ {t.reworded}</span>}
    </span>
  )
}

function AgentText({ l, lang }: { l?: Line; lang: Lang }) {
  if (!l || !l.qc1) return null
  return (
    <p className="wd-agent">
      {l[lang]} <Badges l={l} lang={lang} />
    </p>
  )
}

// One card per work order: a job can be flagged several ways (e.g. warranty road and over the rate card).
function byWorkOrder(flags: Flag[]): Flag[][] {
  const m = new Map<string, Flag[]>()
  for (const f of flags) m.set(f.wo, [...(m.get(f.wo) ?? []), f])
  return [...m.values()]
}

const lineFor =(b: AgentBlock | undefined, key: string) => b?.items.find((i) => i.key === key && i.qc1)

export default function WardDesk() {
  const [facts, setFacts] = useState<Facts | null>(null)
  const [agents, setAgents] = useState<Agents | null>(null)
  const [code, setCode] = useState(() => localStorage.getItem('wd-ward') ?? 'F/N')
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('wd-lang') as Lang) ?? 'en')
  const [tab, setTab] = useState(0)
  const [officer, setOfficer] = useState<{ name: string; ward: string; role?: Role } | null>(() => JSON.parse(localStorage.getItem('wd-officer') ?? 'null'))
  const [loginName, setLoginName] = useState('')
  const [done, setDone] = useState<Record<string, string>>(() => JSON.parse(localStorage.getItem('wd-done') ?? '{}'))
  useEffect(() => localStorage.setItem('wd-done', JSON.stringify(done)), [done])
  const [log, setLog] = useState<LogE[]>(() => JSON.parse(localStorage.getItem('wd-log') ?? '[]'))
  useEffect(() => localStorage.setItem('wd-log', JSON.stringify(log)), [log])
  const [why, setWhy] = useState<Record<string, string>>({})
  const [eod, setEod] = useState<Record<string, { at: string; decided: number; of: number; carried: number; held: number; citizens: number }>>(() => JSON.parse(localStorage.getItem('wd-eod') ?? '{}'))
  useEffect(() => localStorage.setItem('wd-eod', JSON.stringify(eod)), [eod])

  useEffect(() => {
    fetch(`${base}ward-officer/facts.json`).then((r) => r.json()).then(setFacts)
    fetch(`${base}ward-officer/agents.json`).then((r) => (r.ok ? r.json() : null)).then(setAgents).catch(() => setAgents(null))
  }, [])
  useEffect(() => localStorage.setItem('wd-ward', code), [code])
  useEffect(() => localStorage.setItem('wd-lang', lang), [lang])

  const t = T[lang]
  if (!facts) return <p className="placeholder">{t.loading}</p>
  const w: Ward = facts.wards.find((x) => x.code === code) ?? facts.wards[0]
  const a = agents?.wards[w.code]
  const held = a ? [a.triage, a.auditor, a.planner].flatMap((b) => (b ? [b.summary, ...b.items] : [])).concat(a.brief ? [a.brief.morning, a.brief.corporator] : []).filter((l) => !l.qc1).length : 0
  const left = w.budget - w.spent

  const L = ACT[lang]
  if (!officer) {
    return (
      <div className="wd wd-login">
        <h2>{L.login}</h2>
        <label>{L.name}<input value={loginName} onChange={(e) => setLoginName(e.target.value)} placeholder="e.g. A. Patil" /></label>
        <label>{L.ward}
          <select value={code} onChange={(e) => setCode(e.target.value)}>
            {facts.wards.map((x) => <option key={x.code} value={x.code}>{x.code}: {x.name}</option>)}
          </select>
        </label>
        <p><b>{L.as}</b></p>
        <ul className="wd-list">
          {ROLES.map((r) => (
            <li key={r}>
              <button className="wd-btn" onClick={() => { const o = { name: loginName.trim(), ward: code, role: r }; setTab(0); localStorage.setItem('wd-officer', JSON.stringify(o)); setOfficer(o) }}>{L.roles[r]}</button>
              <small> {L.roleNote[r]}</small>
            </li>
          ))}
        </ul>
        <p className="wd-note">{L.demoNote}</p>
      </div>
    )
  }
  const acts = actionMeta(w)
  const status = (a: Act) => done[w.code + '|' + a.key]
  const role: Role = officer.role ?? 'officer'
  // Every decision goes through here: it updates the card and appends to the log (undo adds an entry, never erases one).
  const write = (k: string, v?: string, reason?: string) => {
    setDone((d) => { const n = { ...d }; if (v) n[w.code + '|' + k] = v; else delete n[w.code + '|' + k]; return n })
    setLog((l) => [...l, { at: now(), who: officer.name, role, ward: w.code, key: k, v: v ?? 'undo', reason: reason?.trim() || undefined }])
  }
  const setStatus = (a: Act, v?: string) => write(a.key, v, v ? why[w.code + '|' + a.key] : undefined)
  const claimed = acts.filter((a) => approved(status(a))).reduce((s2, a) => s2 + a.amount, 0)
  const informed = acts.filter((a) => a.citizen && (approved(status(a)) || status(a)?.startsWith('rep:fixed'))).length

  const head = (
    <>
      <div className="wd-who">
        <span>{L.hello} <b>{officer.name || L.roles[role]}</b>{officer.name ? ` · ${L.roles[role]}` : ''}{role !== 'commissioner' ? ` · ${w.code}` : ''}</span>
        <button onClick={() => { if (confirmReset()) { setDone({}); setLog([]); setEod({}) } }}>{L.reset}</button>
        <button onClick={() => { localStorage.removeItem('wd-officer'); setOfficer(null); setLoginName('') }}>{L.signout}</button>
      </div>
      <div className="wd-top">
        <b className="wd-wardname">{role === 'commissioner' ? L.cityH : `${w.code}: ${w.name}`}</b>
        <div className="wd-lang" role="group" aria-label="Language">
          <button aria-pressed={lang === 'en'} onClick={() => setLang('en')}>English</button>
          <button aria-pressed={lang === 'mr'} onClick={() => setLang('mr')}>मराठी</button>
        </div>
      </div>
      <p className="wd-note">{t.synthetic} · {t.asOf}</p>
    </>
  )

  if (role === 'engineer') {
    const texts = todayActions(w, lang)
    const mine = acts.map((x, i) => [x, texts[i]] as const).filter(([x]) => status(x) === 'asg' || status(x)?.startsWith('rep:'))
    return (
      <div className="wd" lang={lang === 'mr' ? 'mr' : 'en'}>
        {head}
        <h2>{L.myJobs}</h2>
        {mine.length === 0 ? <p className="wd-note">{L.noJobs}</p> : (
          <ol className="wd-cards">
            {mine.map(([x, text]) => {
              const st = status(x)!
              return (
                <li key={x.key} className={st === 'asg' ? '' : 'done'}>
                  <p>{text}</p>
                  {st === 'asg' ? (
                    <div className="wd-act">
                      <button className="wd-btn" onClick={() => setStatus(x, 'rep:fixed:' + now())}>{L.repFixed}</button>
                      <button className="wd-btn ghost" onClick={() => setStatus(x, 'rep:notfixed:' + now())}>{L.repNot}</button>
                    </div>
                  ) : (
                    <div className="wd-act">
                      <span className="wd-qc ok">✓ {st.startsWith('rep:fixed') ? L.repFixed : L.repNot} · {st.slice(-5)}</span>
                      <button className="wd-link" onClick={() => setStatus(x, 'asg')}>{L.undo}</button>
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </div>
    )
  }

  if (role === 'commissioner') {
    return (
      <div className="wd" lang={lang === 'mr' ? 'mr' : 'en'}>
        {head}
        <div className="wd-table-wrap">
          <table className="wd-table">
            <thead><tr>{L.cityCols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
            <tbody>
              {[...facts.wards].sort((x, y) => y.shouldHavePaid.total - x.shouldHavePaid.total).map((x) => {
                const xa = actionMeta(x)
                return (
                  <tr key={x.code}>
                    <td><b>{x.code}</b> {x.name}</td>
                    <td>{inr(lang, x.shouldHavePaid.total)}</td>
                    <td>{x.complaints.open}</td>
                    <td>{pct(x.slaMissRate)}</td>
                    <td>{pct(x.reopenRate)}</td>
                    <td>{xa.filter((y) => done[x.code + '|' + y.key]).length}/{xa.length}</td>
                    <td>{eod[x.code] ? `✓ ${eod[x.code].at} · ${eod[x.code].carried} ${L.carried}` : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="wd" lang={lang === 'mr' ? 'mr' : 'en'}>
      {head}

      <div className="wd-stats">
        <div><span>{t.budget}</span><b>{inr(lang, w.budget)}</b></div>
        <div className={left < 0 ? 'bad' : ''}><span>{t.spent}</span><b>{inr(lang, w.spent)}</b><small>{pct(w.spent / w.budget)}</small></div>
        <div className="hl"><span>{t.shp}</span><b>{inr(lang, w.shouldHavePaid.total)}</b><small>{w.shouldHavePaid.workOrders} WO</small></div>
        <div><span>{t.crews}</span><b>{w.crews}</b></div>
        <div className={w.lowLying >= 0.75 ? 'bad' : ''}><span>{t.flood}</span><b>{w.lowLying}</b><small>{t.outOf}</small></div>
      </div>

      <nav className="wd-tabs" role="tablist">
        {t.tabs.map((name, i) => (
          <button key={name} role="tab" aria-selected={tab === i} onClick={() => setTab(i)}>{name}</button>
        ))}
      </nav>

      {a && tab !== 0 && <p className="wd-note">{t.badgeNote}</p>}
      {!a && <p className="wd-note">{t.noAgent}</p>}
      {held > 0 && <p className="wd-note">{held} {t.held}</p>}

      {tab === 0 && (() => {
        const texts = todayActions(w, lang)
        const decided = acts.filter(status).length
        const outbox = acts.flatMap((x, i) => (approved(status(x)) ? messagesFor(x, texts[i], lang).map((m) => ({ ...m, at: status(x)! })) : status(x)?.startsWith('rep:fixed') && x.citizen ? [{ ch: 'sms' as const, to: (lang === 'mr' ? 'नागरिक, तक्रार ' : 'Citizen, complaint ') + x.citizen, subject: L.citySms, at: status(x)!.slice(-5) }] : []))
        const corp = a?.brief?.corporator
        // Carried to tomorrow: not decided, still with the sub-engineer, or reported not fixed.
        const carry = acts.map((x, i) => [x, texts[i]] as const).filter(([x]) => !status(x) || status(x) === 'asg' || status(x)!.startsWith('rep:notfixed'))
        const day = eod[w.code]
        if (day) outbox.push({ ch: 'email', to: L.eodTo, subject: L.eodSubj(day.decided, day.of, day.carried, inr(lang, day.held)), at: day.at })
        if (decided === acts.length && acts.length && corp?.qc1) outbox.push({ ch: 'email', to: `${L.corpTo} ${w.code}`, subject: `${L.corpSubj}: ${corp[lang].slice(0, 90)}…`, at: '' })
        return (
          <section>
            {a?.brief?.morning.qc1 && <div className="wd-summary"><b>{L.summary}</b><AgentText l={a.brief.morning} lang={lang} /></div>}
            <ol className="wd-steps">
              <li className={decided < acts.length ? 'on' : 'done'}>① {L.steps[0]}</li>
              <li className={decided < acts.length ? 'on' : 'done'}>② {L.steps[1]} · {acts.length - decided} {L.pending}</li>
              <li className={outbox.length ? 'done' : ''}>③ {L.steps[2]} · {outbox.length}</li>
            </ol>
            <div className="wd-progress"><div className="bar"><span style={{ width: `${acts.length ? (decided / acts.length) * 100 : 0}%` }} /></div>
              <small><b>{decided}/{acts.length}</b> {L.progress} · <b>{inr(lang, claimed)}</b> {L.held} · <b>{informed}</b> {L.citizens}</small></div>
            <ol className="wd-cards">
              {texts.map((x, i) => {
                const act = acts[i]
                const st = act && status(act)
                return (
                  <li key={x} className={st ? 'done' : ''}>
                    <p>{x}</p>
                    {act && HAZARD.includes(act.kind) && !approved(st) && st !== 'ok' && !st?.startsWith('rep:fixed') && (
                      <small className="wd-tag warn">⏱ {L.due24}{act.since ? ` · ${L.waiting(Math.floor((AS_OF - Date.parse(act.since.replace(' ', 'T'))) / 864e5))}` : ''}</small>
                    )}
                    {act && !st && (
                      <input className="wd-why" aria-label={L.why} placeholder={L.why} value={why[w.code + '|' + act.key] ?? ''} onChange={(e) => setWhy((y) => ({ ...y, [w.code + '|' + act.key]: e.target.value }))} />
                    )}
                    {act && !st && (
                      <div className="wd-act">
                        <button className="wd-btn" onClick={() => setStatus(act, now())}>{L.approve}</button>
                        {FIELD.includes(act.kind) && <button className="wd-btn ghost" onClick={() => setStatus(act, 'asg')}>{L.assign}</button>}
                        <button className="wd-btn ghost" onClick={() => setStatus(act, 'ok')}>{L.dismiss}</button>
                      </div>
                    )}
                    {act && st && (
                      <div className="wd-act">
                        <span className={st === 'asg' || st.startsWith('rep:notfixed') ? 'wd-qc warn' : 'wd-qc ok'}>{st === 'ok' ? '✓ ' + L.ok : st === 'asg' ? '⏳ ' + L.assigned : st.startsWith('rep:') ? `${L.reported}: ${st.startsWith('rep:fixed') ? L.fixed : L.notFixed} · ${st.slice(-5)}` : '✓ ' + L[act.kind][1]}</span>
                        {approved(st) && messagesFor(act, x, lang).map((m) => <small key={m.to} className="wd-cit">{m.ch === 'sms' ? '📱' : '✉'} {L.sentTo} {m.to}</small>)}
                        <button className="wd-link" onClick={() => setStatus(act)}>{L.undo}</button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ol>
            <h2>{L.outbox}</h2>
            {outbox.length === 0 ? <p className="wd-note">{L.empty}</p> : (
              <ul className="wd-list wd-outbox">
                {outbox.map((m, i) => (
                  <li key={i}><div className="wd-row"><span className="wd-tag">{m.ch === 'sms' ? '📱 SMS' : '✉ Email'}</span><b>{m.to}</b><span className="wd-amt">{m.at}</span></div><small>{m.subject}</small></li>
                ))}
              </ul>
            )}
            {decided < acts.length && <p className="wd-note">{L.corpWait}</p>}
            <h2>{L.eodH}</h2>
            <div className="wd-summary">
              <small><b>{decided}/{acts.length}</b> {L.eodDone} · <b>{carry.length}</b> {L.eodCarry} · <b>{inr(lang, claimed)}</b> {L.held} · <b>{informed}</b> {L.citizens}</small>
              {carry.length > 0 && <ul>{carry.map(([x, text]) => <li key={x.key}><small>{text.split(':')[0]}{status(x) ? ` · ${status(x) === 'asg' ? L.assigned : L.notFixed}` : ''}</small></li>)}</ul>}
              {day ? <div className="wd-act"><span className="wd-qc ok">✓ {L.eodSent} · {day.at}</span></div> : (
                <div className="wd-act"><button className="wd-btn" onClick={() => {
                  const at = now()
                  setEod((e) => ({ ...e, [w.code]: { at, decided, of: acts.length, carried: carry.length, held: claimed, citizens: informed } }))
                  write('eod:' + w.code, at)
                }}>{L.eodSend}</button></div>
              )}
            </div>
            <h2>{L.logH}</h2>
            {log.filter((e) => e.ward === w.code).length === 0 ? <p className="wd-note">{L.logEmpty}</p> : (
              <ul className="wd-list wd-log">
                {log.filter((e) => e.ward === w.code).slice().reverse().map((e, i) => (
                  <li key={i}><small><b>{e.at}</b> · {e.who ? `${e.who} (${L.roles[e.role]})` : L.roles[e.role]} · {L.logV[e.key.startsWith('eod:') ? 'eod' : logVerb(e.v)]} · {e.key.split(':').slice(1).join(':')}{e.reason ? ` · “${e.reason}”` : ''}</small></li>
                ))}
              </ul>
            )}
            <p className="wd-note">{L.simNote}</p>
          </section>
        )
      })()}

      {tab === 3 && (
        <section>
          <h2>{t.repeatsH}: {w.repeats.count}</h2>
          <ul className="wd-list">
            {w.repeats.examples.map((r) => (
              <li key={r.closed + r.again}>
                <div className="wd-row"><b>{r.closed} → {r.again}</b><span className="wd-tag">{t.kinds[r.kind]}</span><span className="wd-tag">{r.days} d · {r.metres} m</span></div>
                <small>{r.locality} · {r.closedAt.slice(0, 10)} → {r.againAt.slice(0, 10)}</small>
                <p className="wd-quote">“{r.text}”</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === 1 && (() => {
        const c = w.citizens, C = L.cz
        const key = (k: string) => w.code + '|cz:' + k
        const st = (k: string) => done[key(k)]
        const mark = (k: string, v?: string) => write('cz:' + k, v)
        const Btn = ({ k, label, doneLabel }: { k: string; label: string; doneLabel: string }) => st(k)
          ? <div className="wd-act"><span className="wd-qc ok">✓ {doneLabel}</span><small className="wd-cit">📱 {C.sms} · {st(k)}</small><button className="wd-link" onClick={() => mark(k)}>{L.undo}</button></div>
          : <div className="wd-act"><button className="wd-btn" onClick={() => mark(k, now())}>{label}</button></div>
        return (
          <section>
            <h2>{C.notFixedH} · {c.notFixedCount}</h2>
            <p className="wd-note">{C.notFixedSub}</p>
            <ul className="wd-list">
              {c.notFixed.map((x) => (
                <li key={x.id}>
                  <div className="wd-row"><b>{x.wo}</b><span className="wd-tag warranty">✗ {x.citizens} {lang === 'mr' ? 'नागरिक: नाही' : (x.citizens > 1 ? 'citizens said No' : 'citizen said No')}</span><span className="wd-amt">{x.id}</span></div>
                  <small>{x.locality} · {x.road} · {x.contractor} · {method(lang, x.method)} · {x.fixedAt.slice(0, 10)}</small>
                  <Btn k={'nf:' + x.wo} label={C.reopen} doneLabel={C.reopened} />
                </li>
              ))}
            </ul>

            <h2>{C.inboxH} · {c.inbox.reduce((s2, g) => s2 + g.count, 0)} {C.ofTotal} {c.openCount}</h2>
            <p className="wd-note">{C.inboxSub}</p>
            <ul className="wd-list">
              {c.inbox.map((g) => (
                <li key={g.key}>
                  <div className="wd-row"><b>{g.locality}</b><span className="wd-tag">{t.kinds[g.kind]}</span><span className="wd-tag act">{g.count} {C.complaints}</span><span className="wd-amt">{g.upvotes} {C.upv}</span></div>
                  <small>{g.channels.join(' · ')} · {g.langs.join(', ')}{g.misfiled ? ` · ${g.misfiled} misfiled` : ''}</small>
                  <p className="wd-quote">“{g.sample}”</p>
                  <Btn k={'ib:' + g.key} label={C.merge} doneLabel={C.merged} />
                </li>
              ))}
            </ul>

            <h2>{C.journeyH}</h2>
            <p className="wd-note">{C.journeySub}</p>
            <ul className="wd-list">
              {c.journey.map((j) => (
                <li key={j.id}>
                  <div className="wd-row"><b>{j.id}</b><span className="wd-tag">{t.kinds[j.kind]}</span>{j.overdueDays > 0 && <span className="wd-tag warranty">{j.overdueDays} {C.overdue}</span>}</div>
                  <ol className="wd-journey">
                    <li className="done">{C.received} {j.received.slice(5, 16)}</li>
                    <li className={j.assigned ? 'done' : ''}>{C.assigned} {j.assigned ? j.assigned.slice(5, 16) : '—'}</li>
                    <li className={j.overdueDays > 0 ? 'late' : ''}>{C.due} {j.due.slice(5, 16)}</li>
                  </ol>
                  <small>{j.locality} · {j.status}</small>
                  {j.overdueDays > 0 && <Btn k={'jr:' + j.id} label={C.escalate} doneLabel={C.escalated} />}
                </li>
              ))}
            </ul>

            <h2>{C.handoffH} · {c.handoffCount}</h2>
            <p className="wd-note">{C.handoffSub}</p>
            <ul className="wd-list">
              {c.handoff.map((h) => (
                <li key={h.id}>
                  <div className="wd-row"><b>{h.id}</b><span className="wd-tag">{t.kinds[h.kind]}</span><span className="wd-tag">{h.status}</span><span className="wd-amt">→ {h.owner}</span></div>
                  <p className="wd-quote">“{h.text}”</p>
                  <Btn k={'ho:' + h.id} label={C.forward} doneLabel={C.forwarded} />
                </li>
              ))}
            </ul>
          </section>
        )
      })()}

      {tab === 2 && (
        <section>
          <AgentText l={a?.auditor?.summary} lang={lang} />
          <div className="wd-chips">
            {Object.entries(w.shouldHavePaid.byType).map(([k, v]) => (
              <span key={k} className={k === 'utility' ? 'muted' : ''}>
                {t.types[k as keyof typeof t.types]}: {v.count} · {inr(lang, v.amount)}{k === 'utility' ? ` (${t.worth})` : ''}
              </span>
            ))}
          </div>
          <ul className="wd-list">
            {byWorkOrder(w.flags).slice(0, 25).map((fs) => {
              const f = fs[0]
              // Headline amount ignores the utility "worth checking" flag unless it is the only one.
              const counted = fs.filter((x) => x.type !== 'utility')
              const amount = Math.max(...(counted.length ? counted : fs).map((x) => x.amount))
              return (
                <li key={f.wo}>
                  <div className="wd-row">
                    <b>{f.wo}</b>
                    {fs.map((x) => <span key={x.type} className={`wd-tag ${x.type}`}>{t.types[x.type]} · {inr(lang, x.amount)}</span>)}
                    <span className="wd-amt">{inr(lang, amount)}</span>
                  </div>
                  <small>{f.roadName} ({f.road}) · {f.contractor} · {method(lang, f.method)} · {f.date}{f.heavyRainWeek ? ' · 🌧' : ''}{f.bigTide ? ' · 🌊' : ''}</small>
                  <AgentText l={lineFor(a?.auditor, f.wo)} lang={lang} />
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {tab === 4 && (
        <section>
          <AgentText l={a?.triage?.summary} lang={lang} />
          {w.placed.typed + w.placed.gps > 0 && <p className="wd-note">{t.placed(w.placed.typed, w.placed.gps)}</p>}
          {([
            [t.misfiled, w.complaints.misfiled, w.complaints.misfiledExamples],
            [t.bounced, w.complaints.bounced, w.complaints.bouncedExamples],
            [t.open, w.complaints.open, w.complaints.oldestOpen],
            [t.placedH, w.placed.typed + w.placed.gps, w.placed.open],
          ] as const).map(([title, n, list]) => (
            <div key={title}>
              <h2>{title}: {n}</h2>
              <ul className="wd-list">
                {list.map((c) => {
                  const ai = lineFor(a?.triage, c.id)
                  return (
                    <li key={c.id}>
                      <div className="wd-row">
                        <b>{c.id}</b>
                        <span className="wd-tag">{c.status}</span>
                        {ai?.action && <span className="wd-tag act">{ai.action}</span>}
                      </div>
                      <small>{c.at} · {c.channel} · {c.locality} · {c.category}</small>
                      <p className="wd-quote">“{c.text}”</p>
                      <small>📷 {c.photo}</small>
                      <AgentText l={ai} lang={lang} />
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </section>
      )}

      {tab === 5 && (
        <section>
          <AgentText l={a?.planner?.summary} lang={lang} />
          <ol className="wd-list">
            {w.nextRupee.slice(0, 5).map((r) => (
              <li key={r.road}>
                <div className="wd-row">
                  <b>{r.name} #{r.segment}</b>
                  <span className="wd-tag">{r.road}</span>
                  <span className="wd-amt">{r.underWarranty ? '₹0' : inr(lang, r.estCost)}</span>
                </div>
                <small>
                  {method(lang, r.method)} · {r.reopens}× reopened · {r.accidents} accidents{r.fatal ? ` (${r.fatal} fatal)` : ''}
                  {r.hospitals.length ? ` · 🏥 ${r.hospitals.join(', ')}` : ''}{r.floodSpots.length ? ` · 🌊 ${r.floodSpots.join(', ')}` : ''}
                  {r.tideSpots.length ? ` · 🌕 ${t.tide}` : ''}{r.tideReopens ? ` · ${t.tideReopen(r.tideReopens)}` : ''}
                  {r.busRoute ? ' · 🚌' : ''} · {inr(lang, r.spent)} spent so far
                </small>
                <AgentText l={lineFor(a?.planner, r.road)} lang={lang} />
              </li>
            ))}
          </ol>
        </section>
      )}

      {tab === 6 && (
        <section>
          <p className="wd-note">{t.contractorNote}</p>
          <div className="wd-table-wrap">
            <table className="wd-table">
              <thead><tr>{t.cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>
                {w.contractors.map((c) => (
                  <tr key={c.name}>
                    <td>{c.name}</td><td>{c.jobs}</td><td>{pct(c.reopenRate)}</td><td>{pct(c.slaMissRate)}</td>
                    <td className={c.avgCostVsRate && c.avgCostVsRate > 1.3 ? 'bad' : ''}>{c.avgCostVsRate ?? '–'}×</td><td>{pct(c.heavyRainShare)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <small>Ward reopen rate {pct(w.reopenRate)} · missed deadline {pct(w.slaMissRate)} · {w.jobs} jobs</small>
        </section>
      )}

      {tab === 7 && (
        <section className="wd-research">
          <h2>A ward officer's day</h2>
          <ul>{day.map((d) => <li key={d.when}><b>{d.when}:</b> {d.what}</li>)}</ul>
          <h2>What hurts, and who says so</h2>
          <ul>{pains.map((p) => <li key={p.pain}>{p.pain} <small>[{p.side.join(', ')}] <a href={p.source} target="_blank" rel="noreferrer">source</a></small></li>)}</ul>
          <h2>Where the sides disagree</h2>
          <ul>{disagreements.map((d) => <li key={d.topic}><b>{d.topic}:</b> {d.a} <i>vs</i> {d.b}</li>)}</ul>
          <h2>Why civic tools die</h2>
          <ul>{toolLessons.map((x) => <li key={x}>{x}</li>)}</ul>
          <h2>What every portal misses</h2>
          <ul>{portalGaps.map((x) => <li key={x}>{x}</li>)}</ul>
          <h2>Devil's advocate</h2>
          <ul>{devilsAdvocate.map((d) => <li key={d.attack}><b>{d.attack}</b> {d.answer}</li>)}</ul>
          <h2>So this desk</h2>
          <ul>{designRules.map((x) => <li key={x}>{x}</li>)}</ul>
          <h2>How the AI is checked</h2>
          <ul>
            <li>4 agents pre-run: Triage (Sonnet), Auditor (Opus), Next-rupee planner (Sonnet), Brief writer (Sonnet). All ₹ maths is done in code, not by AI.</li>
            <li>QC1 Evidence (code): every ID and ₹ figure must exist in the data, or the line is held back.{agents ? ` ${agents.stats.qc1Pass} passed, ${agents.stats.qc1Fail} held back.` : ''}</li>
            <li>QC2 Fairness (Opus): rewrites blame that ignores rain, flood risk, crews or road owner.{agents ? ` ${agents.stats.qc2Reworded} reworded, ${agents.stats.qc2Context} marked "needs context".` : ''}</li>
          </ul>
        </section>
      )}
    </div>
  )
}
