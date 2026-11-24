-- Upgrade 3: UPI ID for payment QR codes. Run once in Supabase: SQL Editor > New query > paste > Run.
alter table public.businesses add column if not exists upi_id text;
