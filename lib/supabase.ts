import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Accepts either name, since Supabase now calls this the "publishable" key.
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const configured = Boolean(url && key && !url.includes("YOUR-PROJECT"));

let client: SupabaseClient | null = null;
export function sb(): SupabaseClient {
  if (!client) client = createClient(url as string, key as string);
  return client;
}
