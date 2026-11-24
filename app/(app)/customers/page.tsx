"use client";
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase";
import { inr } from "@/lib/format";
import { todayStr } from "@/lib/format";
import { customerStats, CustomerStat } from "@/lib/ledger";
import type { Invoice } from "@/lib/types";

const GRADE_CLASS: Record<string, string> = { A: "p-good", B: "p-warn", C: "p-bad", New: "p-mute" };
const GRADE_TEXT: Record<string, string> = { A: "A · pays on time", B: "B · sometimes late", C: "C · often late", New: "Not enough history" };

export default function Customers() {
  const [stats, setStats] = useState<CustomerStat[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const r = await sb().from("invoices").select("*");
      if (r.error) { setErr(r.error.message); setStats([]); return; }
      const list = ((r.data ?? []) as Invoice[]).map((i) => ({
        customer: i.customer, amount: Number(i.amount), dueDate: i.due_date, paidAt: i.paid_at,
      }));
      setStats(customerStats(list, todayStr()));
    })();
  }, []);

  if (!stats) return <div className="empty">Loading</div>;
  const risky = stats.filter((s) => s.grade === "C" && s.outstanding > 0);
  const atRisk = risky.reduce((s, c) => s + c.outstanding, 0);

  return (
    <>
      {err && <div className="err">{err}</div>}
      {risky.length > 0 && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="kpi">
            <div className="l">At risk of paying late</div>
            <div className="v" style={{ color: "var(--bad)" }}>{inr(atRisk)}</div>
            <div className="s">{risky.map((r) => r.customer).join(", ")} {risky.length > 1 ? "have" : "has"} a C grade and an unpaid balance.</div>
          </div>
        </div>
      )}
      <div className="card">
        <div className="sec">
          <div>
            <h2>Customer ledger</h2>
            <p>Grades come from how many paid invoices arrived on or before the due date. A customer needs two paid invoices to be graded.</p>
          </div>
        </div>
        {stats.length === 0 ? <div className="empty">No customers yet. Add invoices first.</div> : (
          <div className="tw">
            <table>
              <thead>
                <tr><th>Customer</th><th>Grade</th><th className="n">Billed</th><th className="n">Outstanding</th><th className="n">Overdue</th><th className="n">Paid on time</th><th className="n">Avg days late</th></tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s.customer}>
                    <td>{s.customer}<div className="biz">{s.invoices} invoice{s.invoices > 1 ? "s" : ""}</div></td>
                    <td><span className={"pill " + GRADE_CLASS[s.grade]}>{GRADE_TEXT[s.grade]}</span></td>
                    <td className="n">{inr(s.billed)}</td>
                    <td className="n">{s.outstanding ? inr(s.outstanding) : "-"}</td>
                    <td className="n">{s.overdueCount ? <span style={{ color: "var(--bad)" }}>{inr(s.overdueAmount)} ({s.overdueCount})</span> : "-"}</td>
                    <td className="n">{s.onTimeRate === null ? "-" : Math.round(s.onTimeRate * 100) + "%"}</td>
                    <td className="n">{s.avgDaysLate === null ? "-" : (s.avgDaysLate > 0 ? "+" : "") + s.avgDaysLate.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
