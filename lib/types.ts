export type Business = { owner_id: string; name: string; gstin: string | null; city: string | null; upi_id?: string | null };
export type Invoice = {
  id: string; number: string; customer: string; amount: number; due_date: string; paid_at: string | null;
  customer_phone?: string | null; pay_link_id?: string | null; pay_link_url?: string | null;
};
export type BankTxn = {
  id: string; txn_date: string; narration: string; amount: number;
  status: "unmatched" | "matched" | "review"; invoice_id: string | null;
};
export type Reminder = { id: string; invoice_id: string; channel: string; sent_at: string };
export type Expense = { id: string; txn_date: string; narration: string; amount: number; category: string };
