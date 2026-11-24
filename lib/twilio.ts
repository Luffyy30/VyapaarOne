// Twilio WhatsApp sandbox sender. No imports. The fetch function is passed in for testing.

export type TwilioCreds = { sid: string; token: string; from: string };
export type TwilioFetch = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{ ok: boolean; status: number; json: () => Promise<any> }>;

export const whatsappAddr = (n: string) => `whatsapp:+${n.replace(/\D/g, "")}`;

export async function sendWhatsApp(f: TwilioFetch, c: TwilioCreds, toPhone: string, body: string): Promise<{ ok: true; sid: string } | { ok: false; error: string }> {
  const from = c.from.startsWith("whatsapp:") ? c.from : whatsappAddr(c.from);
  const form = new URLSearchParams({ From: from, To: whatsappAddr(toPhone), Body: body });
  try {
    const r = await f(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(c.sid)}/Messages.json`, {
      method: "POST",
      headers: { Authorization: "Basic " + btoa(`${c.sid}:${c.token}`), "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const j = await r.json();
    if (!r.ok || !j || !j.sid) return { ok: false, error: (j && j.message) || `Twilio returned status ${r.status}` };
    return { ok: true, sid: String(j.sid) };
  } catch (e) {
    return { ok: false, error: "Could not reach Twilio. Try again in a minute." };
  }
}
