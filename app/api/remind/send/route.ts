import { userClient, twilioCreds } from "@/lib/serverAuth";
import { sendWhatsApp } from "@/lib/twilio";
import { normalizePhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const creds = twilioCreds();
  if (!creds) return Response.json({ error: "Automatic WhatsApp is not switched on. Add the Twilio keys in Vercel first." }, { status: 501 });
  const u = await userClient(req);
  if (!u) return Response.json({ error: "Please sign in again." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const invoiceId = typeof body.invoiceId === "string" ? body.invoiceId : "";
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 1000) : "";
  if (!invoiceId || !message) return Response.json({ error: "Missing invoice or message." }, { status: 400 });

  const inv = await u.client.from("invoices").select("*").eq("id", invoiceId).maybeSingle();
  if (inv.error || !inv.data) return Response.json({ error: "Invoice not found." }, { status: 404 });
  const phone = normalizePhone(String((inv.data as { customer_phone?: string | null }).customer_phone ?? ""));
  if (!phone) return Response.json({ error: "Save a valid customer mobile number first." }, { status: 400 });

  const sent = await sendWhatsApp(fetch as never, creds, phone, message);
  if (!sent.ok) return Response.json({ error: sent.error }, { status: 502 });
  await u.client.from("reminders").insert({ owner_id: u.userId, invoice_id: invoiceId, channel: "whatsapp-api" });
  return Response.json({ ok: true, sid: sent.sid });
}
