"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { sb } from "@/lib/supabase";
import { inr, lakh, todayStr } from "@/lib/format";
import { monthlySeries } from "@/lib/cashflow";
import { customerStats } from "@/lib/ledger";
import { computeScore, offers } from "@/lib/loan";
import type { BankTxn, Expense, Invoice } from "@/lib/types";

export default function Loans() {
  const [credits, setCredits] = useState<BankTxn[] | null>(null);
  const [exp, setExp] = useState<Expense[]>([]);
  const [inv, setInv] = useState<Invoice[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [req, setReq] = useState(500000);
  const [ten, setTen] = useState(12);
  const today = todayStr();

  useEffect(() => {
    (async () => {
      const a = await sb().from("bank_txns").select("*");
      const b = await sb().from("expenses").select("*");
      const c = await sb().from("invoices").select("*");
      if (a.error) setErr(a.error.message);
      if (b.error && b.error.code !== "42P01") setErr(b.error.message);
      setCredits((a.data ?? []) as BankTxn[]);
      setExp((b.data ?? []) as Expense[]);
      setInv((c.data ?? []) as Invoice[]);
    })();
  }, []);

  const model = useMemo(() => {
    const series = monthlySeries(
      (credits ?? []).map((t) => ({ date: t.txn_date, amount: Number(t.amount) })),
      exp.map((e) => ({ date: e.txn_date, amount: Number(e.amount) })),
      today, 6,
    );
    const full = series.filter((m) => m.month !== today.slice(0, 7) && (m.in > 0 || m.out > 0));
    const recentIn = full.filter((m) => m.in > 0).slice(-3);
    const avgInflow = recentIn.length ? recentIn.reduce((s, m) => s + m.in, 0) / recentIn.length : 0;
    const stats = customerStats(inv.map((i) => ({ customer: i.customer, amount: Number(i.amount), dueDate: i.due_date, paidAt: i.paid_at })), today);
    const paid = stats.reduce((s, c) => s + c.paidCount, 0);
    const onTime = stats.reduce((s, c) => s + (c.onTimeRate ?? 0) * c.paidCount, 0);
    const billed = stats.reduce((s, c) => s + c.billed, 0);
    const overdue = stats.reduce((s, c) => s + c.overdueAmount, 0);
    const result = computeScore({
      avgMonthlyInflow: avgInflow,
      monthsOfData: full.length,
      positiveMonths: full.filter((m) => m.net > 0).length,
      onTimeRate: paid >= 2 ? onTime / paid : null,
      overdueShare: billed ? overdue / billed : 0,
    });
    return { avgInflow, result, hasData: (credits ?? []).length > 0 };
  }, [credits, exp, inv, today]);

  if (!credits) return <div className="empty">Loading</div>;

  const { result, avgInflow } = model;
  const list = offers(result.score, avgInflow, req, ten);
  const C = 2 * Math.PI * 46;
  const pct = (result.score - 300) / 600;
  const bandClass = result.band === "Excellent" || result.band === "Good" ? "p-good" : result.band === "Fair" ? "p-warn" : "p-bad";

  return (
    <>
      {err && <div className="err">{err}</div>}
      {!model.hasData && (
        <div className="okmsg" style={{ background: "var(--warn-soft)", color: "var(--warn)" }}>
          No bank data yet, so the score is low. Import a statement on the <Link href="/reconcile">Reconcile</Link> tab (try <code>sample-history.csv</code>).
        </div>
      )}
      <div className="grid g2">
        <div className="card">
          <div className="sec"><h2>Loan readiness score</h2><span className={"pill " + bandClass}>{result.band}</span></div>
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <svg viewBox="0 0 112 112" role="img" aria-label={`Score ${result.score} out of 900`} style={{ width: 112, height: 112, flex: "none" }}>
              <circle cx="56" cy="56" r="46" fill="none" stroke="var(--surface2)" strokeWidth="10" />
              <circle cx="56" cy="56" r="46" fill="none" stroke="var(--accent)" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${C * pct} ${C}`} transform="rotate(-90 56 56)" />
              <text x="56" y="62" textAnchor="middle" fontSize="26" fontWeight="600" fill="var(--fg)" fontFamily="Space Grotesk, sans-serif">{result.score}</text>
            </svg>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div className="fact"><span>Average monthly inflow</span><b>{avgInflow ? lakh(avgInflow) : "-"}</b></div>
              <div className="fact"><span>Scale</span><b>300 to 900</b></div>
            </div>
          </div>
          <p className="note">An explainable demo score from your own data. It is not a credit bureau score, and lenders will run their own checks.</p>
        </div>

        <div className="card">
          <div className="sec"><h2>What drives the score</h2></div>
          <div className="grid" style={{ gap: 12 }}>
            {result.parts.map((p) => (
              <div key={p.key}>
                <div className="fact" style={{ border: 0, padding: "0 0 4px" }}>
                  <span>{p.label}</span><span style={{ color: "var(--muted)" }}>{Math.round(p.weight * 100)}% weight</span>
                </div>
                <div className="bar"><i style={{ width: p.value * 100 + "%" }} /></div>
                <div className="biz" style={{ marginTop: 3 }}>{p.note}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {result.tips.length > 0 && (
        <div className="card" style={{ marginTop: 14 }}>
          <div className="sec"><h2>How to improve it</h2></div>
          <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
            {result.tips.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </div>
      )}

      <div className="card" style={{ marginTop: 14 }}>
        <div className="sec"><div><h2>Illustrative lender offers</h2><p>Example terms to show how a partner lender would respond. No real lender is connected.</p></div></div>
        <div className="form" style={{ gridTemplateColumns: "1fr 1fr", maxWidth: 420, marginBottom: 12 }}>
          <div>
            <label htmlFor="req">Amount needed (₹)</label>
            <input id="req" type="number" min={50000} max={5000000} step={50000} value={req} onChange={(e) => setReq(Math.max(0, +e.target.value))} />
          </div>
          <div>
            <label htmlFor="ten">Tenure</label>
            <select id="ten" value={ten} onChange={(e) => setTen(+e.target.value)}>
              {[6, 12, 18, 24].map((m) => <option key={m} value={m}>{m} months</option>)}
            </select>
          </div>
        </div>
        <div className="tw">
          <table>
            <thead><tr><th>Lender</th><th className="n">Rate p.a.</th><th className="n">Amount</th><th className="n">EMI</th><th className="n">Fee</th><th>Status</th></tr></thead>
            <tbody>
              {list.map((o) => (
                <tr key={o.lender.name}>
                  <td>{o.lender.name}<div className="biz">{o.lender.kind}</div></td>
                  <td className="n">{o.lender.rate}%</td>
                  <td className="n">{o.eligible ? inr(o.amount) : "-"}</td>
                  <td className="n">{o.eligible ? inr(o.emi) : "-"}</td>
                  <td className="n">{o.eligible ? inr(o.fee) : "-"}</td>
                  <td>
                    {o.eligible ? (o.capped ? <span className="pill p-warn">Capped at limit</span> : <span className="pill p-good">Eligible</span>) : <span className="pill p-bad">{o.reason}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="note">Limits are a multiple of your average monthly bank inflow. In a real product the lender shows its own key fact statement and you accept on the lender&apos;s screen, as the RBI digital lending rules require. VyaparOne would only share your data with your consent.</p>
      </div>
    </>
  );
}
