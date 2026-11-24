// Razorpay Payment Links helpers (works with test keys). No imports.
// The fetch function is passed in so the logic can be tested without a network.

export type Creds = { keyId: string; keySecret: string };
export type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body?: string }) => Promise<{ ok: boolean; status: number; json: () => Promise<any> }>;

const BASE = "https://api.razorpay.com/v1/payment_links";

export const authHeader = (c: Creds) => "Basic " + btoa(`${c.keyId}:${c.keySecret}`);

export function buildLinkPayload(p: { amountRupees: number; invoiceNumber: string; customer: string; phone?: string | null; business: string; suffix: string }) {
  const ref = `${p.invoiceNumber}-${p.suffix}`.slice(0, 40);
  const customer: { name: string; contact?: string } = { name: p.customer.slice(0, 100) };
  if (p.phone) customer.contact = "+" + p.phone;
  return {
    amount: Math.round(p.amountRupees * 100),
    currency: "INR",
    accept_partial: false,
    reference_id: ref,
    description: `Invoice ${p.invoiceNumber} from ${p.business}`.slice(0, 2000),
    customer,
    notify: { sms: false, email: false },
    reminder_enable: false,
    notes: { invoice: p.invoiceNumber },
  };
}

export type LinkState = "open" | "paid" | "partial" | "closed";
export function mapStatus(s: string): LinkState {
  if (s === "paid") return "paid";
  if (s === "partially_paid") return "partial";
  if (s === "expired" || s === "cancelled") return "closed";
  return "open";
}

const errText = (j: any, status: number) => (j && j.error && j.error.description) || `Razorpay returned status ${status}`;

export async function createLink(f: FetchLike, c: Creds, payload: object): Promise<{ ok: true; id: string; url: string } | { ok: false; error: string }> {
  try {
    const r = await f(BASE, { method: "POST", headers: { Authorization: authHeader(c), "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const j = await r.json();
    if (!r.ok || !j || !j.id || !j.short_url) return { ok: false, error: errText(j, r.status) };
    return { ok: true, id: String(j.id), url: String(j.short_url) };
  } catch (e) {
    return { ok: false, error: "Could not reach Razorpay. Try again in a minute." };
  }
}

export async function getLink(f: FetchLike, c: Creds, id: string): Promise<{ ok: true; state: LinkState; raw: string } | { ok: false; error: string }> {
  try {
    const r = await f(`${BASE}/${encodeURIComponent(id)}`, { method: "GET", headers: { Authorization: authHeader(c) } });
    const j = await r.json();
    if (!r.ok || !j || !j.status) return { ok: false, error: errText(j, r.status) };
    return { ok: true, state: mapStatus(String(j.status)), raw: String(j.status) };
  } catch (e) {
    return { ok: false, error: "Could not reach Razorpay. Try again in a minute." };
  }
}
