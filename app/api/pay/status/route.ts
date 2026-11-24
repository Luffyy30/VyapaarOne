import { userClient, razorpayCreds } from "@/lib/serverAuth";
import { getLink } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const creds = razorpayCreds();
  if (!creds) return Response.json({ error: "Payment links are not switched on." }, { status: 501 });
  const u = await userClient(req);
  if (!u) return Response.json({ error: "Please sign in again." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const invoiceId = typeof body.invoiceId === "string" ? body.invoiceId : "";
  const inv = await u.client.from("invoices").select("*").eq("id", invoiceId).maybeSingle();
  if (inv.error || !inv.data) return Response.json({ error: "Invoice not found." }, { status: 404 });
  const row = inv.data as { paid_at: string | null; pay_link_id?: string | null };
  if (!row.pay_link_id) return Response.json({ state: "none", paid: !!row.paid_at });

  const g = await getLink(fetch as never, creds, row.pay_link_id);
  if (!g.ok) return Response.json({ error: g.error }, { status: 502 });
  let paid = !!row.paid_at;
  if (g.state === "paid" && !paid) {
    const up = await u.client.from("invoices").update({ paid_at: new Date().toISOString() }).eq("id", invoiceId);
    if (up.error) return Response.json({ error: up.error.message }, { status: 500 });
    paid = true;
  }
  return Response.json({ state: g.state, paid });
}
