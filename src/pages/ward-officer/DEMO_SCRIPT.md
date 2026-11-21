# Ward Desk: page-by-page demo (ward officer)

**Total: about 4.5 minutes.** Live app: http://127.0.0.1:4317/#/ward-officer (or `npm run preview` in the project, then open `#/ward-officer`).
**Before you go on stage:** press **Reset demo**, then **Sign out**, so the app starts at the sign-in page with 0/5 done.
**Character:** you are the ward officer (Assistant Municipal Commissioner) of F/N ward: Matunga, Sion, Wadala. It is 7:30 am.
All data is the event's synthetic data. Messages are simulated (the screen says so).

---

## Page 1 · Sign in · 10 sec · `01-sign-in.png`
**Click:** type **A. Patil**, pick **F/N**, press **Ward Officer (AMC)**.
**Point at:** the 3 roles. "Three accounts: I decide, my sub-engineer does the field check, the Commissioner sees every ward."
**Say:** "I'm the ward officer for Matunga, Sion and Wadala. Every morning I have 50 open complaints, 6 crews and a monsoon budget to protect."

## Page 2 · Today: review · 20 sec · `02-today-before.png`
**Point at:** the 5 top cards, then "This morning".
**Say:** "Before I arrived, Claude read every complaint, bill and repair. My budget is ₹1.05 crore, 90% spent, and **₹11.9 lakh of payments need checking**. The numbers are calculated in code; Claude writes the words, and a second check hides any line that quotes a number not in the data."
**Point at:** the 3 steps (Review → Decide → Sent automatically) and the 5 numbered cards.
**Say:** "Not a dashboard. Five decisions."

## Page 3 · Today: decide · 40 sec · `03-today-after-approvals.png`
**Click:** **Approve & send** on card 1.
**Say:** "This road is still under warranty. The original builder should fix it free, but we paid ₹1.2 lakh. Approve, and the notice goes to the contractor through the Roads Department."
**Click:** **Approve & send** on card 2. "Billed 2.24 times the standard rate. Payment is on hold until the engineer explains."
**Click:** **Assign to sub-engineer** on card 3. "This pothole was marked fixed and came back 3 days later. Field work goes to my sub-engineer, not into a WhatsApp forward."
**Type** *Paver blocks, not a pothole* in card 4's **Why?** box, then **Click** **No issue**. "I'm still in charge. If something is fine, I say so, and I say why."
**Click:** **Approve & send** on card 5.
**Point at:** the ⏱ chip on the hazard cards. "Potholes have a 24-hour monsoon rule, and the High Court now says 48 hours, with ₹6 lakh compensation per death."
**Point at:** the progress bar (5/5 done · ₹2.5 L claimed or on hold), then scroll to the **Outbox**.
**Say:** "Every message went to the right person. Once all five were decided, **my corporator got the daily update automatically**. No copy-paste, no WhatsApp forwarding."

**Point at:** the **Decision log** at the bottom. "Every decision is logged: who, when, what, and why. Undo adds a line; it never erases one."

## Page 3b · Sub-engineer reports back · 20 sec · `03b-sub-engineer.png`
**Click:** **Sign out**, then **Sub-engineer**.
**Say:** "This is my sub-engineer's account. They see only the jobs I gave them." **Click** **Inspected: fixed**.
**Click:** **Sign out**, type **A. Patil** again, then **Ward Officer (AMC)**.
**Point at:** card 3 ("Sub-engineer reported: fixed") and the Outbox SMS. "The report comes straight back to me, and **the citizen gets an SMS** that it's fixed."

## Page 3c · Close the day · 15 sec · `03c-close-the-day.png`
**Scroll to:** **Close the day**. "At 6 pm I don't write a report. It's already here: what I decided, what carries over to tomorrow, money held, citizens told."
**Click:** **Send day report to Deputy Commissioner**. "One tap, and it's in the outbox and in the log."

## Page 4 · Citizens · 40 sec · `04-citizens.png`
**Click:** the **Citizens** tab.
**Say (Smart inbox):** "Citizens complain on the app, on the helpline and on the web, in English, Marathi and Hinglish. Claude grouped **17 of those complaints into 1 Wadala pothole issue**." **Click** **Merge into 1 issue + 1 work order**. "One work order, and all 17 people are told."
**Say (Not fixed):** "After every repair the citizen gets an SMS: Fixed, yes or no? Five people said no about this job." **Click** **Reopen job + flag contractor**.
**Say (Journey):** "Every complaint shows where it's stuck. This one is 121 days past its deadline." **Click** **Escalate to Deputy Commissioner**.
**Say (Not our road):** "33 complaints were rejected as 'not our road'. Instead of a silent no, we forward them with a letter and tell the citizen who owns the road." **Click** **Forward with letter + tell citizen**.

## Page 5 · Who should have paid · 20 sec · `05-who-should-have-paid.png`
**Click:** **Who should have paid**.
**Say:** "Here is the evidence behind the ₹11.9 lakh: roads under warranty, bills over the standard rate, the same job billed twice within a week. Each card says why, and where rain may explain it, it says that too. Utility-trench jobs are shown but not counted."

## Page 6 · Fixed or just closed? · 15 sec · `06-fixed-or-just-closed.png`
**Click:** **Fixed or just closed?**
**Say:** "Citizens' number one complaint is that 'closed' doesn't mean 'fixed'. We check the data itself: 19 spots where a complaint marked resolved came back within 30 days, at the same place, for the same problem."

## Page 7 · Lost complaints · 10 sec · `07-lost-complaints.png`
**Say:** "Complaints the system lost: the photo shows a pothole but it was filed as something else, or it was bounced as a duplicate. And 19 complaints came in with no ward at all: we placed them from the typed locality, including Marathi spellings."

## Page 8 · Next rupee · 15 sec · `08-next-rupee.png`
**Say:** "Where my next rupee goes: ranked by need, not by noise. Hospital ambulance roads, flood spots, accidents, patches that already failed, and flood spots that big tides block (🌕). Two of these roads should cost us ₹0, because they're under warranty."

## Page 9 · Contractors · 10 sec · `09-contractors.png`
**Say:** "Contractors are scored fairly: each one shows how much of their work fell in heavy-rain weeks, so nobody is blamed for the monsoon."

## Page 10 · Why this · 15 sec · `10-why-this.png`
**Say:** "Built on research from four sides: officials, officers, citizens and critics. We took apart 18 complaint portals, and argued against our own design."

## Page 11 · Commissioner · 15 sec · `11-commissioner.png`
**Click:** **Sign out**, then **Commissioner (city)**.
**Say:** "The Commissioner sees all 24 wards: payments to check, open complaints, missed deadlines, who has decided today, and whose day is closed. F/N shows my 5 of 5 and the time I sent my report."
**Click:** **Sign out**, then **Ward Officer (AMC)**.

## Page 12 · Marathi · 10 sec · `12-marathi.png`
**Click:** **मराठी**.
**Say:** "And it works in the officer's own language."

---

## Closing line (5 sec)
"Claude does the reading. The officer makes the calls. The citizen is told what happened. Every rupee is followed."

## If something goes wrong
- A button pressed by mistake: press **Undo** on that card.
- Want to start over: press **Reset demo**.
- Page blank: refresh the browser; your sign-in and decisions are remembered.

## Honest answers if judges ask
- **Is the data real?** No. It's the event's synthetic dataset, and the screen says so.
- **Are messages really sent?** Not in the demo. In real use they would go through the BMC email/SMS gateway.
- **The citizens' "No" answers?** They're worked out from repairs that broke again within 30 days; the dataset has no real citizen replies.
- **Who does what in real BMC?** News reports say a sub-engineer per electoral ward inspects and closes pothole jobs, and the Assistant Commissioner supervises them. Who signs which bill could not be confirmed, so the desk only lets the officer *hold* or *check* a payment.
- **Is it accurate?** Every rupee figure is computed in code. AI lines that quote a number not in the data are held back (617 passed, 2 held back).
