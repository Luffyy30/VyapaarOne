// Parses a bank statement CSV into credit transactions. No imports.

export type ParsedTxn = { date: string; narration: string; amount: number };
export type ParseResult = { txns: ParsedTxn[]; debits: ParsedTxn[]; skipped: number; error?: string };

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  return rows;
}

const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

export function parseDate(s: string): string | null {
  const t = s.trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = t.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? "20" + m[3] : m[3];
    return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  m = t.match(/^(\d{1,2})[ -]([A-Za-z]{3})[a-z]*[ -](\d{2,4})$/);
  if (m && MONTHS[m[2].toLowerCase()]) {
    const y = m[3].length === 2 ? "20" + m[3] : m[3];
    return `${y}-${MONTHS[m[2].toLowerCase()]}-${m[1].padStart(2, "0")}`;
  }
  return null;
}

export function parseAmount(s: string): number | null {
  const t = s.replace(/[₹,\s]/g, "").replace(/^Rs\.?/i, "");
  if (t === "" || !/^-?\d+(\.\d+)?$/.test(t)) return null;
  return parseFloat(t);
}

export function parseStatement(text: string): ParseResult {
  const rows = parseCsv(text);
  const hi = rows.findIndex((r) => {
    const j = r.join("|").toLowerCase();
    return /date/.test(j) && /(narration|description|particulars|remarks)/.test(j) && /(credit|deposit|amount)/.test(j);
  });
  if (hi < 0) {
    return { txns: [], debits: [], skipped: 0, error: "Could not find a header row with date, narration and credit columns." };
  }
  const h = rows[hi].map((x) => x.trim().toLowerCase());
  const di = h.findIndex((x) => x.includes("date"));
  const ni = h.findIndex((x) => /narration|description|particulars|remarks/.test(x));
  let ci = h.findIndex((x) => /credit|deposit/.test(x));
  if (ci < 0) ci = h.findIndex((x) => x.includes("amount"));

  const di2 = h.findIndex((x) => /debit|withdraw/.test(x));
  const txns: ParsedTxn[] = [];
  const debits: ParsedTxn[] = [];
  let skipped = 0;
  for (const r of rows.slice(hi + 1)) {
    const date = parseDate(r[di] ?? "");
    const amt = parseAmount(r[ci] ?? "");
    const narration = (r[ni] ?? "").trim();
    const dr = di2 >= 0 ? parseAmount(r[di2] ?? "") : null;
    if (date && narration && amt !== null && amt > 0) txns.push({ date, narration, amount: amt });
    else if (date && narration && dr !== null && dr > 0) debits.push({ date, narration, amount: dr });
    else skipped++;
  }
  return { txns, debits, skipped };
}
