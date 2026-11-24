import { userClient, razorpayCreds } from "@/lib/serverAuth";
import { buildLinkPayload, createLink } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const creds = razorpayCreds();
  if (!creds) return Response.json({ error: "Payment links are not switched on. Add the Razorpay keys in Vercel first." }, { status: 501 });
  const u = await userClient(req);
  if (!u) return Response.json({ error: "Please sign in again." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const invoiceId = typeof body.invoiceId === "string" ? body.invoiceId : "";
  if (!invoiceId) return Response.json({ error: "Missing invoice." }, { status: 400 });

  const inv = await u.client.from("invoices").select("*").eq("id", invoiceId).maybeSingle();
  if (inv.error || !inv.data) return Response.json({ error: "Invoice not found." }, { status: 404 });
  const row = inv.data as { number: string; customer: string; amount: number; paid_at: string | null; customer_phone?: string | null; pay_link_id?: string | null; pay_link_url?: string | null };
  if (row.paid_at) return Response.json({ error: "This invoice is already paid." }, { status: 400 });
  if (row.pay_link_id && row.pay_link_url && !body.fresh) return Response.json({ id: row.pay_link_id, url: row.pay_link_url, reused: true });

  const biz = await u.client.from("businesses").select("name").maybeSingle();
  const business = (biz.data as { name: string } | null)?.name ?? "VyaparOne";
  const payload = buildLinkPayload({
    amountRupees: Number(row.amount), invoiceNumber: row.number, customer: row.customer,
    phone: row.customer_phone ?? null, business, suffix: Date.now().toString(36),
  });
  const made = await createLink(fetch as never, creds, payload);
  if (!made.ok) return Response.json({ error: made.error }, { status: 502 });

  const up = await u.client.from("invoices").update({ pay_link_id: made.id, pay_link_url: made.url }).eq("id", invoiceId);
  if (up.error) {
    const msg = up.error.message.includes("pay_link") ? "Run supabase/migration-4.sql in Supabase first, then try again." : up.error.message;
    return Response.json({ error: msg }, { status: 500 });
  }
  return Response.json({ id: made.id, url: made.url });
}
