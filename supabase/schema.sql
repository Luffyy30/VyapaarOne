-- VyaparOne schema. Run once in Supabase: SQL Editor > New query > paste > Run.
-- Every row belongs to the signed-in user (owner_id). Row Level Security makes
-- sure one business can never read or change another business's data.

create table if not exists public.businesses (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  gstin text,
  city text,
  upi_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  number text not null,
  customer text not null,
  amount numeric(14,2) not null check (amount > 0),
  due_date date not null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (owner_id, number)
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  channel text not null default 'whatsapp',
  sent_at timestamptz not null default now()
);

create table if not exists public.bank_txns (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  txn_date date not null,
  narration text not null,
  amount numeric(14,2) not null,
  status text not null default 'unmatched' check (status in ('unmatched','matched','review')),
  invoice_id uuid references public.invoices(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (owner_id, txn_date, narration, amount)
);

alter table public.businesses enable row level security;
alter table public.invoices   enable row level security;
alter table public.reminders  enable row level security;
alter table public.bank_txns  enable row level security;

create policy "own business" on public.businesses for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own invoices" on public.invoices   for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own reminders" on public.reminders for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own txns"      on public.bank_txns for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
-- Expenses table (added in upgrade 2).
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  txn_date date not null,
  narration text not null,
  amount numeric(14,2) not null check (amount > 0),
  category text not null default 'Other',
  created_at timestamptz not null default now(),
  unique (owner_id, txn_date, narration, amount)
);

alter table public.expenses enable row level security;
create policy "own expenses" on public.expenses for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
