// Per-customer payment behaviour from invoices. No imports.

export type LInv = { customer: string; amount: number; dueDate: string; paidAt: string | null };
export type Grade = "A" | "B" | "C" | "New";
export type CustomerStat = {
  customer: string;
  invoices: number;
  billed: number;
  outstanding: number;
  overdueAmount: number;
  overdueCount: number;
  paidCount: number;
  onTimeRate: number | null; // 0..1, null until at least one paid invoice
  avgDaysLate: number | null; // average over paid invoices, negative means early
  grade: Grade;
};

const dayNum = (d: string) => Math.floor(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 864e5);
const key = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export function customerStats(invoices: LInv[], today: string): CustomerStat[] {
  const groups = new Map<string, { name: string; list: LInv[] }>();
  for (const i of invoices) {
    const k = key(i.customer);
    if (!groups.has(k)) groups.set(k, { name: i.customer.trim(), list: [] });
    groups.get(k)!.list.push(i);
  }
  const t = dayNum(today);
  const out: CustomerStat[] = [];
  for (const { name, list } of groups.values()) {
    const paid = list.filter((i) => i.paidAt);
    const open = list.filter((i) => !i.paidAt);
    const late = paid.map((i) => dayNum((i.paidAt as string).slice(0, 10)) - dayNum(i.dueDate));
    const overdue = open.filter((i) => t - dayNum(i.dueDate) > 0);
    const maxOverdueDays = overdue.reduce((m, i) => Math.max(m, t - dayNum(i.dueDate)), 0);
    const onTimeRate = paid.length ? late.filter((d) => d <= 0).length / paid.length : null;
    const avgDaysLate = paid.length ? late.reduce((s, d) => s + d, 0) / paid.length : null;
    let grade: Grade = "New";
    if (paid.length >= 2 && onTimeRate !== null) {
      if (onTimeRate >= 0.8 && overdue.length === 0) grade = "A";
      else if (onTimeRate >= 0.5 && maxOverdueDays <= 30) grade = "B";
      else grade = "C";
    }
    out.push({
      customer: name,
      invoices: list.length,
      billed: list.reduce((s, i) => s + i.amount, 0),
      outstanding: open.reduce((s, i) => s + i.amount, 0),
      overdueAmount: overdue.reduce((s, i) => s + i.amount, 0),
      overdueCount: overdue.length,
      paidCount: paid.length,
      onTimeRate,
      avgDaysLate,
      grade,
    });
  }
  return out.sort((a, b) => b.outstanding - a.outstanding || b.billed - a.billed);
}
