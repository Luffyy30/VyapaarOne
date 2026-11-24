// Pure reconciliation logic: matches bank credits to open invoices.
// No imports, so it can be tested on its own.

export type Inv = { id: string; number: string; customer: string; amount: number; dueDate: string };
export type Txn = { id: string; narration: string; amount: number };
export type MatchStatus = "matched" | "review" | "unmatched";
export type MatchResult = { txnId: string; status: MatchStatus; invoiceId: string | null; note: string };

const GENERIC = new Set([
  "STORE", "STORES", "TRADERS", "TRADING", "GENERAL", "ENTERPRISES", "ENTERPRISE", "PROVISIONS",
  "RETAIL", "SUPERMART", "AGENCIES", "AGENCY", "MART", "SHOP", "SONS", "AND", "CO", "LTD", "PVT",
]);

const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

function nameTokens(customer: string): string[] {
  return customer
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter((t) => t.length >= 4 && !GENERIC.has(t));
}

function cents(n: number) {
  return Math.round(n * 100);
}

export function matchTxns(txns: Txn[], invoices: Inv[]): MatchResult[] {
  const used = new Set<string>();
  const out: MatchResult[] = [];

  for (const t of txns) {
    if (!(t.amount > 0)) {
      out.push({ txnId: t.id, status: "unmatched", invoiceId: null, note: "Not a credit" });
      continue;
    }
    const text = norm(t.narration);
    const open = invoices.filter((i) => !used.has(i.id));

    // 1. Invoice number in the narration (e.g. "INV1042" or "INV-1042")
    const byRef = open.find((i) => norm(i.number).length >= 4 && text.includes(norm(i.number)));
    if (byRef) {
      used.add(byRef.id);
      if (cents(byRef.amount) === cents(t.amount)) {
        out.push({ txnId: t.id, status: "matched", invoiceId: byRef.id, note: "Invoice number and amount match" });
      } else {
        const diff = byRef.amount - t.amount;
        out.push({
          txnId: t.id,
          status: "review",
          invoiceId: byRef.id,
          note: diff > 0 ? `Short by ${diff.toFixed(2)}` : `Excess of ${(-diff).toFixed(2)}`,
        });
      }
      continue;
    }

    // 2. Customer name in the narration
    const byName = open.filter((i) => nameTokens(i.customer).some((tok) => text.includes(tok)));
    if (byName.length) {
      const exact = byName
        .filter((i) => cents(i.amount) === cents(t.amount))
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
      if (exact) {
        used.add(exact.id);
        out.push({ txnId: t.id, status: "matched", invoiceId: exact.id, note: "Customer name and amount match" });
        continue;
      }
      const oldest = [...byName].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
      used.add(oldest.id);
      const diff = oldest.amount - t.amount;
      out.push({
        txnId: t.id,
        status: "review",
        invoiceId: oldest.id,
        note: diff > 0 ? `Part payment, short by ${diff.toFixed(2)}` : `Excess of ${(-diff).toFixed(2)}`,
      });
      continue;
    }

    // 3. Amount only is too weak to apply automatically
    out.push({ txnId: t.id, status: "unmatched", invoiceId: null, note: "No invoice number or customer name found" });
  }
  return out;
}
