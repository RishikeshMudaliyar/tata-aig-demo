/**
 * Seed: the unified issuance journey + retention cohort.
 * - Neha Agarwal: hero lead, drivable from zero (copilot → docs → 3-level UW → issue).
 * - Priya Sharma: pre-seeded mid-journey — UW sent the case back to sales (resolve → decide).
 * - Deepak / Sunil: cases sitting at analyst / underwriter for queue depth.
 * - Retention cohort: orphan + assigned at-risk policies (separate journey, same principles).
 */
import type { PrismaClient } from "@prisma/client";

const CR = 10_000_000;
const L = 100_000;
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const hoursAgo = (n: number) => { const d = new Date(); d.setHours(d.getHours() - n); return d; };
const daysFromNow = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const isoDay = (n: number) => daysAgo(n).toISOString().slice(0, 10);
const J = (v: unknown) => JSON.stringify(v);

const docsAllReceived = () => J([
  { key: "pan", label: "PAN card", status: "RECEIVED", via: "CUSTOMER", at: daysAgo(3).toISOString() },
  { key: "aadhaar", label: "Aadhaar", status: "RECEIVED", via: "CUSTOMER", at: daysAgo(3).toISOString() },
  { key: "photo", label: "Photograph", status: "RECEIVED", via: "SALES", at: daysAgo(3).toISOString() },
  { key: "itr", label: "Income proof (ITR)", status: "RECEIVED", via: "SALES", at: daysAgo(2).toISOString() },
]);

export async function seedAll(db: PrismaClient) {
  console.log("Clearing existing data…");
  await db.notification.deleteMany();
  await db.activityEvent.deleteMany();
  await db.application.deleteMany();
  await db.riskSignal.deleteMany();
  await db.servicingTicket.deleteMany();
  await db.policy.deleteMany();
  await db.lead.deleteMany();
  await db.customer.deleteMany();
  await db.metricSnapshot.deleteMany();
  await db.persona.deleteMany();

  // --- PERSONAS -----------------------------------------------------------
  console.log("Seeding personas…");
  const leadership = await db.persona.create({ data: { name: "Rajesh Iyer", role: "LEADERSHIP", title: "Chief Distribution Officer", initials: "RI", region: "National" } });
  const fls = await db.persona.create({ data: { name: "Vikram Singh", role: "FLS", title: "Sales Agent — Pune", initials: "VS", region: "West", branch: "Pune — Kothrud", managerId: leadership.id } });
  const fls2 = await db.persona.create({ data: { name: "Rahul Bose", role: "ADVISOR", title: "Advisor — West", initials: "RB", region: "West", branch: "Pune — Baner", managerId: leadership.id } });
  const fls3 = await db.persona.create({ data: { name: "Arti Deshpande", role: "FLS", title: "Sales Manager (On-roll)", initials: "AD", region: "West", branch: "Pune — Camp", managerId: leadership.id } });
  const analyst = await db.persona.create({ data: { name: "Kiran Desai", role: "ANALYST", title: "Risk Ops — New Business", initials: "KD", region: "National", branch: "NB Hub — Pune" } });
  const uw = await db.persona.create({ data: { name: "Dr. Neha Kapoor", role: "UNDERWRITER", title: "Underwriter — Medical & Financial", initials: "NK", region: "National", branch: "UW Hub — Pune" } });
  const ops = await db.persona.create({ data: { name: "Amit Joshi", role: "OPS", title: "Ops & Servicing Specialist", initials: "AJ", region: "West", branch: "Pune HQ" } });
  await db.persona.create({ data: { name: "Admin", role: "ADMIN", title: "Control Tower — Platform Administrator", initials: "PA", region: "National" } });

  // --- LEADS (Vikram's book) — each carries its AI copilot brief ----------
  console.log("Seeding leads + copilot briefs…");
  await db.lead.create({
    data: {
      name: "Neha Agarwal", phone: "+91 98230 55412", source: "PolicyBazaar", productInterest: "Term cover",
      city: "Pune", language: "English", occupation: "Product Manager — tech company", incomeAnnual: 24 * L,
      ageHours: 2, score: 88, status: "NEW", ownerId: fls.id,
      copilot: J({
        type: "Hand-raise",
        whyScored: [
          "Compared term plans twice on PolicyBazaar in the last 48 hours — high intent",
          "Salaried, income band ₹20–30L — protection-gap segment with high issuance rates",
          "Age 33 — locking premium this year saves ~₹2,100/yr for life",
        ],
        product: "Tata AIG Life Assure Shield (Term)",
        cover: 1.5 * CR, premium: 16900, term: "up to age 60",
        talkTrack:
          "Open with her research: \"I saw you were comparing term covers — most people in your bracket land between ₹1–2 Cr, let me make that simple.\" Anchor on 10–15x income: at ₹24L that's ₹1.5 Cr. Position Assure Shield at about ₹1,400/month — less than her weekend grocery run — with the return-of-premium option if she wants maturity value. Close on the medical: it's a 20-minute tele-call, no clinic visit.",
        objections: [
          { q: "My employer already covers me", a: "Employer cover ends the day the job does — and it's usually 2–3x salary. This stays with you for 27 years, whoever the employer is." },
          { q: "Premium feels high", a: "₹1,400/month at 33 vs ₹2,300/month at 38 — the price of waiting is ₹3 lakh over the term. Locking now IS the discount." },
          { q: "I need to discuss with my spouse", a: "Absolutely — I can hold this quote for 7 days. Want me to send a one-page summary you can review together tonight?" },
        ],
      }),
    },
  });
  await db.lead.create({
    data: {
      name: "Rohan Kulkarni", phone: "+91 98111 33245", source: "Website", productInterest: "ULIP / investment",
      city: "Pune", language: "Marathi", occupation: "Business owner — auto parts", incomeAnnual: 18 * L,
      ageHours: 20, score: 76, status: "NEW", ownerId: fls2.id,
      copilot: J({
        type: "D2C",
        whyScored: ["Used the retirement calculator on the website — goal-based intent", "Self-employed — no employer cover, whole protection gap open"],
        product: "Tata AIG Life Wealth Builder II (ULIP)",
        cover: 60 * L, premium: 60000, term: "15 years",
        talkTrack: "He came via the retirement calculator — lead with the goal, not the product. Ask what the number he saw was, then show Wealth Builder II reaching it with return-of-mortality-charges at maturity. Business owners respond to flexibility: highlight partial withdrawals after year 5.",
        objections: [
          { q: "Mutual funds give better returns", a: "Comparable fund options, plus a life cover and zero LTCG on maturity under current rules — the after-tax picture is closer than it looks." },
          { q: "Business cash flow is seasonal", a: "Annual mode with a 30-day grace, or monthly mode — we fit the premium to the cash cycle, not the other way." },
        ],
      }),
    },
  });
  await db.lead.create({
    data: {
      name: "Sanjay Verma", phone: "+91 99870 11234", source: "Referral", productInterest: "Term + child plan",
      city: "Pune", language: "Hindi", occupation: "Bank employee", incomeAnnual: 14 * L,
      ageHours: 30, score: 64, status: "CALLBACK", ownerId: fls.id,
      copilot: J({
        type: "Referral",
        whyScored: ["Referred by an existing customer (Meena Iyer) — referral closes 3x cold rate", "Asked for a callback after 6 pm — respect the window"],
        product: "Tata AIG Life Assure Shield + Young Assure",
        cover: 1 * CR, premium: 13800, term: "up to age 60",
        talkTrack: "He asked for this callback — start there: \"You wanted to talk after hours, thanks for the time.\" Referral from Meena Iyer means trust is pre-built; mention her (with permission) once. He has a daughter (7) — bridge from term protection to Young Assure for her education corpus.",
        objections: [
          { q: "LIC feels safer", a: "Fair — and claims data is public: our individual death-claim settlement is 99%+. I'll send the IRDAI page, not my word." },
        ],
      }),
    },
  });
  await db.lead.create({
    data: {
      name: "Pooja Shah", phone: "+91 98761 90230", source: "Branch walk-in", productInterest: "Guaranteed savings",
      city: "Pune", language: "Gujarati", occupation: "Homemaker — family business", incomeAnnual: 10 * L,
      ageHours: 71, score: 58, status: "NEW", ownerId: fls3.id,
      copilot: J({
        type: "Branch",
        whyScored: ["Walked into the branch — highest-intent channel", "71 hours unworked — conversion probability decaying"],
        product: "Tata AIG Life Guaranteed Wealth Plan",
        cover: 25 * L, premium: 50000, term: "10 pay / 20 benefit",
        talkTrack: "She walked in asking about guaranteed returns — do NOT open with market-linked products. Lead with the Guaranteed Wealth Plan's guaranteed income number in rupees, then the life-cover as the bonus. Keep it to two numbers: what she pays, what she gets.",
        objections: [
          { q: "FD rates are similar", a: "FD interest is taxable every year; this payout is tax-free under 10(10D) and adds ₹25L life cover the FD never will." },
        ],
      }),
    },
  });

  await db.lead.create({
    data: {
      name: "Kavita Rane", phone: "+91 98122 87654", source: "Website", productInterest: "Term cover",
      city: "Pune", language: "Marathi", occupation: "Architect — independent", incomeAnnual: 16 * L,
      ageHours: 55, score: 61, status: "NEW", ownerId: fls2.id,
      copilot: J({
        type: "D2C",
        whyScored: ["Downloaded the term brochure from the website", "55 hours unworked — conversion decaying"],
        product: "Tata AIG Life iRaksha Secure (Term)",
        cover: 1 * CR, premium: 12600, term: "up to age 60",
        talkTrack: "She downloaded the brochure two days ago — open by referencing it and offering to answer the three questions everyone asks: price lock, claim record, and what happens if she stops paying.",
        objections: [
          { q: "I'll decide next month", a: "Premiums are age-banded — her birthday moves the quote up a slab. Locking now is the cheapest this ever gets." },
        ],
      }),
    },
  });

  // --- HERO CUSTOMER: PRIYA SHARMA (mid-journey: UW sent back) -------------
  console.log("Seeding Priya Sharma (send-back in progress)…");
  const priya = await db.customer.create({
    data: {
      name: "Priya Sharma", phone: "+91 98220 41567", email: "priya.sharma@example.com",
      language: "Marathi", city: "Pune", dob: "1989-03-14",
      occupation: "Self-employed — Boutique owner", incomeAnnual: 12 * L,
      panName: "Priya Sharma", aadhaarName: "Priya R Sharma",
      segment: "Mass affluent",
    },
  });

  await db.application.create({
    data: {
      refNo: "APP-2026-004417", customerId: priya.id,
      product: "Tata AIG Life Assure Shield", plan: "Term",
      sumAssured: 150 * L, premium: 18400,
      status: "SENT_BACK", sentBackTo: "ANALYST",
      ownerId: fls.id, analystId: analyst.id, underwriterId: uw.id,
      docs: docsAllReceived(),
      caseFile: J({
        aiScrutiny: { result: "FLAGS", notes: ["KYC name mismatch: PAN 'Priya Sharma' vs Aadhaar 'Priya R Sharma'", "Cover ₹1.5 Cr needs 2 assessment years of income proof — only FY24-25 on file"], at: daysAgo(2).toISOString() },
        hlv: 180 * L, aggregateCover: 156 * L,
        authorityBand: "Senior underwriter (₹50L – ₹3 Cr)",
        teleMer: { status: "COMPLETED", scheduledAt: daysAgo(2).toISOString(), report: "Tele-MER report: BP 138/88 — borderline · BMI 24.1 · non-smoker · no adverse disclosures. Standard rates with annual BP declaration suggested." },
      }),
      sendBacks: J([{
        id: "sb-priya-1", level: "ANALYST",
        reasons: ["Income proof missing / unclear", "KYC name mismatch (PAN vs Aadhaar)"],
        note: "Need FY23-24 ITR as second assessment year for ₹1.5 Cr cover, and a name-correction declaration for the Aadhaar 'Priya R Sharma'.",
        status: "OPEN", at: daysAgo(1).toISOString(),
      }]),
      createdAt: daysAgo(4), submittedAt: daysAgo(3), stageChangedAt: daysAgo(1),
    },
  });

  // Priya's existing ULIP — the retention case (orphan + bounced mandate)
  const priyaUlip = await db.policy.create({
    data: {
      policyNo: "0312 8891 2245", customerId: priya.id,
      product: "Tata AIG Life Wealth Builder II", plan: "ULIP", status: "GRACE",
      issueDate: isoDay(22 * 30), premium: 60000, mode: "ANNUAL", sumAssured: 6 * L,
      fundValue: 135400, surrenderValue: 98200, dueDate: daysFromNow(9), cohortMonth: 25,
      advisorId: null,
    },
  });
  await db.servicingTicket.create({
    data: { customerId: priya.id, policyId: priyaUlip.id, type: "FUND_SWITCH", detail: "Requested switch from Equity Growth to Balanced fund — unactioned for 14 days.", status: "OPEN", openedAt: daysAgo(14) },
  });
  await db.riskSignal.create({
    data: {
      policyId: priyaUlip.id, score: 88, status: "AT_RISK", detectedAt: daysAgo(6),
      reasons: J([
        { label: "Auto-debit (ECS) mandate bounced 6 days ago", module: "CustMgmt" },
        { label: "Orphan policy — servicing advisor exited", module: "TeamMgmt" },
        { label: "Open fund-switch request unresolved 14 days", module: "CustMgmt" },
        { label: "Renewal grace period ends in 9 days", module: "CustMgmt" },
      ]),
    },
  });

  // --- QUEUE-DEPTH CASES: Deepak (analyst), Sunil (underwriter) ------------
  console.log("Seeding analyst/UW queue cases…");
  const deepak = await db.customer.create({
    data: { name: "Deepak Malhotra", phone: "+91 98995 20871", language: "Hindi", city: "Mumbai", occupation: "Salaried — operations head", incomeAnnual: 30 * L, panName: "Deepak Malhotra", aadhaarName: "Deepak Malhotra", segment: "Salaried" },
  });
  await db.application.create({
    data: {
      refNo: "APP-2026-004521", customerId: deepak.id,
      product: "Tata AIG Life iRaksha Secure", plan: "Term",
      sumAssured: 80 * L, premium: 11200,
      status: "ANALYST_REVIEW", ownerId: fls2.id, analystId: analyst.id, underwriterId: uw.id,
      docs: docsAllReceived(),
      caseFile: J({
        aiScrutiny: { result: "PASS", notes: ["Documents complete", "KYC consistent", "Cover within income grid"], at: hoursAgo(3).toISOString() },
        hlv: 450 * L, aggregateCover: 80 * L,
        authorityBand: "Senior underwriter (₹50L – ₹3 Cr)",
        teleMer: { status: "COMPLETED", scheduledAt: hoursAgo(3).toISOString(), report: "Tele-MER report: BP 122/80 · BMI 25.8 · non-smoker · no adverse disclosures. Standard rates apply." },
      }),
      createdAt: hoursAgo(28), submittedAt: hoursAgo(3), stageChangedAt: hoursAgo(3),
    },
  });

  const sunil = await db.customer.create({
    data: { name: "Sunil Gupta", phone: "+91 99304 18829", language: "Hindi", city: "Nashik", occupation: "Trader — commodities", incomeAnnual: 10 * L, panName: "Sunil Gupta", aadhaarName: "Sunil Gupta", segment: "Self-employed" },
  });
  await db.application.create({
    data: {
      refNo: "APP-2026-004390", customerId: sunil.id,
      product: "Tata AIG Life Assure Shield", plan: "Term",
      sumAssured: 2 * CR, premium: 31500,
      status: "UW_REVIEW", ownerId: fls.id, analystId: analyst.id, underwriterId: uw.id,
      docs: docsAllReceived(),
      caseFile: J({
        aiScrutiny: { result: "FLAGS", notes: ["Cover 20x of declared income — at grid ceiling"], at: hoursAgo(9).toISOString() },
        analystNote: "Declared income ₹10L vs ₹2 Cr cover — HLV ceiling ₹1.2 Cr breached (aggregate ₹2.06 Cr incl. existing cover). Trading income seasonal; ITRs show 40% year-on-year variance. Flagged for decision.",
        hlv: 120 * L, aggregateCover: 206 * L,
        authorityBand: "Chief UW / CMO referral",
        teleMer: { status: "COMPLETED", scheduledAt: hoursAgo(20).toISOString(), report: "Tele-MER report: BP 130/86 · BMI 27.2 · occasional smoker declared. Class II rates suggested." },
      }),
      createdAt: hoursAgo(50), submittedAt: hoursAgo(20), stageChangedAt: hoursAgo(9),
    },
  });

  const imran = await db.customer.create({
    data: { name: "Imran Qureshi", phone: "+91 98450 66120", language: "Hindi", city: "Pune", occupation: "Salaried — logistics manager", incomeAnnual: 15 * L, panName: "Imran Qureshi", aadhaarName: "Imran Qureshi", segment: "Salaried" },
  });
  await db.application.create({
    data: {
      refNo: "APP-2026-004540", customerId: imran.id,
      product: "Tata AIG Life iRaksha Secure", plan: "Term",
      sumAssured: 75 * L, premium: 10400,
      status: "DOC_COLLECTION", ownerId: fls3.id, analystId: analyst.id, underwriterId: uw.id,
      docs: J([
        { key: "pan", label: "PAN card", status: "RECEIVED", via: "CUSTOMER", at: hoursAgo(5).toISOString() },
        { key: "aadhaar", label: "Aadhaar", status: "RECEIVED", via: "CUSTOMER", at: hoursAgo(5).toISOString() },
        { key: "photo", label: "Photograph", status: "RECEIVED", via: "CUSTOMER", at: hoursAgo(4).toISOString() },
        { key: "itr", label: "Income proof (ITR)", status: "PENDING", via: null, at: null },
      ]),
      createdAt: hoursAgo(6), stageChangedAt: hoursAgo(6),
    },
  });

  // --- RETENTION COHORT ----------------------------------------------------
  console.log("Seeding retention cohort…");
  const mk = async (c: { name: string; phone: string; language: string; city: string }, p: { policyNo: string; product: string; plan: string; status: string; premium: number; sumAssured: number; fundValue?: number; dueDate: string; cohortMonth: number; advisorId?: string | null }, sig?: { score: number; reasons: unknown[] }) => {
    const cust = await db.customer.create({ data: { ...c } });
    const pol = await db.policy.create({ data: { customerId: cust.id, issueDate: isoDay(p.cohortMonth * 30), mode: "ANNUAL", surrenderValue: p.fundValue ? Math.round(p.fundValue * 0.72) : null, advisorId: p.advisorId ?? null, ...p } });
    if (sig) await db.riskSignal.create({ data: { policyId: pol.id, score: sig.score, reasons: J(sig.reasons), status: "AT_RISK", detectedAt: daysAgo(4) } });
    return { cust, pol };
  };

  await mk(
    { name: "Suresh Patil", phone: "+91 98600 12345", language: "Marathi", city: "Nashik" },
    { policyNo: "0312 3390 5567", product: "Tata AIG Life Saral Suraksha Bima", plan: "Term", status: "LAPSED", premium: 12000, sumAssured: 25 * L, dueDate: daysFromNow(-8), cohortMonth: 13 },
    { score: 95, reasons: [{ label: "Already lapsed 8 days ago — revival window open", module: "CustMgmt" }, { label: "Orphan policy, rural — no digital follow-up attempted", module: "TeamMgmt" }] }
  );
  await mk(
    { name: "Arjun Nair", phone: "+91 98470 77812", language: "Malayalam", city: "Kochi" },
    { policyNo: "0312 5567 8890", product: "Tata AIG Life Wealth Builder", plan: "ULIP", status: "GRACE", premium: 48000, sumAssured: 5 * L, fundValue: 7.2 * L, dueDate: daysFromNow(6), cohortMonth: 25 },
    { score: 91, reasons: [{ label: "₹7.2L fund value at stake on discontinuance", module: "CustMgmt" }, { label: "Orphan policy — advisor moved to competitor", module: "TeamMgmt" }] }
  );
  await mk(
    { name: "Rakesh Deshmukh", phone: "+91 98901 44321", language: "Marathi", city: "Pune" },
    { policyNo: "0312 7789 1102", product: "Tata AIG Life Wealth Builder II", plan: "ULIP", status: "GRACE", premium: 36000, sumAssured: 3.6 * L, fundValue: 2.45 * L, dueDate: daysFromNow(11), cohortMonth: 13 },
    { score: 82, reasons: [{ label: "First renewal — 13-month cohort risk", module: "Intelligence" }, { label: "Orphan policy", module: "TeamMgmt" }] }
  );
  const fatima = await mk(
    { name: "Fatima Sheikh", phone: "+91 99230 90111", language: "Hindi", city: "Aurangabad" },
    { policyNo: "0312 8890 3324", product: "Tata AIG Life POS Suraksha Goal", plan: "NonPar", status: "IN_FORCE", premium: 24000, sumAssured: 4.8 * L, dueDate: daysFromNow(12), cohortMonth: 37, advisorId: fls.id },
    { score: 71, reasons: [{ label: "Open grievance ticket — payout misunderstanding", module: "CustMgmt" }, { label: "Payment 12 days from due, no auto-pay mandate", module: "CustMgmt" }] }
  );
  await db.servicingTicket.create({
    data: { customerId: fatima.cust.id, policyId: fatima.pol.id, type: "GRIEVANCE", detail: "Believes maturity payout is yearly — plan pays at term end. Needs a walkthrough.", status: "OPEN", openedAt: daysAgo(9) },
  });
  await mk(
    { name: "Meena Iyer", phone: "+91 98844 32109", language: "Tamil", city: "Chennai" },
    { policyNo: "0312 9912 6678", product: "Tata AIG Life Flexi Income Plan", plan: "Par", status: "IN_FORCE", premium: 30000, sumAssured: 6 * L, dueDate: daysFromNow(18), cohortMonth: 49, advisorId: fls3.id },
    { score: 58, reasons: [{ label: "Missed last premium by 11 days (paid in grace)", module: "CustMgmt" }] }
  );

  // --- MONTH-TO-DATE CLOSED SALES (drives KPI scorecards + pipeline "Issued") ----
  console.log("Seeding month-to-date closed sales…");
  let saleSeq = 700;
  const closedSale = async (advisorId: string, name: string, city: string, product: string, plan: string, sumAssured: number, premium: number, dAgo: number) => {
    const cust = await db.customer.create({ data: { name, phone: "+91 90000 0" + String(1000 + saleSeq), language: "Hindi", city, segment: "New business", panName: name, aadhaarName: name } });
    await db.application.create({
      data: {
        refNo: `APP-2026-00${saleSeq++}`, customerId: cust.id, product, plan, sumAssured, premium,
        status: "ISSUED", ownerId: advisorId, analystId: analyst.id, underwriterId: uw.id,
        docs: docsAllReceived(),
        createdAt: daysAgo(dAgo + 4), submittedAt: daysAgo(dAgo + 2), stageChangedAt: daysAgo(dAgo),
      },
    });
  };
  // Vikram — strong month
  await closedSale(fls.id, "Aditya Rao", "Pune", "Tata AIG Life Assure Shield", "Term", 1_00_00_000, 14200, 3);
  await closedSale(fls.id, "Sneha Kulkarni", "Pune", "Tata AIG Life iRaksha Secure", "Term", 75_00_000, 10800, 8);
  await closedSale(fls.id, "Mohit Sethi", "Mumbai", "Tata AIG Life Wealth Builder II", "ULIP", 40_00_000, 60000, 12);
  // Rahul — mid
  await closedSale(fls2.id, "Farah Khan", "Pune", "Tata AIG Life Assure Shield", "Term", 50_00_000, 8600, 5);
  await closedSale(fls2.id, "Girish Patel", "Nashik", "Tata AIG Life Guaranteed Wealth Plan", "NonPar", 20_00_000, 50000, 10);
  // Arti — building
  await closedSale(fls3.id, "Lata Menon", "Pune", "Tata AIG Life iRaksha Secure", "Term", 1_00_00_000, 13500, 6);

  // --- SEEDED JOURNEY EVENTS ----------------------------------------------
  console.log("Seeding activity timeline…");
  const priyaApp = await db.application.findFirst({ where: { refNo: "APP-2026-004417" } });
  await db.activityEvent.createMany({
    data: [
      { actorId: fls.id, verb: "converted lead & opened application", targetType: "Application", targetId: priyaApp!.id, note: "₹1.5 Cr term · Priya Sharma", createdAt: daysAgo(4) },
      { verb: "customer uploaded document", targetType: "Application", targetId: priyaApp!.id, note: "PAN card", createdAt: daysAgo(3) },
      { actorId: fls.id, verb: "submitted to underwriting — 4/4 documents", targetType: "Application", targetId: priyaApp!.id, createdAt: daysAgo(3) },
      { verb: "AI scrutiny — 2 flags raised", targetType: "Application", targetId: priyaApp!.id, note: "KYC mismatch · income proof depth", createdAt: daysAgo(3) },
      { verb: "tele-MER completed — report attached to case", targetType: "Application", targetId: priyaApp!.id, note: "TPA vendor", createdAt: daysAgo(2) },
      { actorId: analyst.id, verb: "verified case file & forwarded to underwriter", targetType: "Application", targetId: priyaApp!.id, note: "HLV ₹1.8 Cr · aggregate within band", createdAt: daysAgo(2) },
      { actorId: analyst.id, verb: "sent back to sales — 2 items", targetType: "Application", targetId: priyaApp!.id, note: "FY23-24 ITR · KYC name declaration", createdAt: daysAgo(1) },
      { verb: "lapse-risk detected — score 88", targetType: "Policy", targetId: priyaUlip.id, note: "mandate bounce + orphan + open ticket", createdAt: daysAgo(6) },
    ],
  });

  console.log("✅ Seed complete.");
}
