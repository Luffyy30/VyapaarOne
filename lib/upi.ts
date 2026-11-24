// UPI payment link and reminder text helpers. No imports.

export const isValidUpi = (v: string) => /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z][a-zA-Z0-9]{1,}$/.test(v.trim());

export function buildUpiLink(p: { upiId: string; payee: string; amount: number; note: string }): string {
  const q = [
    `pa=${encodeURIComponent(p.upiId.trim())}`,
    `pn=${encodeURIComponent(p.payee.trim())}`,
    `am=${p.amount.toFixed(2)}`,
    `cu=INR`,
    `tn=${encodeURIComponent(p.note.trim())}`,
  ];
  return "upi://pay?" + q.join("&");
}

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

export function reminderText(p: {
  customer: string; number: string; amount: number; dueDate: string; daysLate: number; payee: string; upiId: string; payLink?: string | null;
}): string {
  const when =
    p.daysLate > 0 ? `was due on ${p.dueDate} and is now ${p.daysLate} day${p.daysLate === 1 ? "" : "s"} overdue`
    : p.daysLate === 0 ? "is due today" : `is due on ${p.dueDate}`;
  return (
    `Hello ${p.customer}, a gentle reminder from ${p.payee}. Invoice ${p.number} for ${inr(p.amount)} ${when}.\n` +
    `Please pay by UPI to ${p.upiId} and write ${p.number} in the note so we can match it quickly.\n` +
    (p.payLink ? `Or pay online by card, netbanking or UPI here: ${p.payLink}\n` : "") +
    `Thank you.`
  );
}
