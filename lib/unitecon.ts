// Illustrative unit economics for VyaparOne. No imports.
// Every input is an assumption the reader can change. Nothing here is a forecast.

export type Assumptions = {
  subscription: number;      // Rs per business per month
  collectionsVolume: number; // Rs collected per business per month
  gatewayShare: number;      // share of collections via card/netbanking links (0 to 1). UPI earns no fee.
  gatewayMargin: number;     // net margin on those payments (0 to 1)
  borrowShare: number;       // share of businesses that take a loan in a year (0 to 1)
  avgLoan: number;          // Rs
  referralFee: number;       // fee paid by the lender on disbursal (0 to 1)
  avgBalance: number;        // Rs average balance held per business with the partner bank
  balanceShare: number;      // yearly revenue share on balances from the partner bank (0 to 1)
  variableCost: number;      // Rs per business per month: infra, API calls, support
  cac: number;               // Rs to acquire one business
  monthlyChurn: number;      // share of businesses lost each month (0 to 1)
  fixedCost: number;         // Rs per month: team, compliance, tools
};

export const DEFAULTS: Assumptions = {
  subscription: 300,
  collectionsVolume: 300000,
  gatewayShare: 0.15,
  gatewayMargin: 0.008,
  borrowShare: 0.15,
  avgLoan: 500000,
  referralFee: 0.015,
  avgBalance: 100000,
  balanceShare: 0.005,
  variableCost: 150,
  cac: 5000,
  monthlyChurn: 0.05,
  fixedCost: 1500000,
};

export type Economics = {
  streams: { key: string; label: string; value: number }[];
  arpu: number;
  contribution: number;
  grossMargin: number;
  lifetimeMonths: number;
  ltv: number;
  ltvToCac: number;
  paybackMonths: number | null;
  breakEvenBusinesses: number | null;
};

const num = (n: number) => (Number.isFinite(n) ? n : 0);

export function compute(a: Assumptions): Economics {
  const streams = [
    { key: "sub", label: "Subscription", value: num(a.subscription) },
    { key: "pay", label: "Payment links", value: num(a.collectionsVolume * a.gatewayShare * a.gatewayMargin) },
    { key: "loan", label: "Loan referrals", value: num((a.borrowShare * a.avgLoan * a.referralFee) / 12) },
    { key: "float", label: "Balance share", value: num((a.avgBalance * a.balanceShare) / 12) },
  ];
  const arpu = streams.reduce((s, x) => s + x.value, 0);
  const contribution = arpu - num(a.variableCost);
  const grossMargin = arpu > 0 ? contribution / arpu : 0;
  const lifetimeMonths = a.monthlyChurn > 0 ? 1 / a.monthlyChurn : 0;
  const ltv = contribution > 0 ? contribution * lifetimeMonths : 0;
  const ltvToCac = a.cac > 0 ? ltv / a.cac : 0;
  const paybackMonths = contribution > 0 ? a.cac / contribution : null;
  const breakEvenBusinesses = contribution > 0 ? Math.ceil(a.fixedCost / contribution) : null;
  return { streams, arpu, contribution, grossMargin, lifetimeMonths, ltv, ltvToCac, paybackMonths, breakEvenBusinesses };
}
