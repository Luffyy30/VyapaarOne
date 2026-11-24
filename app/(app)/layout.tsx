"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { sb, configured } from "@/lib/supabase";
import type { Business } from "@/lib/types";
import SetupNotice from "@/components/SetupNotice";
import { SessionCtx } from "@/components/Session";

const TABS = [
  ["/dashboard", "Dashboard"],
  ["/invoices", "Invoices"],
  ["/customers", "Customers"],
  ["/cashflow", "Cash flow"],
  ["/loans", "Loans"],
  ["/reconcile", "Reconcile"],
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [userId, setUserId] = useState<string | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", gstin: "", city: "" });

  useEffect(() => {
    if (!configured) return;
    (async () => {
      const { data } = await sb().auth.getSession();
      if (!data.session) { router.replace("/login"); return; }
      setUserId(data.session.user.id);
      const r = await sb().from("businesses").select("*").maybeSingle();
      if (r.error) setErr(r.error.message);
      else setBusiness(r.data as Business | null);
      setReady(true);
    })();
  }, [router]);

  if (!configured) return <SetupNotice />;
  if (!ready || !userId) return <div className="center">Loading</div>;

  async function createBusiness(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const row = { owner_id: userId, name: form.name.trim(), gstin: form.gstin.trim() || null, city: form.city.trim() || null };
    const r = await sb().from("businesses").insert(row).select().single();
    if (r.error) setErr(r.error.message);
    else setBusiness(r.data as Business);
  }

  if (!business) {
    return (
      <div className="center">
        <form className="card authbox grid" onSubmit={createBusiness}>
          <h2>Set up your business</h2>
          {err && <div className="err">{err}</div>}
          <div><label htmlFor="bn">Business name</label><input id="bn" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label htmlFor="bg">GSTIN (optional)</label><input id="bg" value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })} /></div>
          <div><label htmlFor="bc">City</label><input id="bc" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          <button className="pri">Continue</button>
        </form>
      </div>
    );
  }

  return (
    <SessionCtx.Provider value={{ userId, business }}>
      <div className="wrap">
        <header className="top">
          <div className="brand">
            <div className="logo">V</div>
            <div>
              <h1 style={{ fontSize: 20 }}>VyaparOne</h1>
              <div className="biz"><b>{business.name}</b>{business.city ? ` · ${business.city}` : ""}{business.gstin ? ` · GSTIN ${business.gstin}` : ""}</div>
            </div>
          </div>
          <div className="row-actions">
            <Link href="/case-study" className="lb" style={{ alignSelf: "center" }}>Case study</Link>
            <button className="sm" onClick={async () => { await sb().auth.signOut(); router.replace("/login"); }}>Sign out</button>
          </div>
        </header>
        <nav className="tabs">
          {TABS.map(([href, label]) => (
            <Link key={href} href={href} className={path === href ? "on" : ""}>{label}</Link>
          ))}
        </nav>
        {children}
      </div>
    </SessionCtx.Provider>
  );
}
