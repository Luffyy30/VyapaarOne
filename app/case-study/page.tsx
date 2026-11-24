"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { compute, DEFAULTS, type Assumptions } from "@/lib/unitecon";
import { inr, lakh } from "@/lib/format";

const SRC = {
  pib: "https://pib.gov.in/PressReleasePage.aspx?PRID=2278107",
  sidbi: "https://www.sidbi.in/blog/the-msme-credit-gap-in-india-what-does-the-data-say",
  fpj: "https://www.freepressjournal.in/business/quantum-of-delayed-payments-to-msmes-steadily-declines-to-734-lakh-crore-roars-positive-impact-of-policy-measures",
  open: "https://inc42.com/buzz/neobank-open-spent-inr-3-5-to-earn-every-rupee-in-fy25",
  khata: "https://www.indianstartuptimes.com/?p=24718",
};

const COMPETITORS: { name: string; type: string; strength: string; gap: string }[] = [
  { name: "Open", type: "Neobank for businesses", strength: "Current account, payments, invoicing and expense tools in one app, built on partner banks.", gap: "Heavy spend for the revenue it earns (see the box below). A bank-style product asks the owner to move money first." },
  { name: "RazorpayX", type: "Payments and payouts", strength: "Strong payment stack: collections, vendor payouts, payroll, current account via partner banks.", gap: "Built around moving money for growing, tech-ready firms. Less focus on the kirana-scale owner who lives in a ledger and WhatsApp." },
  { name: "Khatabook, OkCredit", type: "Ledger apps", strength: "Huge reach with small shopkeepers. Simple credit-and-debit khata habit.", gap: "Ledger first. Reconciling against the bank and showing lenders a clean picture are thin." },
  { name: "Vyapar, Zoho Books, Tally", type: "Billing and accounting", strength: "GST-ready invoices, inventory and accounting depth that CAs trust.", gap: "Software only. They do not connect collections, bank statements and credit in one control center." },
  { name: "Banks' own business apps", type: "Incumbent banks", strength: "Trust, licences, balance sheet and branch network.", gap: "Built around the bank's products, not the owner's daily job of getting paid and tracking cash." },
];

function Field({ label, value, onChange, step = 1, suffix, pct }: { label: string; value: number; onChange: (n: number) => void; step?: number; suffix?: string; pct?: boolean }) {
  const shown = pct ? Math.round(value * 10000) / 100 : value;
  return (
    <div>
      <label>{label}{suffix ? ` (${suffix})` : ""}</label>
      <input type="number" min={0} step={step} value={shown}
        onChange={(e) => { const v = parseFloat(e.target.value); onChange(Number.isFinite(v) && v >= 0 ? (pct ? v / 100 : v) : 0); }} />
    </div>
  );
}

export default function CaseStudy() {
  const [a, setA] = useState<Assumptions>(DEFAULTS);
  const e = useMemo(() => compute(a), [a]);
  const set = (k: keyof Assumptions) => (n: number) => setA((p) => ({ ...p, [k]: n }));
  const maxStream = Math.max(...e.streams.map((s) => s.value), 1);
  const openRatio = 158.4 / 45.9;

  return (
    <div className="wrap">
      <header className="top">
        <div className="brand">
          <div className="logo">V</div>
          <div><h1 style={{ fontSize: 20 }}>VyaparOne</h1><div className="biz">Case study · Group 20 · Digital Banking and Neo Banks</div></div>
        </div>
        <Link href="/dashboard" className="lb">Open the product</Link>
      </header>

      <div className="card" style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: 24, maxWidth: 720 }}>A finance control center for India&apos;s small businesses, built on a partner bank instead of a banking licence</h2>
        <p style={{ color: "var(--muted)", maxWidth: 720 }}>
          VyaparOne helps an MSME owner see who owes money, match payments against the bank statement, watch cash flow and know how ready the business is for a loan.
          Money movement, deposits and lending stay with licensed partners (BaaS model). This page sets out the problem, the competition, the revenue model and the limits.
        </p>
      </div>

      <h2 style={{ margin: "22px 0 10px" }}>1. The problem</h2>
      <div className="grid g4">
        <div className="card kpi"><div className="l">Registered MSMEs</div><div className="v">8.7 crore</div><div className="s">Udyam, June 2026 · <a href={SRC.pib}>PIB</a></div></div>
        <div className="card kpi"><div className="l">Ever used formal credit</div><div className="v">41%</div><div className="s">About 3.6 crore of them · <a href={SRC.sidbi}>SIDBI, CIBIL</a></div></div>
        <div className="card kpi"><div className="l">Credit gap</div><div className="v">₹30 lakh cr</div><div className="s">Modelled estimate, about 24% of demand · <a href={SRC.sidbi}>SIDBI</a></div></div>
        <div className="card kpi"><div className="l">Delayed payments</div><div className="v">₹7.34 lakh cr</div><div className="s">Down from ₹10.7 lakh cr in 2022 · <a href={SRC.fpj}>GAME, FISME, C2FO</a></div></div>
      </div>
      <p className="note">Two problems feed each other. Customers pay late, so cash is tight. Records are scattered, so lenders cannot see a reliable picture and the owner stays outside formal credit. VyaparOne works on both ends: faster collection and a clean record.</p>

      <h2 style={{ margin: "22px 0 10px" }}>2. Competitive landscape</h2>
      <div className="card">
        <div className="tw">
          <table>
            <thead><tr><th>Player</th><th>Type</th><th>What it does well</th><th>Gap VyaparOne targets</th></tr></thead>
            <tbody>
              {COMPETITORS.map((c) => (
                <tr key={c.name}><td style={{ whiteSpace: "nowrap" }}><b>{c.name}</b></td><td>{c.type}</td><td style={{ minWidth: 220 }}>{c.strength}</td><td style={{ minWidth: 220 }}>{c.gap}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="note">The comparison is qualitative and based on each player&apos;s public positioning. Feature sets change often, so check before quoting it.</p>
      </div>
      <div className="card" style={{ marginTop: 14 }}>
        <h3>Reality check: what a neobank burns</h3>
        <p style={{ margin: "6px 0 10px", color: "var(--muted)" }}>
          Open reported FY25 operating revenue of ₹45.9 crore against total expenses of ₹158.4 crore and a net loss of ₹108.9 crore (<a href={SRC.open}>Inc42</a>).
          That is about ₹{openRatio.toFixed(2)} spent for every ₹1 of revenue. Khatabook&apos;s FY24 revenue was reported at about ₹102.7 crore (<a href={SRC.khata}>Indian Startup Times</a>), which shows the size of the ledger-app audience.
        </p>
        <p style={{ margin: 0 }}><b>Lesson for VyaparOne:</b> keep the cost per business low, earn from several streams, and avoid heavy balance-sheet or branch costs.</p>
      </div>

      <h2 style={{ margin: "22px 0 10px" }}>3. Revenue model and unit economics</h2>
      <div className="card">
        <p style={{ margin: "0 0 12px", color: "var(--muted)" }}>
          Change any assumption below. All figures are illustrative planning numbers for the course, not results from real customers.
        </p>
        <div className="form" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))" }}>
          <Field label="Subscription" suffix="₹/month" value={a.subscription} onChange={set("subscription")} step={50} />
          <Field label="Collections per business" suffix="₹/month" value={a.collectionsVolume} onChange={set("collectionsVolume")} step={50000} />
          <Field label="Share via payment links" suffix="%" pct value={a.gatewayShare} onChange={set("gatewayShare")} step={1} />
          <Field label="Net margin on those" suffix="%" pct value={a.gatewayMargin} onChange={set("gatewayMargin")} step={0.1} />
          <Field label="Businesses borrowing per year" suffix="%" pct value={a.borrowShare} onChange={set("borrowShare")} step={1} />
          <Field label="Average loan" suffix="₹" value={a.avgLoan} onChange={set("avgLoan")} step={50000} />
          <Field label="Lender referral fee" suffix="%" pct value={a.referralFee} onChange={set("referralFee")} step={0.1} />
          <Field label="Average balance held" suffix="₹" value={a.avgBalance} onChange={set("avgBalance")} step={25000} />
          <Field label="Bank revenue share on balance" suffix="% a year" pct value={a.balanceShare} onChange={set("balanceShare")} step={0.1} />
          <Field label="Variable cost per business" suffix="₹/month" value={a.variableCost} onChange={set("variableCost")} step={25} />
          <Field label="Cost to acquire a business" suffix="₹" value={a.cac} onChange={set("cac")} step={500} />
          <Field label="Monthly churn" suffix="%" pct value={a.monthlyChurn} onChange={set("monthlyChurn")} step={0.5} />
          <Field label="Fixed cost" suffix="₹/month" value={a.fixedCost} onChange={set("fixedCost")} step={100000} />
        </div>
      </div>

      <div className="grid g2" style={{ marginTop: 14 }}>
        <div className="card">
          <h3>Revenue per business per month</h3>
          <div style={{ marginTop: 10 }}>
            {e.streams.map((s) => (
              <div key={s.key} style={{ marginBottom: 8 }}>
                <div className="fact" style={{ border: 0, padding: "2px 0" }}><span>{s.label}</span><b>{inr(s.value)}</b></div>
                <div style={{ height: 8, background: "var(--surface2)", borderRadius: 4 }}>
                  <div style={{ height: 8, width: `${(s.value / maxStream) * 100}%`, background: "var(--accent)", borderRadius: 4 }} />
                </div>
              </div>
            ))}
            <div className="fact"><span>Total revenue</span><b>{inr(e.arpu)}</b></div>
            <div className="fact"><span>Less variable cost</span><b>{inr(a.variableCost)}</b></div>
            <div className="fact"><span>Contribution</span><b>{inr(e.contribution)} ({Math.round(e.grossMargin * 100)}%)</b></div>
          </div>
        </div>
        <div className="card">
          <h3>What it means</h3>
          <div style={{ marginTop: 6 }}>
            <div className="fact"><span>Expected life of a business</span><b>{e.lifetimeMonths ? `${e.lifetimeMonths.toFixed(0)} months` : "n/a"}</b></div>
            <div className="fact"><span>Lifetime value (contribution)</span><b>{inr(e.ltv)}</b></div>
            <div className="fact"><span>Value to acquisition cost</span>
              <b>{e.ltvToCac.toFixed(1)}x <span className={`pill ${e.ltvToCac >= 3 ? "p-good" : e.ltvToCac >= 1 ? "p-warn" : "p-bad"}`}>{e.ltvToCac >= 3 ? "Healthy" : e.ltvToCac >= 1 ? "Thin" : "Loses money"}</span></b></div>
            <div className="fact"><span>Months to earn back acquisition cost</span><b>{e.paybackMonths === null ? "never" : `${e.paybackMonths.toFixed(1)} months`}</b></div>
            <div className="fact"><span>Businesses needed to cover fixed cost</span><b>{e.breakEvenBusinesses === null ? "never" : e.breakEvenBusinesses.toLocaleString("en-IN")}</b></div>
            <div className="fact"><span>Monthly contribution at that scale</span><b>{e.breakEvenBusinesses ? lakh(e.breakEvenBusinesses * e.contribution) : "n/a"}</b></div>
          </div>
          <p className="note">A common rule of thumb is a value-to-cost ratio of 3 or more with payback inside 12 months. Try raising churn to 8% or acquisition cost to ₹8,000 to see how fast it breaks.</p>
        </div>
      </div>
      <div className="card" style={{ marginTop: 14 }}>
        <h3>Why four streams</h3>
        <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
          UPI collections earn nothing for a platform, so payment revenue comes only from card and netbanking links. A subscription gives steady income that does not depend on the owner borrowing.
          Loan referrals and balance sharing grow with trust and usage, and both require licensed partners. No single stream is enough alone.
        </p>
      </div>

      <h2 style={{ margin: "22px 0 10px" }}>4. What is built, what is sandbox, what needs a partner</h2>
      <div className="card">
        <div className="tw">
          <table>
            <thead><tr><th>Area</th><th>Status in this product</th><th>To go real</th></tr></thead>
            <tbody>
              <tr><td>Invoices, customer ledger, grades</td><td><span className="pill p-good">Working</span></td><td>Nothing external needed</td></tr>
              <tr><td>Bank statement import, auto-matching, cash flow</td><td><span className="pill p-good">Working</span></td><td>Account Aggregator feed instead of CSV upload</td></tr>
              <tr><td>Loan readiness score and offers</td><td><span className="pill p-warn">Illustrative</span></td><td>Real lender APIs, credit bureau data, RBI-compliant disclosures</td></tr>
              <tr><td>UPI QR and payment links</td><td><span className="pill p-warn">UPI live, links in test mode</span></td><td>Payment aggregator KYC to switch from test to live keys</td></tr>
              <tr><td>WhatsApp and SMS reminders</td><td><span className="pill p-warn">Click to send</span></td><td>WhatsApp Business API with approved templates for automatic sending</td></tr>
              <tr><td>Current account, cards, deposits</td><td><span className="pill p-mute">Not built</span></td><td>Partner bank under a BaaS agreement; the bank holds the licence and KYC</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <h2 style={{ margin: "22px 0 10px" }}>5. Risks and how the design handles them</h2>
      <div className="grid g2">
        <div className="card"><h3>Regulation</h3><p style={{ margin: "6px 0 0", color: "var(--muted)" }}>Deposits and lending sit with regulated partners only. Offers shown are labelled illustrative, and a lender must give its own disclosures. Personal data handling needs consent and purpose limits under the Digital Personal Data Protection Act, 2023.</p></div>
        <div className="card"><h3>Trust and data</h3><p style={{ margin: "6px 0 0", color: "var(--muted)" }}>Each business can see only its own rows (row level security). Passwords and sessions are handled by the auth provider. A full launch would add audit logs, role-based access and security testing.</p></div>
        <div className="card"><h3>Customer acquisition</h3><p style={{ margin: "6px 0 0", color: "var(--muted)" }}>Small owners are hard to reach one by one. Likely routes are CAs and accountants, distributors and trade bodies, who already hold the relationship and the invoices.</p></div>
        <div className="card"><h3>Partner dependence</h3><p style={{ margin: "6px 0 0", color: "var(--muted)" }}>Relying on one bank or lender is a risk. The plan is two or more partners per service so the product keeps working if one relationship ends.</p></div>
      </div>

      <h2 style={{ margin: "22px 0 10px" }}>6. Roadmap</h2>
      <div className="card">
        <div className="fact"><span><b>Phase 1 · Now</b></span><span style={{ textAlign: "right" }}>Receivables, reconciliation, cash flow, loan readiness, UPI and payment links, reminders</span></div>
        <div className="fact"><span><b>Phase 2</b></span><span style={{ textAlign: "right" }}>Account Aggregator data, GST data pull, lender integrations, automated reminders on WhatsApp</span></div>
        <div className="fact"><span><b>Phase 3</b></span><span style={{ textAlign: "right" }}>Partner-bank current account, working-capital line, invoice discounting through TReDS</span></div>
      </div>

      <h2 style={{ margin: "22px 0 10px" }}>Sources</h2>
      <ul className="note" style={{ marginTop: 0 }}>
        <li><a href={SRC.pib}>PIB: MSME backgrounder, June 2026</a> (registrations, GDP and employment share)</li>
        <li><a href={SRC.sidbi}>SIDBI: The MSME credit gap in India</a> (credit gap, 8.7 crore MSMEs, 41% formal credit access)</li>
        <li><a href={SRC.fpj}>Free Press Journal: delayed payments to MSMEs</a> (report by GAME, FISME and C2FO, November 2025)</li>
        <li><a href={SRC.open}>Inc42: Open FY25 financials</a></li>
        <li><a href={SRC.khata}>Indian Startup Times: Khatabook FY24 revenue</a></li>
      </ul>
      <p className="note">Unit economics in section 3 are assumptions chosen for illustration and are not sourced data.</p>
    </div>
  );
}
