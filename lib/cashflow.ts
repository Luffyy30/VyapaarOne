// Monthly totals, category totals and a simple 30-day forecast. No imports.

export type Flow = { date: string; amount: number };
export type MonthRow = { month: string; in: number; out: number; net: number };

const monthOf = (d: string) => d.slice(0, 7);

export function lastMonths(today: string, n: number): string[] {
  let y = +today.slice(0, 4);
  let m = +today.slice(5, 7);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    out.unshift(`${y}-${String(m).padStart(2, "0")}`);
    m--;
    if (m === 0) { m = 12; y--; }
  }
  return out;
}

export function monthlySeries(credits: Flow[], debits: Flow[], today: string, n = 6): MonthRow[] {
  return lastMonths(today, n).map((month) => {
    const i = credits.filter((c) => monthOf(c.date) === month).reduce((s, c) => s + c.amount, 0);
    const o = debits.filter((d) => monthOf(d.date) === month).reduce((s, d) => s + d.amount, 0);
    return { month, in: i, out: o, net: i - o };
  });
}

export function categoryTotals(items: { date: string; amount: number; category: string }[], month: string) {
  const m = new Map<string, number>();
  for (const e of items) if (monthOf(e.date) === month) m.set(e.category, (m.get(e.category) ?? 0) + e.amount);
  return [...m.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
}

export type OpenInv = { customer: string; amount: number; dueDate: string };

const dayNum = (d: string) => Math.floor(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 864e5);

/**
 * Rough 30-day outlook. Open invoices due within 30 days (or already overdue) are counted at the customer's
 * on-time rate (75% if unknown, halved when more than 30 days overdue). Outflow is the average of the last
 * three full months that have any spending (the current, unfinished month is left out).
 */
export function forecast30(
  open: OpenInv[],
  onTimeRate: Map<string, number | null>,
  months: MonthRow[],
  today: string,
) {
  const t = dayNum(today);
  let expectedIn = 0;
  for (const i of open) {
    const days = dayNum(i.dueDate) - t;
    if (days > 30) continue;
    let p = onTimeRate.get(i.customer.trim().toLowerCase().replace(/\s+/g, " ")) ?? 0.75;
    if (days < -30) p *= 0.5;
    expectedIn += i.amount * p;
  }
  const spend = months.filter((m) => m.out > 0 && m.month !== today.slice(0, 7)).slice(-3);
  const expectedOut = spend.length ? spend.reduce((s, m) => s + m.out, 0) / spend.length : 0;
  return { expectedIn, expectedOut, net: expectedIn - expectedOut };
}
