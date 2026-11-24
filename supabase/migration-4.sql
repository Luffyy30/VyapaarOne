-- Upgrade 4: customer phone numbers and payment links. Run once in Supabase: SQL Editor > New query > paste > Run.
alter table public.invoices add column if not exists customer_phone text;
alter table public.invoices add column if not exists pay_link_id text;
alter table public.invoices add column if not exists pay_link_url text;
