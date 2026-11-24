"use client";
import { useCallback, useEffect, useState } from "react";
import { sb } from "@/lib/supabase";
import { inr, daysLate, fmtDate } from "@/lib/format";
import type { Invoice, Reminder } from "@/lib/types";
import { useSession } from "@/components/Session";
import { buildUpiLink, isValidUpi, reminderText } from "@/lib/upi";
import { normalizePhone, waLink, smsLink, prettyPhone } from "@/lib/phone";

function Status({ i }: { i: Invoice }) {
  if (i.paid_at) return <span className="pill p-good">Paid</span>;
  const d = daysLate(i.due_date);
  if (d > 0) return <span className="pill p-bad">{d} days overdue</span>;
  if (d > -7) return <span className="pill p-warn">Due in {-d} days</span>;
  return <span className="pill p-mute">Due in {-d} days</span>;
}

export default function Invoices() {
  const { userId, business } = useSession();
  const [inv, setInv] = useState<Invoice[] | null>(null);
  const [rem, setRem] = useState<Record<string, number>>({});
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [f, setF] = useState({ number: "", customer: "", amount: "", due: "" });
  const [upi, setUpi] = useState<string | null>(null);
  const [upiInput, setUpiInput] = useState("");
  const [editUpi, setEditUpi] = useState(false);
  const [panel, setPanel] = useState<Invoice | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [cfg, setCfg] = useState<{ pay: boolean; whatsapp: boolean }>({ pay: false, whatsapp: false });
  const [phoneInput, setPhoneInput] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [payState, setPayState] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/config").then((r) => r.json()).then((j) => setCfg({ pay: !!j.pay, whatsapp: !!j.whatsapp })).catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      const r = await sb().from("businesses").select("upi_id").maybeSingle();
      if (!r.error && r.data) setUpi((r.data as { upi_id: string | null }).upi_id ?? null);
    })();
  }, []);

  const link = panel && upi ? buildUpiLink({ upiId: upi, payee: business.name, amount: Number(panel.amount), note: panel.number }) : null;
  const msgText = panel && upi
    ? reminderText({ customer: panel.customer, number: panel.number, amount: Number(panel.amount), dueDate: fmtDate(panel.due_date), daysLate: daysLate(panel.due_date), payee: business.name, upiId: upi, payLink: panel.pay_link_url })
    : "";
  const phoneOk = normalizePhone(phoneInput);

  function openPanel(i: Invoice) {
    const sib = (inv ?? []).find((x) => x.customer === i.customer && x.customer_phone);
    const saved = normalizePhone(i.customer_phone ?? sib?.customer_phone ?? "");
    setPhoneInput(saved ? prettyPhone(saved) : "");
    setPayState(null);
    setPanel(i);
    setTimeout(() => document.getElementById("upi-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  async function token() {
    const { data } = await sb().auth.getSession();
    return data.session?.access_token ?? "";
  }

  async function savePhone() {
    if (!panel) return;
    setErr(null); setOk(null);
    if (!phoneOk) { setErr("Enter a 10 digit Indian mobile number, for example 98200 12345."); return; }
    const r = await sb().from("invoices").update({ customer_phone: phoneOk }).eq("customer", panel.customer);
    if (r.error) setErr(r.error.message.includes("customer_phone") ? "Run supabase/migration-4.sql in Supabase first, then try again." : r.error.message);
    else { setPanel({ ...panel, customer_phone: phoneOk }); setPhoneInput(prettyPhone(phoneOk)); setOk(`Saved ${prettyPhone(phoneOk)} for ${panel.customer}.`); load(); }
  }

  async function sendVia(channel: "whatsapp" | "sms") {
    if (!panel || !phoneOk) { setErr("Enter a valid mobile number first."); return; }
    setErr(null); setOk(null);
    const url = channel === "whatsapp" ? waLink(phoneOk, msgText) : smsLink(phoneOk, msgText);
    window.open(url, channel === "whatsapp" ? "_blank" : "_self", "noopener");
    const r = await sb().from("reminders").insert({ owner_id: userId, invoice_id: panel.id, channel });
    if (!r.error) { setOk(`Opened ${channel === "whatsapp" ? "WhatsApp" : "your messaging app"} with the message ready. Press send there. The reminder is logged.`); load(); }
  }

  async function call(path: string, payload: object) {
    const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token()}` }, body: JSON.stringify(payload) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.error || "Something went wrong.");
    return j;
  }

  async function makePayLink() {
    if (!panel) return;
    setErr(null); setOk(null); setBusy("pay");
    try {
      const j = await call("/api/pay/create", { invoiceId: panel.id });
      setPanel({ ...panel, pay_link_id: j.id, pay_link_url: j.url }); setPayState("open");
      setOk(j.reused ? "This invoice already has a payment link." : "Payment link created in test mode.");
      load();
    } catch (e) { setErr((e as Error).message); }
    setBusy(null);
  }

  async function checkPay() {
    if (!panel) return;
    setErr(null); setOk(null); setBusy("check");
    try {
      const j = await call("/api/pay/status", { invoiceId: panel.id });
      setPayState(j.state);
      if (j.paid) { setOk(`Payment received. ${panel.number} is now marked paid.`); setPanel(null); load(); }
      else setOk(j.state === "open" ? "Not paid yet." : j.state === "partial" ? "Partly paid." : j.state === "closed" ? "The link has expired or was cancelled." : "No link yet.");
    } catch (e) { setErr((e as Error).message); }
    setBusy(null);
  }

  async function sendAuto() {
    if (!panel) return;
    setErr(null); setOk(null); setBusy("auto");
    try {
      await call("/api/remind/send", { invoiceId: panel.id, message: msgText });
      setOk("WhatsApp message sent through the Twilio sandbox and logged.");
      load();
    } catch (e) { setErr((e as Error).message); }
    setBusy(null);
  }
  useEffect(() => {
    let live = true;
    setQr(null);
    if (!link) return;
    import("qrcode").then((m) => m.toDataURL(link, { width: 240, margin: 1 })).then((u) => { if (live) setQr(u); }).catch(() => {});
    return () => { live = false; };
  }, [link]);

  async function saveUpi(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setOk(null);
    if (!isValidUpi(upiInput)) { setErr("That does not look like a UPI ID. It should look like name@bank."); return; }
    const r = await sb().from("businesses").update({ upi_id: upiInput.trim() }).eq("owner_id", userId);
    if (r.error) setErr(r.error.message.includes("upi_id") ? "Run supabase/migration-3.sql in Supabase first, then try again." : r.error.message);
    else { setUpi(upiInput.trim()); setEditUpi(false); setOk("UPI ID saved."); }
  }

  async function copy(label: string, text: string) {
    try { await navigator.clipboard.writeText(text); setCopied(label); setTimeout(() => setCopied(null), 1800); }
    catch { setErr("Your browser blocked copying. Select the text and press Ctrl+C."); }
  }

  const load = useCallback(async () => {
    const a = await sb().from("invoices").select("*").order("due_date");
    const b = await sb().from("reminders").select("*");
    if (a.error) setErr(a.error.message);
    const counts: Record<string, number> = {};
    ((b.data ?? []) as Reminder[]).forEach((r) => { counts[r.invoice_id] = (counts[r.invoice_id] ?? 0) + 1; });
    setRem(counts);
    setInv((a.data ?? []) as Invoice[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setOk(null);
    const amount = parseFloat(f.amount);
    if (!(amount > 0)) { setErr("Enter an amount greater than zero."); return; }
    const r = await sb().from("invoices").insert({
      owner_id: userId, number: f.number.trim(), customer: f.customer.trim(), amount, due_date: f.due,
    });
    if (r.error) setErr(r.error.code === "23505" ? "That invoice number already exists." : r.error.message);
    else { setOk(`Invoice ${f.number.trim()} created.`); setF({ number: "", customer: "", amount: "", due: "" }); load(); }
  }

  async function remind(list: Invoice[]) {
    setErr(null); setOk(null);
    if (!list.length) { setOk("Nothing is overdue."); return; }
    const r = await sb().from("reminders").insert(list.map((i) => ({ owner_id: userId, invoice_id: i.id, channel: "whatsapp" })));
    if (r.error) setErr(r.error.message);
    else { setOk(`Reminder logged for ${list.length} invoice${list.length > 1 ? "s" : ""}. No message is sent until a WhatsApp or SMS provider is connected.`); load(); }
  }

  async function setPaid(i: Invoice, paid: boolean) {
    const r = await sb().from("invoices").update({ paid_at: paid ? new Date().toISOString() : null }).eq("id", i.id);
    if (r.error) setErr(r.error.message); else load();
  }

  async function del(i: Invoice) {
    const r = await sb().from("invoices").delete().eq("id", i.id);
    if (r.error) setErr(r.error.message); else load();
  }

  const overdue = (inv ?? []).filter((i) => !i.paid_at && daysLate(i.due_date) > 0);

  return (
    <>
      {err && <div className="err">{err}</div>}
      {ok && <div className="okmsg">{ok}</div>}
      <div className="card">
        <div className="sec">
          <div><h2>Invoices</h2><p>Reminders are recorded per invoice so you can see how often a customer was chased.</p></div>
          <button className="pri" onClick={() => remind(overdue)}>Remind all overdue ({overdue.length})</button>
        </div>
        {!inv ? <div className="empty">Loading</div> : inv.length === 0 ? <div className="empty">No invoices yet. Add one below.</div> : (
          <div className="tw">
            <table>
              <thead><tr><th>Invoice</th><th>Customer</th><th>Due</th><th className="n">Amount</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {inv.map((i) => (
                  <tr key={i.id}>
                    <td>{i.number}</td><td>{i.customer}</td><td>{fmtDate(i.due_date)}</td>
                    <td className="n">{inr(Number(i.amount))}</td>
                    <td><Status i={i} />{rem[i.id] && !i.paid_at ? <> <span className="pill p-mute">{rem[i.id]} sent</span></> : null}</td>
                    <td>
                      <div className="row-actions">
                        {!i.paid_at && <button className="sm" onClick={() => openPanel(i)}>Collect</button>}
                        {!i.paid_at && <button className="sm" onClick={() => remind([i])}>Remind</button>}
                        <button className="sm" onClick={() => setPaid(i, !i.paid_at)}>{i.paid_at ? "Mark unpaid" : "Mark paid"}</button>
                        <button className="sm" onClick={() => del(i)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="card" id="upi-panel" style={{ marginTop: 14, scrollMarginTop: 12 }}>
        <div className="sec">
          <div><h2>Get paid by UPI</h2><p>{upi && !editUpi ? <>Payments go to <b>{upi}</b>.</> : "Add your business UPI ID to create payment QR codes for invoices."}</p></div>
          {upi && !editUpi && <button className="sm" onClick={() => { setUpiInput(upi); setEditUpi(true); }}>Change</button>}
        </div>
        {(!upi || editUpi) && (
          <form className="form" onSubmit={saveUpi} style={{ maxWidth: 480 }}>
            <div><label htmlFor="upi">Business UPI ID</label><input id="upi" required placeholder="yourshop@okhdfcbank" value={upiInput} onChange={(e) => setUpiInput(e.target.value)} /></div>
            <button className="pri">Save UPI ID</button>
          </form>
        )}
        {panel && upi && link && (
          <div style={{ marginTop: 16, display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div style={{ textAlign: "center" }}>
              {qr ? <img src={qr} alt={`UPI QR code for ${panel.number}`} width={200} height={200} style={{ background: "#fff", padding: 6, borderRadius: 8, border: "1px solid var(--line)" }} /> : <div className="empty" style={{ width: 200 }}>Making QR</div>}
              <div className="biz">Scan with any UPI app</div>
            </div>
            <div style={{ flex: 1, minWidth: 240 }}>
              <h3 style={{ fontSize: 15 }}>{panel.number} · {panel.customer}</h3>
              <div className="fact"><span>Amount</span><b>{inr(Number(panel.amount))}</b></div>
              <div className="fact"><span>Pay to</span><b>{upi}</b></div>
              <div className="fact"><span>Note on payment</span><b>{panel.number}</b></div>
              <label htmlFor="msg" style={{ marginTop: 10 }}>Reminder message</label>
              <textarea id="msg" readOnly rows={6} style={{ width: "100%", font: "inherit", padding: 8, borderRadius: 8, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--fg)" }} value={msgText} />
              <div className="row-actions" style={{ justifyContent: "flex-start", marginTop: 8 }}>
                <button className="pri sm" onClick={() => copy("msg", msgText)}>{copied === "msg" ? "Copied" : "Copy message"}</button>
                <button className="sm" onClick={() => copy("link", link)}>{copied === "link" ? "Copied" : "Copy UPI link"}</button>
                <button className="sm" onClick={() => remind([panel])}>Log a reminder</button>
                <button className="sm" onClick={() => setPanel(null)}>Close</button>
              </div>
              <h3 style={{ fontSize: 14, marginTop: 16 }}>Send it to the customer</h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", marginTop: 6 }}>
                <div style={{ flex: "1 1 180px" }}>
                  <label htmlFor="ph">Customer mobile number</label>
                  <input id="ph" inputMode="tel" placeholder="98200 12345" value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} />
                </div>
                <button className="sm" onClick={savePhone} disabled={!phoneOk}>Save number</button>
              </div>
              <div className="row-actions" style={{ justifyContent: "flex-start", marginTop: 8 }}>
                <button className="pri sm" onClick={() => sendVia("whatsapp")} disabled={!phoneOk}>Open in WhatsApp</button>
                <button className="sm" onClick={() => sendVia("sms")} disabled={!phoneOk}>Open in SMS</button>
                {cfg.whatsapp && <button className="sm" onClick={sendAuto} disabled={!phoneOk || busy === "auto"}>{busy === "auto" ? "Sending" : "Send automatically (Twilio sandbox)"}</button>}
              </div>
              <p className="note">WhatsApp and SMS open with the message filled in. You press send, so it works from any phone with no setup.{!cfg.whatsapp ? " Automatic sending needs the Twilio keys (see README, upgrade 4)." : ""}</p>
              <h3 style={{ fontSize: 14, marginTop: 16 }}>Online payment link <span className="pill p-warn">Test mode</span></h3>
              {!cfg.pay ? (
                <p className="note">Not switched on. Add the Razorpay test keys in Vercel to create payment links (see README, upgrade 4).</p>
              ) : (
                <>
                  {panel.pay_link_url ? (
                    <>
                      <div className="fact"><span>Link</span><b style={{ wordBreak: "break-all", textAlign: "right" }}><a href={panel.pay_link_url} target="_blank" rel="noopener noreferrer">{panel.pay_link_url}</a></b></div>
                      <div className="row-actions" style={{ justifyContent: "flex-start", marginTop: 8 }}>
                        <button className="sm" onClick={() => copy("plink", panel.pay_link_url as string)}>{copied === "plink" ? "Copied" : "Copy link"}</button>
                        <button className="pri sm" onClick={checkPay} disabled={busy === "check"}>{busy === "check" ? "Checking" : "Check payment status"}</button>
                      </div>
                      {payState && <p className="note">Link status: {payState}. The link is already added to the message above.</p>}
                    </>
                  ) : (
                    <div className="row-actions" style={{ justifyContent: "flex-start", marginTop: 6 }}>
                      <button className="pri sm" onClick={makePayLink} disabled={busy === "pay"}>{busy === "pay" ? "Creating" : "Create payment link"}</button>
                    </div>
                  )}
                  <p className="note">Test mode takes fake cards only, so no real money moves. Use card 4111 1111 1111 1111, any future expiry and any CVV.</p>
                </>
              )}
              <p className="note">Tip: attach a screenshot of the QR code in WhatsApp. The invoice number in the UPI note helps Reconcile match the payment.</p>
            </div>
          </div>
        )}
        {panel && !upi && <p className="note">Save your UPI ID above, then press Collect again.</p>}
      </div>
      <div className="card" style={{ marginTop: 14 }}>
        <div className="sec"><h2>New invoice</h2></div>
        <form className="form" onSubmit={add}>
          <div><label htmlFor="n">Invoice number</label><input id="n" required placeholder="INV-1050" value={f.number} onChange={(e) => setF({ ...f, number: e.target.value })} /></div>
          <div><label htmlFor="c">Customer</label><input id="c" required placeholder="Krishna Stores" value={f.customer} onChange={(e) => setF({ ...f, customer: e.target.value })} /></div>
          <div><label htmlFor="a">Amount (₹)</label><input id="a" type="number" min="1" step="0.01" required value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></div>
          <div><label htmlFor="d">Due date</label><input id="d" type="date" required value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} /></div>
          <button className="pri">Create invoice</button>
        </form>
      </div>
    </>
  );
}
