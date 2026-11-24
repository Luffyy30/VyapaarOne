"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { sb } from "@/lib/supabase";
import { inr, lakh, daysLate, fmtDate, addDays, todayStr } from "@/lib/format";
import type { Invoice, BankTxn } from "@/lib/types";
import { sampleInvoices, SAMPLE_NUMBERS } from "@/lib/sample";
import { useSession } from "@/components/Session";

export default function Dashboard() {
  const { userId } = useSession();
  const [inv, setInv] = useState<Invoice[] | null>(null);
  const [txns, setTxns] = useState<BankTxn[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [confirm, setConfirm] = useState<"inv" | "bank" | null>(null);

  async function loadSample() {
    setErr(null);
    const r = await sb().from("invoices").upsert(sampleInvoices(userId), { onConflict: "owner_id,number", ignoreDuplicates: true });
    if (r.error) setErr(r.error.message); else setTick((n) => n + 1);
  }

  async function clearData(kind: "inv" | "bank") {
    setErr(null);
    if (kind === "inv") {
      const r = await sb().from("invoices").delete().in("number", SAMPLE_NUMBERS);
      if (r.error) setErr(r.error.message);
    } else {
      const a = await sb().from("bank_txns").delete().not("id", "is", null);
      const b = await sb().from("expenses").delete().not("id", "is", null);
      if (a.error) setErr(a.error.message);
      if (b.error && b.error.code !== "42P01") setErr(b.error.message);
    }
    setConfirm(null);
    setTick((n) => n + 1);
  }

  useEffect(() => {
    (async () => {
      const a = await sb().from("invoices").select("*").order("due_date");
      const b = await sb().from("bank_txns").select("*");
      if (a.error) setErr(a.error.message);
      if (b.error) setErr(b.error.message);
      setInv((a.data ?? []) as Invoice[]);
      setTxns((b.data ?? []) as BankTxn[]);
    })();
  }, [tick]);

  if (!inv) return <div className="empty">Loading</div>;

  const open = inv.filter((i) => !i.paid_at);
  const overdue = open.filter((i) => daysLate(i.due_date) > 0);
  const month = new Date().toISOString().slice(0, 7);
  const collected = inv.filter((i) => i.paid_at && i.paid_at.slice(0, 7) === month).reduce((s, i) => s + Number(i.amount), 0);
  const sum = (a: Invoice[]) => a.reduce((s, i) => s + Number(i.amount), 0);
  const since = addDays(todayStr(), -45);
  const toMatch = txns.filter((t) => t.status !== "matched" && t.txn_date >= since).length;
  const hasSample = inv.some((i) => SAMPLE_NUMBERS.includes(i.number));

  return (
    <>
      {err && <div className="err">{err}</div>}
      <div className="grid g4">
        <div className="card kpi"><div className="l">To collect</div><div className="v">{lakh(sum(open))}</div><div className="s">{open.length} open invoices</div></div>
        <div className="card kpi"><div className="l">Overdue</div><div className="v" style={{ color: "var(--bad)" }}>{lakh(sum(overdue))}</div><div className="s">{overdue.length} invoices past due</div></div>
        <div className="card kpi"><div className="l">Collected this month</div><div className="v">{lakh(collected)}</div><div className="s">From matched payments</div></div>
        <div className="card kpi"><div className="l">Credits to match</div><div className="v">{toMatch}</div><div className="s">Last 45 days · <Link href="/reconcile">Open reconcile</Link></div></div>
      </div>
      <div className="card" style={{ marginTop: 14 }}>
        <div className="sec"><h2>Most overdue</h2><Link href="/invoices">All invoices</Link></div>
        {overdue.length === 0 ? (
          <div className="empty">{inv.length === 0 ? (<>No invoices yet. Create one on the Invoices tab, or <button className="sm" onClick={loadSample}>load sample data</button> to see how everything looks.</>) : "Nothing is overdue."}</div>
        ) : (
          <div className="tw">
            <table>
              <thead><tr><th>Invoice</th><th>Customer</th><th>Due</th><th className="n">Amount</th><th>Status</th></tr></thead>
              <tbody>
                {[...overdue].sort((a, b) => daysLate(b.due_date) - daysLate(a.due_date)).slice(0, 5).map((i) => (
                  <tr key={i.id}>
                    <td>{i.number}</td><td>{i.customer}</td><td>{fmtDate(i.due_date)}</td>
                    <td className="n">{inr(Number(i.amount))}</td>
                    <td><span className="pill p-bad">{daysLate(i.due_date)} days overdue</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {(hasSample || txns.length > 0) && (
        <div className="card" style={{ marginTop: 14 }}>
          <div className="sec">
            <div>
              <h2>Demo and imported data</h2>
              <p>Remove the demo invoices or imported bank rows when you are ready to use real data. Your own invoices are never touched by the first button.</p>
            </div>
          </div>
          <div className="row-actions" style={{ justifyContent: "flex-start" }}>
            {hasSample && (confirm === "inv" ? (
              <>
                <button className="pri sm" onClick={() => clearData("inv")}>Yes, remove demo invoices</button>
                <button className="sm" onClick={() => setConfirm(null)}>Cancel</button>
              </>
            ) : <button className="sm" onClick={() => setConfirm("inv")}>Remove demo invoices</button>)}
            {txns.length > 0 && (confirm === "bank" ? (
              <>
                <button className="pri sm" onClick={() => clearData("bank")}>Yes, delete all imported bank rows</button>
                <button className="sm" onClick={() => setConfirm(null)}>Cancel</button>
              </>
            ) : <button className="sm" onClick={() => setConfirm("bank")}>Delete imported bank data</button>)}
          </div>
        </div>
      )}
    </>
  );
}
