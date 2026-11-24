export const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
export const lakh = (n: number) => (n >= 100000 ? "₹" + (n / 100000).toFixed(2) + " L" : inr(n));

export function todayStr(): string {
  const d = new Date();
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Whole days between a due date and today. Positive means overdue. */
export function daysLate(due: string, today: string = todayStr()): number {
  const a = Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10));
  const b = Date.UTC(+due.slice(0, 4), +due.slice(5, 7) - 1, +due.slice(8, 10));
  return Math.round((a - b) / 864e5);
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const fmtDate = (s: string) => `${s.slice(8, 10)} ${MONTH_NAMES[+s.slice(5, 7) - 1]} ${s.slice(0, 4)}`;

/** Add (or subtract) whole days from a YYYY-MM-DD string. */
export function addDays(date: string, n: number): string {
  const t = Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10)) + n * 864e5;
  return new Date(t).toISOString().slice(0, 10);
}

/** "2026-11" becomes "Nov 2026". */
export const monthLabel = (ym: string) => `${MONTH_NAMES[+ym.slice(5, 7) - 1]} ${ym.slice(0, 4)}`;
