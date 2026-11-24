-- Upgrade 2: expenses table. Run once in Supabase: SQL Editor > New query > paste > Run.
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
