"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { sb } from "@/lib/supabase";
import { inr, lakh, monthLabel, todayStr } from "@/lib/format";
import { monthlySeries, categoryTotals, forecast30 } from "@/lib/cashflow";
import { customerStats } from "@/lib/ledger";
import type { BankTxn, Expense, Invoice } from "@/lib/types";

function niceMax(v: number) {
  if (v <= 0) return 100000;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

export default function CashFlow() {
  const [credits, setCredits] = useState<BankTxn[] | null>(null);
  const [exp, setExp] = useState<Expense[]>([]);
  const [inv, setInv] = useState<Invoice[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const today = todayStr();

  useEffect(() => {
    (async () => {
      const a = await sb().from("bank_txns").select("*");
      const b = await sb().from("expenses").select("*");
      const c = await sb().from("invoices").select("*");
      if (a.error) setErr(a.error.message);
      if (b.error) setErr(b.error.code === "42P01" ? "The expenses table is missing. Run supabase/migration-2.sql in Supabase, then reload." : b.error.message);
      setCredits((a.data ?? []) as BankTxn[]);
      setExp((b.data ?? []) as Expense[]);
      setInv((c.data ?? []) as Invoice[]);
    })();
  }, []);

  const series = useMemo(
    () => monthlySeries(
      (credits ?? []).map((t) => ({ date: t.txn_date, amount: Number(t.amount) })),
      exp.map((e) => ({ date: e.txn_date, amount: Number(e.amount) })),
      today, 6),
    [credits, exp, today],
  );

  const month = pick ?? [...series].reverse().find((m) => m.in > 0 || m.out > 0)?.month ?? series[series.length - 1].month;
  const cats = useMemo(
    () => categoryTotals(exp.map((e) => ({ date: e.txn_date, amount: Number(e.amount), category: e.category })), month),
    [exp, month],
  );

  const fc = useMemo(() => {
    const stats = customerStats(inv.map((i) => ({ customer: i.customer, amount: Number(i.amount), dueDate: i.due_date, paidAt: i.paid_at })), today);
    const rates = new Map(stats.map((s) => [s.customer.trim().toLowerCase().replace(/\s+/g, " "), s.onTimeRate]));
    const open = inv.filter((i) => !i.paid_at).map((i) => ({ customer: i.customer, amount: Number(i.amount), dueDate: i.due_date }));
    return forecast30(open, rates, series, today);
  }, [inv, series, today]);

  if (!credits) return <div className="empty">Loading</div>;

  const hasData = credits.length > 0 || exp.length > 0;
  const cur = series.find((m) => m.month === month)!;
  const mlabel = monthLabel(month) + (month === today.slice(0, 7) ? " so far" : "");
  const max = niceMax(Math.max(...series.map((m) => Math.max(m.in, m.out))));
  const W = 600, H = 220, pl = 46, pb = 26, pt = 10;
  const gap = (W - pl) / series.length, bw = Math.min(26, gap / 2 - 4);
  const y = (v: number) => H - pb - (v / max) * (H - pb - pt);
  const catMax = cats[0]?.amount ?? 1;
  const catTotal = cats.reduce((s, c) => s + c.amount, 0);

  return (
    <>
      {err && <div className="err">{err}</div>}
      {!hasData ? (
        <div className="card empty">
          <h2 style={{ color: "var(--fg)", marginBottom: 6 }}>No bank data yet</h2>
          Import a bank statement on the <Link href="/reconcile">Reconcile</Link> tab. Use <code>sample-history.csv</code> from the project folder to see six months of example data.
        </div>
      ) : (
        <>
          <div className="grid g4">
            <div className="card kpi"><div className="l">Money in, {mlabel}</div><div className="v">{lakh(cur.in)}</div><div className="s">Bank credits</div></div>
            <div className="card kpi"><div className="l">Money out, {mlabel}</div><div className="v">{lakh(cur.out)}</div><div className="s">Categorised debits</div></div>
            <div className="card kpi"><div className="l">Net, {mlabel}</div><div className="v" style={{ color: cur.net < 0 ? "var(--bad)" : "var(--good)" }}>{cur.net < 0 ? "-" : ""}{lakh(Math.abs(cur.net))}</div><div className="s">{cur.net < 0 ? "Spent more than received" : "Received more than spent"}</div></div>
            <div className="card kpi"><div className="l">Next 30 days (estimate)</div><div className="v" style={{ color: fc.net < 0 ? "var(--bad)" : "var(--good)" }}>{fc.net < 0 ? "-" : ""}{lakh(Math.abs(fc.net))}</div><div className="s">{lakh(fc.expectedIn)} in, {lakh(fc.expectedOut)} out</div></div>
          </div>

          <div className="grid g2" style={{ marginTop: 14 }}>
            <div className="card">
              <div className="sec"><h2>Last six months</h2></div>
              <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Money in and out for each of the last six months" style={{ width: "100%", height: "auto", display: "block" }}>
                {[0, 0.25, 0.5, 0.75, 1].map((f) => (
                  <g key={f}>
                    <line x1={pl} x2={W} y1={y(max * f)} y2={y(max * f)} stroke="var(--line)" />
                    <text x={pl - 6} y={y(max * f) + 4} textAnchor="end" fontSize="10" fill="var(--muted)">{max * f >= 100000 ? (max * f / 100000).toFixed(max * f % 100000 ? 1 : 0) + "L" : Math.round(max * f / 1000) + "k"}</text>
                  </g>
                ))}
                {series.map((m, i) => {
                  const cx = pl + i * gap + gap / 2;
                  return (
                    <g key={m.month}>
                      <rect x={cx - bw - 2} y={y(m.in)} width={bw} height={H - pb - y(m.in)} rx="3" fill="var(--bar-in)" />
                      <rect x={cx + 2} y={y(m.out)} width={bw} height={H - pb - y(m.out)} rx="3" fill="var(--bar-out)" />
                      <text x={cx} y={H - 8} textAnchor="middle" fontSize="11" fill={m.month === month ? "var(--fg)" : "var(--muted)"} fontWeight={m.month === month ? 600 : 400}>{monthLabel(m.month).slice(0, 3)}</text>
                    </g>
                  );
                })}
              </svg>
              <div className="legend"><span style={{ ["--c" as string]: "var(--bar-in)" }}>Money in</span><span style={{ ["--c" as string]: "var(--bar-out)" }}>Money out</span></div>
            </div>

            <div className="card">
              <div className="sec">
                <h2>Where the money went</h2>
                <div style={{ width: 130 }}>
                  <label htmlFor="mon" className="sr">Month</label>
                  <select id="mon" value={month} onChange={(e) => setPick(e.target.value)}>
                    {series.map((m) => <option key={m.month} value={m.month}>{monthLabel(m.month)}</option>)}
                  </select>
                </div>
              </div>
              {cats.length === 0 ? <div className="empty">No expenses in {mlabel}.</div> : (
                <div className="grid" style={{ gap: 12 }}>
                  {cats.map((c) => (
                    <div key={c.category}>
                      <div className="fact" style={{ border: 0, padding: "0 0 4px" }}>
                        <span>{c.category}</span>
                        <span style={{ fontVariantNumeric: "tabular-nums" }}>{inr(c.amount)} · {Math.round((c.amount / catTotal) * 100)}%</span>
                      </div>
                      <div className="bar"><i style={{ width: (c.amount / catMax) * 100 + "%" }} /></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <p className="note">The 30-day estimate counts open invoices due within 30 days at each customer&apos;s on-time rate (75% when unknown), and uses your average spending over the last three months. It is a guide, not a promise.</p>
        </>
      )}
    </>
  );
}
