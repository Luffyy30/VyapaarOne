"use client";
import { useCallback, useEffect, useState } from "react";
import { sb } from "@/lib/supabase";
import { inr, fmtDate } from "@/lib/format";
import { parseStatement } from "@/lib/statement";
import { matchTxns } from "@/lib/match";
import { categorize } from "@/lib/categorize";
import type { BankTxn, Invoice } from "@/lib/types";
import { useSession } from "@/components/Session";

export default function Reconcile() {
  const { userId } = useSession();
  const [txns, setTxns] = useState<BankTxn[] | null>(null);
  const [inv, setInv] = useState<Invoice[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const a = await sb().from("bank_txns").select("*").order("txn_date", { ascending: false });
    const b = await sb().from("invoices").select("*").order("due_date");
    if (a.error) setErr(a.error.message);
    setTxns((a.data ?? []) as BankTxn[]);
    setInv((b.data ?? []) as Invoice[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const byId = new Map(inv.map((i) => [i.id, i]));

  async function runMatch() {
    const openInv = inv.filter((i) => !i.paid_at).map((i) => ({
      id: i.id, number: i.number, customer: i.customer, amount: Number(i.amount), dueDate: i.due_date,
    }));
    const pending = (await sb().from("bank_txns").select("*").eq("status", "unmatched")).data as BankTxn[] | null;
    const results = matchTxns((pending ?? []).map((t) => ({ id: t.id, narration: t.narration, amount: Number(t.amount) })), openInv);
    let matched = 0, review = 0;
    for (const r of results) {
      if (r.status === "unmatched") continue;
      const t = (pending ?? []).find((x) => x.id === r.txnId)!;
      const u = await sb().from("bank_txns").update({ status: r.status, invoice_id: r.invoiceId }).eq("id", r.txnId);
      if (u.error) throw new Error(u.error.message);
      if (r.status === "matched" && r.invoiceId) {
        const p = await sb().from("invoices").update({ paid_at: new Date(t.txn_date + "T12:00:00").toISOString() }).eq("id", r.invoiceId);
        if (p.error) throw new Error(p.error.message);
        matched++;
      } else review++;
    }
    return { matched, review };
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr(null); setOk(null); setBusy(true);
    try {
      const parsed = parseStatement(await file.text());
      if (parsed.error) throw new Error(parsed.error);
      if (!parsed.txns.length && !parsed.debits.length) throw new Error("No credit or debit rows found in that file.");
      if (parsed.txns.length) {
        const rows = parsed.txns.map((t) => ({ owner_id: userId, txn_date: t.date, narration: t.narration, amount: t.amount }));
        const ins = await sb().from("bank_txns").upsert(rows, { onConflict: "owner_id,txn_date,narration,amount", ignoreDuplicates: true });
        if (ins.error) throw new Error(ins.error.message);
      }
      if (parsed.debits.length) {
        const rows = parsed.debits.map((t) => ({ owner_id: userId, txn_date: t.date, narration: t.narration, amount: t.amount, category: categorize(t.narration) }));
        const ex = await sb().from("expenses").upsert(rows, { onConflict: "owner_id,txn_date,narration,amount", ignoreDuplicates: true });
        if (ex.error) throw new Error(ex.error.code === "42P01" ? "The expenses table is missing. Run supabase/migration-2.sql in Supabase first." : ex.error.message);
      }
      await load();
      const { matched, review } = await runMatch();
      setOk(`Read ${parsed.txns.length} credits and ${parsed.debits.length} expenses (${parsed.skipped} other rows skipped). Matched ${matched}, ${review} need your review.`);
      await load();
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Import failed.");
    }
    setBusy(false);
  }

  async function confirm(t: BankTxn) {
    if (!t.invoice_id) return;
    const a = await sb().from("bank_txns").update({ status: "matched" }).eq("id", t.id);
    const b = await sb().from("invoices").update({ paid_at: new Date(t.txn_date + "T12:00:00").toISOString() }).eq("id", t.invoice_id);
    if (a.error || b.error) setErr((a.error ?? b.error)!.message); else load();
  }

  async function unlink(t: BankTxn) {
    const a = await sb().from("bank_txns").update({ status: "unmatched", invoice_id: null }).eq("id", t.id);
    if (a.error) setErr(a.error.message); else load();
  }

  async function link(t: BankTxn, invoiceId: string) {
    if (!invoiceId) return;
    const a = await sb().from("bank_txns").update({ status: "review", invoice_id: invoiceId }).eq("id", t.id);
    if (a.error) setErr(a.error.message); else load();
  }

  const openInv = inv.filter((i) => !i.paid_at);

  return (
    <>
      {err && <div className="err">{err}</div>}
      {ok && <div className="okmsg">{ok}</div>}
      <div className="card">
        <div className="sec">
          <div>
            <h2>Import bank statement</h2>
            <p>Upload a CSV with date, narration, debit and credit columns. Credits are matched to open invoices by invoice number, then customer name and amount. Debits become categorised expenses on the Cash flow page.</p>
          </div>
          <label className="pri" style={{ display: "inline-block", padding: "7px 12px", borderRadius: 8, cursor: busy ? "default" : "pointer", margin: 0, color: "var(--accent-fg)", background: "var(--accent)", fontSize: 14, fontWeight: 500, opacity: busy ? 0.5 : 1 }}>
            {busy ? "Working" : "Choose CSV file"}
            <input type="file" accept=".csv,text/csv" onChange={onFile} disabled={busy} style={{ display: "none" }} />
          </label>
        </div>
        <p className="note" style={{ margin: 0 }}>Re-importing the same file is safe. Duplicate rows are ignored.</p>
      </div>
      <div className="card" style={{ marginTop: 14 }}>
        <div className="sec"><h2>Bank credits</h2></div>
        {!txns ? <div className="empty">Loading</div> : txns.length === 0 ? <div className="empty">No credits imported yet.</div> : (
          <div className="tw">
            <table>
              <thead><tr><th>Date</th><th>Bank narration</th><th className="n">Amount</th><th>Matched to</th><th></th></tr></thead>
              <tbody>
                {txns.map((t) => {
                  const i = t.invoice_id ? byId.get(t.invoice_id) : undefined;
                  return (
                    <tr key={t.id}>
                      <td>{fmtDate(t.txn_date)}</td><td>{t.narration}</td><td className="n">{inr(Number(t.amount))}</td>
                      <td>
                        {t.status === "matched" && i && <span className="pill p-good">{i.number} · {i.customer}</span>}
                        {t.status === "review" && i && <span className="pill p-warn">Review: {i.number} ({inr(Number(i.amount))})</span>}
                        {t.status === "unmatched" && <span className="pill p-mute">Not matched</span>}
                      </td>
                      <td>
                        <div className="row-actions">
                          {t.status === "review" && <button className="sm" onClick={() => confirm(t)}>Confirm as paid</button>}
                          {t.status !== "unmatched" && <button className="sm" onClick={() => unlink(t)}>Unlink</button>}
                          {t.status === "unmatched" && openInv.length > 0 && (
                            <select aria-label="Link to invoice" style={{ width: 150, padding: "4px 6px", fontSize: 12 }} value="" onChange={(e) => link(t, e.target.value)}>
                              <option value="">Link to invoice</option>
                              {openInv.map((x) => <option key={x.id} value={x.id}>{x.number} · {x.customer}</option>)}
                            </select>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="note">Short or excess payments are never applied automatically. You confirm them first.</p>
      </div>
    </>
  );
}
