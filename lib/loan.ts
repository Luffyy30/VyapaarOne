// Loan readiness score and illustrative lender offers. No imports.
// The score is a simple explainable model for demonstration. It is not a credit bureau score.

export type LoanInputs = {
  avgMonthlyInflow: number; // average bank credits over recent full months
  monthsOfData: number; // full months with any bank activity
  positiveMonths: number; // full months where money in exceeded money out
  onTimeRate: number | null; // share of paid invoices paid by the due date
  overdueShare: number; // overdue amount divided by total billed, 0..1
};

export type ScorePart = { key: string; label: string; value: number; weight: number; note: string };
export type ScoreResult = { score: number; band: string; parts: ScorePart[]; tips: string[] };

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const lakhs = (n: number) => (n >= 100000 ? (n / 100000).toFixed(2) + " L" : Math.round(n).toLocaleString("en-IN"));

export function computeScore(i: LoanInputs): ScoreResult {
  const parts: ScorePart[] = [
    {
      key: "revenue", label: "Money coming in", weight: 0.3,
      value: clamp(i.avgMonthlyInflow / 500000),
      note: i.avgMonthlyInflow > 0 ? `Average ₹${lakhs(i.avgMonthlyInflow)} a month. ₹5 L a month scores full marks.` : "No bank credits imported yet.",
    },
    {
      key: "consistency", label: "Months in profit", weight: 0.2,
      value: i.monthsOfData ? clamp(i.positiveMonths / i.monthsOfData) : 0,
      note: i.monthsOfData ? `${i.positiveMonths} of ${i.monthsOfData} full months received more than spent.` : "Needs at least one full month of bank data.",
    },
    {
      key: "collections", label: "Customers pay on time", weight: 0.2,
      value: i.onTimeRate === null ? 0.5 : clamp(i.onTimeRate),
      note: i.onTimeRate === null ? "Not enough paid invoices yet, counted as neutral." : `${Math.round(i.onTimeRate * 100)}% of paid invoices arrived by the due date.`,
    },
    {
      key: "overdue", label: "Low overdue balance", weight: 0.15,
      value: 1 - clamp(i.overdueShare / 0.3),
      note: `${Math.round(i.overdueShare * 100)}% of everything billed is overdue. Under 5% is healthy.`,
    },
    {
      key: "history", label: "Length of history", weight: 0.15,
      value: clamp(i.monthsOfData / 6),
      note: `${i.monthsOfData} full month${i.monthsOfData === 1 ? "" : "s"} of data. Six months scores full marks.`,
    },
  ];
  const raw = parts.reduce((s, p) => s + p.value * p.weight, 0);
  const score = Math.round(300 + 600 * raw);
  const band = score >= 750 ? "Excellent" : score >= 650 ? "Good" : score >= 550 ? "Fair" : "Building";

  const TIPS: Record<string, string> = {
    revenue: "Route more customer payments through the business account so inflow shows up in your statements.",
    consistency: "Watch months where spending beats income. Trim stock purchases or speed up collections.",
    collections: "Send reminders a few days before the due date and offer a small early-payment discount.",
    overdue: "Chase the oldest overdue invoices first. Lenders look closely at balances over 30 days late.",
    history: "Keep importing monthly statements. Six months of history is the usual minimum for a lender.",
  };
  const tips = [...parts].sort((a, b) => a.value - b.value).filter((p) => p.value < 0.75).slice(0, 3).map((p) => TIPS[p.key]);
  return { score, band, parts, tips };
}

export type Lender = { name: string; rate: number; multiple: number; feePct: number; minScore: number; kind: string };
export const LENDERS: Lender[] = [
  { name: "Partner Bank A", rate: 13.5, multiple: 3.0, feePct: 1.5, minScore: 650, kind: "Working capital loan" },
  { name: "NBFC B", rate: 17.0, multiple: 4.5, feePct: 2.0, minScore: 560, kind: "Business term loan" },
  { name: "NBFC C", rate: 15.0, multiple: 2.0, feePct: 1.0, minScore: 520, kind: "Invoice financing" },
];

export function emi(principal: number, annualRatePct: number, months: number): number {
  const r = annualRatePct / 1200;
  if (r === 0) return principal / months;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

export type Offer = {
  lender: Lender; eligible: boolean; reason: string; amount: number; emi: number; fee: number; capped: boolean;
};

export function offers(score: number, avgMonthlyInflow: number, requested: number, months: number): Offer[] {
  return LENDERS.map((l) => {
    const cap = avgMonthlyInflow * l.multiple;
    const eligible = score >= l.minScore && cap > 0;
    const amount = eligible ? Math.min(requested, cap) : 0;
    return {
      lender: l,
      eligible,
      reason: score < l.minScore ? `Needs a score of ${l.minScore}` : cap <= 0 ? "No bank inflow on record" : "",
      amount,
      emi: eligible ? emi(amount, l.rate, months) : 0,
      fee: eligible ? (amount * l.feePct) / 100 : 0,
      capped: eligible && amount < requested,
    };
  });
}
