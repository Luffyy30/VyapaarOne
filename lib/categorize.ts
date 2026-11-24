// Guesses an expense category from a bank narration. No imports.

export const CATEGORIES = [
  "Rent", "Salaries", "GST & taxes", "Utilities", "Transport", "Loan & bank charges", "Stock purchase", "Other",
] as const;
export type Category = (typeof CATEGORIES)[number];

const RULES: [Category, RegExp][] = [
  ["Rent", /\brent\b|landlord|\blease\b/i],
  ["Salaries", /salary|salaries|payroll|wages|\bstaff\b/i],
  ["GST & taxes", /\bgst\b|gstn|\btds\b|income tax|\bcbdt\b|advance tax|\btax\b/i],
  ["Utilities", /electric|bescom|mseb|msedcl|adani|tata power|water bill|broadband|airtel|\bjio\b|vodafone|internet|recharge/i],
  ["Transport", /transport|freight|logistic|cargo|diesel|petrol|\bfuel\b|\btoll\b|fastag|courier|delhivery|bluedart/i],
  ["Loan & bank charges", /charges|\bfee\b|interest|\bemi\b|\bloan\b|penalty/i],
  ["Stock purchase", /purchase|supplier|\bstock\b|wholesale|goods|material|traders|enterprises|agency|agencies|supply|distribut/i],
];

export function categorize(narration: string): Category {
  for (const [cat, re] of RULES) if (re.test(narration)) return cat;
  return "Other";
}
