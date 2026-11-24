# VyaparOne

Finance control center for Indian MSMEs, built for the Digital Banking and Neo Banks course (Group 20).

- Live site: https://vyapaarone.vercel.app
- Case study: https://vyapaarone.vercel.app/case-study

VyaparOne helps a small business owner collect payments, match them against the bank statement, watch cash flow and check loan readiness. It follows a BaaS model: the app is the owner's workspace, and a licensed partner bank or lender would hold the money, deposits and loans.

**What works:** sign-in, invoices, UPI QR codes, WhatsApp and SMS reminders, Razorpay payment links (test mode), bank statement reconciliation, customer payment grades, cash-flow history and forecast, and a loan readiness score.

## One-time setup (about 10 minutes)

1. **Create a database.** Sign up free at supabase.com and create a project.
2. **Create the tables.** In Supabase open SQL Editor, click New query, paste all of `supabase/schema.sql`, click Run.
3. **Allow quick sign-up while testing.** Supabase, Authentication, Providers, Email: turn off "Confirm email". Turn it back on before real users.
4. **Add your keys.** Copy `.env.example` to `.env.local`. Fill in the Project URL and the anon public key from Supabase, Project Settings, API.
5. **Run it.**
   ```
   npm install
   npm run dev
   ```
   Open http://localhost:3000, create an account, enter your business name.
6. **Try reconciliation.** Add invoices INV-1042, INV-1043, INV-1044, INV-1045 (customers Ganesh Kirana Stores, Shree Sai Provisions, Mahalaxmi Traders, Patel General Store), then import `sample-statement.csv` on the Reconcile tab.

## Put it online
Push the folder to GitHub, import it in Vercel, and add the same two environment variables. Add your Vercel URL under Supabase, Authentication, URL Configuration.

## What is real and what is not
Real: accounts, password reset, per-business data isolation (Row Level Security), invoices, reminder history, UPI QR codes, click-to-send WhatsApp and SMS reminders, CSV import of credits and debits, matching logic, cash-flow history and 30-day estimate, customer payment grades (`npm test` covers the logic).

Sandbox or simulated: Razorpay payment links run in test mode with fake cards, and loan offers are illustrative.

Not built, because they need a licensed partner: live bank feeds (Account Aggregator), KYC, deposits and real lending.

## Upgrading an existing install
1. Run `supabase/migration-2.sql` in the Supabase SQL Editor (adds the expenses table).
2. Copy the new files over your folder (keep `.env.local` and `.vercel`).
3. `npm.cmd install`, then test with `npm.cmd run dev`.
4. `npx.cmd vercel --prod` to publish.
5. In Supabase, Authentication, URL Configuration, add your site address followed by `/**` to Redirect URLs so password reset links work.

Demo data: the dashboard has a **load sample data** button when there are no invoices. Import `sample-history.csv` on the Reconcile tab to fill the Cash flow page with six months of example activity.

## Upgrade 3 (loans, UPI QR codes, data clean-up)
1. Run `supabase/migration-3.sql` in the Supabase SQL Editor (adds the UPI ID column).
2. Copy the new files over your folder, then run `npm.cmd install` once (adds the QR code library).
3. `npm.cmd run dev` to test, then `npx.cmd vercel --prod` to publish.
4. On the Invoices tab, save your business UPI ID, then press **Collect** on any unpaid invoice for a QR code and a reminder message.
5. The Loans tab computes a readiness score from your saved invoices and bank data. Lender offers are illustrative only.
6. The dashboard has buttons to remove the demo invoices and imported bank rows when you are ready for real data.

## Next steps
Expenses and cash-flow forecast, GST-format invoices, a UPI payment link per invoice, loan score from saved data.

## Upgrade 4 (case study, payment links, WhatsApp and SMS reminders)
1. Run `supabase/migration-4.sql` in the Supabase SQL Editor (adds customer phone and payment link columns).
2. Copy the new files over your folder (keep `.env.local` and `.vercel`). No `npm install` is needed.
3. **Case study page:** open `/case-study`. It is public and needs no sign-in.
4. **WhatsApp and SMS (no keys needed):** Invoices, Collect, enter the customer mobile number, Save number, then Open in WhatsApp or Open in SMS. The message opens ready to send.
5. **Payment links (Razorpay test mode):** create a free Razorpay account, switch to Test mode, copy the Key Id and Key Secret from Account and Settings, API keys. Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to Vercel (Settings, Environment Variables, Production) and redeploy. In the same place, never prefix these with `NEXT_PUBLIC_`.
6. **Automatic WhatsApp (optional, Twilio sandbox):** add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` and `TWILIO_WHATSAPP_FROM` (the sandbox number, for example 14155238886). Each receiving phone must first send the join code shown in the Twilio sandbox page.
Test mode and the sandbox move no real money and send only to joined test phones.
