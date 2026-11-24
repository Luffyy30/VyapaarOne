import { razorpayCreds, twilioCreds } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

// Tells the browser which optional integrations are switched on. Never returns any key.
export async function GET() {
  return Response.json({ pay: !!razorpayCreds(), whatsapp: !!twilioCreds() });
}
