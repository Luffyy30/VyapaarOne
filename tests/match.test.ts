import { matchTxns } from "../lib/match.ts";
import { parseStatement, parseDate } from "../lib/statement.ts";
import { daysLate, addDays } from "../lib/format.ts";
import { categorize } from "../lib/categorize.ts";
import { customerStats } from "../lib/ledger.ts";
import { computeScore, offers, emi } from "../lib/loan.ts";
import { buildUpiLink, isValidUpi, reminderText } from "../lib/upi.ts";
import { compute, DEFAULTS } from "../lib/unitecon.ts";
import { normalizePhone, waLink, smsLink } from "../lib/phone.ts";
import { buildLinkPayload, mapStatus, createLink, getLink, authHeader } from "../lib/razorpay.ts";
import { sendWhatsApp, whatsappAddr } from "../lib/twilio.ts";
import { monthlySeries, categoryTotals, forecast30, lastMonths } from "../lib/cashflow.ts";

let fails = 0;
function eq(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) { fails++; console.log("FAIL", name, "got", JSON.stringify(got), "want", JSON.stringify(want)); }
  else console.log("ok  ", name);
}

const inv = [
  { id: "a", number: "INV-1042", customer: "Ganesh Kirana Stores", amount: 48600, dueDate: "2026-11-05" },
  { id: "b", number: "INV-1043", customer: "Shree Sai Provisions", amount: 127300, dueDate: "2026-11-10" },
  { id: "c", number: "INV-1044", customer: "Mahalaxmi Traders", amount: 86250, dueDate: "2026-11-24" },
  { id: "d", number: "INV-1045", customer: "Patel General Store", amount: 32900, dueDate: "2026-11-28" },
];
const r = matchTxns(
  [
    { id: "t1", narration: "UPI/Ganesh Kirana/INV1042", amount: 48600 },
    { id: "t2", narration: "NEFT/MAHALAXMI TRADERS/OCT SUPPLY", amount: 86250 },
    { id: "t3", narration: "UPI/Shree Sai Prov/9876xxxx21", amount: 120000 },
    { id: "t4", narration: "IMPS/UNKNOWN SENDER/8802", amount: 15000 },
    { id: "t5", narration: "UPI/PATEL GEN STORE/INV1045", amount: 30000 },
    { id: "t6", narration: "ATM WDL", amount: -2000 },
  ],
  inv,
);
eq("ref+amount matched", [r[0].status, r[0].invoiceId], ["matched", "a"]);
eq("name+amount matched", [r[1].status, r[1].invoiceId], ["matched", "c"]);
eq("part payment by name is review", [r[2].status, r[2].invoiceId], ["review", "b"]);
eq("unknown sender unmatched", r[3].status, "unmatched");
eq("ref with wrong amount is review", [r[4].status, r[4].invoiceId], ["review", "d"]);
eq("debit ignored", r[5].status, "unmatched");

const dup = matchTxns(
  [
    { id: "x", narration: "UPI/Ganesh/INV1042", amount: 48600 },
    { id: "y", narration: "UPI/Ganesh/INV1042", amount: 48600 },
  ],
  inv,
);
eq("same invoice not matched twice", dup[1].status, "unmatched");

eq("date iso", parseDate("2026-11-16"), "2026-11-16");
eq("date dd/mm/yyyy", parseDate("16/11/2026"), "2026-11-16");
eq("date dd-Mon-yyyy", parseDate("16-Nov-2026"), "2026-11-16");

const csv = `Account statement,,,
Date,Narration,Debit,Credit,Balance
16/11/2026,"UPI/Ganesh, Kirana/INV1042",,"48,600.00",700000
15/11/2026,Rent,58000,,640000
bad row,,,,
`;
const p = parseStatement(csv);
eq("csv credit rows", p.txns, [{ date: "2026-11-16", narration: "UPI/Ganesh, Kirana/INV1042", amount: 48600 }]);
eq("csv debit rows", p.debits, [{ date: "2026-11-15", narration: "Rent", amount: 58000 }]);
eq("csv skipped", p.skipped, 1);
eq("csv no header", parseStatement("a,b\n1,2").error !== undefined, true);

eq("days late overdue", daysLate("2026-11-05", "2026-11-17"), 12);
eq("days late future", daysLate("2026-11-24", "2026-11-17"), -7);

// categories
eq("cat rent", categorize("Shop rent"), "Rent");
eq("cat salary", categorize("UPI/Ramesh Salary Nov"), "Salaries");
eq("cat power", categorize("ELECTRICITY BILL MSEDCL"), "Utilities");
eq("cat gst", categorize("GST PAYMENT CHALLAN"), "GST & taxes");
eq("cat stock", categorize("NEFT/Sai Wholesale Traders"), "Stock purchase");
eq("cat other", categorize("ATM WDL"), "Other");

// dates
eq("addDays", addDays("2026-11-30", 1), "2026-12-01");
eq("addDays back", addDays("2026-03-01", -1), "2026-02-28");
eq("lastMonths wraps year", lastMonths("2027-02-10", 4), ["2026-11", "2026-12", "2027-01", "2027-02"]);

// ledger
const T = "2026-11-17";
const st = customerStats(
  [
    { customer: "Mahalaxmi Traders", amount: 100, dueDate: "2026-09-10", paidAt: "2026-09-08T06:30:00.000Z" },
    { customer: "mahalaxmi  traders", amount: 100, dueDate: "2026-10-10", paidAt: "2026-10-10T06:30:00.000Z" },
    { customer: "Shree Sai", amount: 200, dueDate: "2026-09-10", paidAt: "2026-09-20T06:30:00.000Z" },
    { customer: "Shree Sai", amount: 300, dueDate: "2026-10-01", paidAt: "2026-10-15T06:30:00.000Z" },
    { customer: "Shree Sai", amount: 400, dueDate: "2026-11-10", paidAt: null },
    { customer: "Ganesh", amount: 50, dueDate: "2026-12-10", paidAt: null },
  ],
  T,
);
const by = (n: string) => st.find((x) => x.customer.toLowerCase().startsWith(n))!;
eq("ledger groups names", st.length, 3);
eq("ledger grade A", by("mahalaxmi").grade, "A");
eq("ledger grade C", by("shree").grade, "C");
eq("ledger new", by("ganesh").grade, "New");
eq("ledger outstanding", by("shree").outstanding, 400);
eq("ledger overdue count", by("shree").overdueCount, 1);
eq("ledger avg days late", by("shree").avgDaysLate, 12);
eq("ledger on time rate", by("mahalaxmi").onTimeRate, 1);

// cash flow
const ms = monthlySeries(
  [{ date: "2026-11-02", amount: 1000 }, { date: "2026-10-05", amount: 500 }],
  [{ date: "2026-11-03", amount: 400 }, { date: "2026-10-09", amount: 600 }],
  T,
  3,
);
eq("series months", ms.map((m) => m.month), ["2026-09", "2026-10", "2026-11"]);
eq("series nov", [ms[2].in, ms[2].out, ms[2].net], [1000, 400, 600]);
eq("series oct net", ms[1].net, -100);
eq("category totals", categoryTotals([
  { date: "2026-11-01", amount: 100, category: "Rent" },
  { date: "2026-11-02", amount: 300, category: "Utilities" },
  { date: "2026-10-02", amount: 999, category: "Rent" },
], "2026-11"), [{ category: "Utilities", amount: 300 }, { category: "Rent", amount: 100 }]);
const fc = forecast30(
  [
    { customer: "Mahalaxmi Traders", amount: 1000, dueDate: "2026-11-24" },
    { customer: "Far Away", amount: 5000, dueDate: "2027-03-01" },
    { customer: "Old Debtor", amount: 1000, dueDate: "2026-09-01" },
  ],
  new Map([["mahalaxmi traders", 1]]),
  ms,
  T,
);
eq("forecast in", fc.expectedIn, 1000 + 1000 * 0.75 * 0.5);
eq("forecast out ignores current month", fc.expectedOut, 600);

// loan score
const empty = computeScore({ avgMonthlyInflow: 0, monthsOfData: 0, positiveMonths: 0, onTimeRate: null, overdueShare: 0 });
eq("score empty is low", empty.score < 560, true);
const strong = computeScore({ avgMonthlyInflow: 600000, monthsOfData: 6, positiveMonths: 6, onTimeRate: 0.95, overdueShare: 0.02 });
eq("score strong is high", strong.score >= 850, true);
eq("score strong band", strong.band, "Excellent");
eq("score strong has no tips", strong.tips.length, 0);
const mid = computeScore({ avgMonthlyInflow: 300000, monthsOfData: 3, positiveMonths: 2, onTimeRate: 0.5, overdueShare: 0.2 });
eq("score mid between", mid.score > empty.score && mid.score < strong.score, true);
eq("score mid tips capped at 3", mid.tips.length <= 3 && mid.tips.length > 0, true);
eq("score range", [empty.score >= 300, strong.score <= 900], [true, true]);
eq("emi zero rate", emi(120000, 0, 12), 10000);
eq("emi sanity", Math.round(emi(100000, 12, 12)), 8885);
const of = offers(600, 200000, 1000000, 12);
eq("offer score gate", of.map((o) => o.eligible), [false, true, true]);
eq("offer capped at multiple", [of[1].amount, of[1].capped], [900000, true]);
eq("offer fee", of[2].fee, 4000);
eq("offer none when no inflow", offers(800, 0, 100000, 12).every((o) => !o.eligible), true);

// upi
eq("upi valid", [isValidUpi("name@okhdfcbank"), isValidUpi("9820012345@ybl"), isValidUpi("bad id@x"), isValidUpi("nope")], [true, true, false, false]);
eq("upi link", buildUpiLink({ upiId: "shop@okaxis", payee: "Sharma Traders", amount: 48600, note: "INV-1042" }),
  "upi://pay?pa=shop%40okaxis&pn=Sharma%20Traders&am=48600.00&cu=INR&tn=INV-1042");
const rt = reminderText({ customer: "Ganesh", number: "INV-1042", amount: 48600, dueDate: "05 Nov 2026", daysLate: 12, payee: "Sharma Traders", upiId: "shop@okaxis" });
eq("reminder mentions overdue", rt.includes("12 days overdue") && rt.includes("₹48,600") && rt.includes("shop@okaxis"), true);
eq("reminder due today", reminderText({ customer: "A", number: "X", amount: 1, dueDate: "d", daysLate: 0, payee: "P", upiId: "u@v" }).includes("is due today"), true);


// unit economics
const ue = compute(DEFAULTS);
eq("ue arpu", Math.round(ue.arpu), 795);
eq("ue contribution", Math.round(ue.contribution), 645);
eq("ue lifetime", ue.lifetimeMonths, 20);
eq("ue ltv/cac", Math.round(ue.ltvToCac * 10) / 10, 2.6);
eq("ue payback", Math.round((ue.paybackMonths as number) * 10) / 10, 7.7);
eq("ue breakeven", ue.breakEvenBusinesses, 2325);
const loss = compute({ ...DEFAULTS, variableCost: 2000 });
eq("ue negative contribution", [loss.ltv, loss.paybackMonths, loss.breakEvenBusinesses], [0, null, null]);
eq("ue zero churn safe", compute({ ...DEFAULTS, monthlyChurn: 0 }).ltv, 0);

// phone
eq("phone 10 digit", normalizePhone("98200 12345"), "919820012345");
eq("phone +91", normalizePhone("+91-98200-12345"), "919820012345");
eq("phone 0 prefix", normalizePhone("09820012345"), "919820012345");
eq("phone bad", [normalizePhone("12345"), normalizePhone("5820012345"), normalizePhone("")], [null, null, null]);
eq("wa link", waLink("919820012345", "Hi & bye"), "https://wa.me/919820012345?text=Hi%20%26%20bye");
eq("sms link", smsLink("919820012345", "Hi"), "sms:+919820012345?&body=Hi");

// payments
const pl = buildLinkPayload({ amountRupees: 48600.5, invoiceNumber: "INV-2101", customer: "Ganesh", phone: "919820012345", business: "Sharma", suffix: "abc" });
eq("pay payload amount paise", pl.amount, 4860050);
eq("pay payload ref and contact", [pl.reference_id, pl.customer.contact, pl.notify], ["INV-2101-abc", "+919820012345", { sms: false, email: false }]);
eq("pay payload ref capped", buildLinkPayload({ amountRupees: 1, invoiceNumber: "X".repeat(60), customer: "A", business: "B", suffix: "s" }).reference_id.length, 40);
eq("pay no contact when no phone", "contact" in buildLinkPayload({ amountRupees: 1, invoiceNumber: "A", customer: "A", business: "B", suffix: "s" }).customer, false);
eq("pay status map", ["paid", "created", "partially_paid", "expired", "cancelled"].map(mapStatus), ["paid", "open", "partial", "closed", "closed"]);
eq("pay auth header", authHeader({ keyId: "k", keySecret: "s" }), "Basic " + Buffer.from("k:s").toString("base64"));
let seen: { url: string; method: string; auth: string; body?: string } | null = null;
const okFetch = (resp: unknown, ok = true, status = 200) => async (url: string, init: { method: string; headers: Record<string, string>; body?: string }) => {
  seen = { url, method: init.method, auth: init.headers.Authorization, body: init.body };
  return { ok, status, json: async () => resp };
};
const made = await createLink(okFetch({ id: "plink_1", short_url: "https://rzp.io/i/abc" }), { keyId: "k", keySecret: "s" }, pl);
eq("pay create ok", made, { ok: true, id: "plink_1", url: "https://rzp.io/i/abc" });
eq("pay create request", [seen!.url, seen!.method, JSON.parse(seen!.body as string).amount], ["https://api.razorpay.com/v1/payment_links", "POST", 4860050]);
const bad = await createLink(okFetch({ error: { description: "Authentication failed" } }, false, 401), { keyId: "k", keySecret: "s" }, pl);
eq("pay create error text", bad, { ok: false, error: "Authentication failed" });
const down = await createLink(async () => { throw new Error("net"); }, { keyId: "k", keySecret: "s" }, pl);
eq("pay create network error", down.ok, false);
const pst = await getLink(okFetch({ status: "paid" }), { keyId: "k", keySecret: "s" }, "plink_1");
eq("pay status paid", pst, { ok: true, state: "paid", raw: "paid" });
eq("pay status url", [seen!.url, seen!.method], ["https://api.razorpay.com/v1/payment_links/plink_1", "GET"]);

// whatsapp via twilio
eq("twilio addr", whatsappAddr("+91 98200 12345"), "whatsapp:+919820012345");
const tw = await sendWhatsApp(okFetch({ sid: "SM123" }), { sid: "AC1", token: "t", from: "14155238886" }, "919820012345", "Hello & thanks");
eq("twilio ok", tw, { ok: true, sid: "SM123" });
const twBody = new URLSearchParams(seen!.body as string);
eq("twilio form", [twBody.get("From"), twBody.get("To"), twBody.get("Body"), seen!.url], ["whatsapp:+14155238886", "whatsapp:+919820012345", "Hello & thanks", "https://api.twilio.com/2010-04-01/Accounts/AC1/Messages.json"]);
const twBad = await sendWhatsApp(okFetch({ message: "Number not joined" }, false, 400), { sid: "AC1", token: "t", from: "whatsapp:+14155238886" }, "919820012345", "x");
eq("twilio error", twBad, { ok: false, error: "Number not joined" });

// reminder with pay link
const rl = reminderText({ customer: "A", number: "X", amount: 1, dueDate: "d", daysLate: 3, payee: "P", upiId: "u@v", payLink: "https://rzp.io/i/abc" });
eq("reminder includes pay link", rl.includes("https://rzp.io/i/abc"), true);
eq("reminder without link has none", reminderText({ customer: "A", number: "X", amount: 1, dueDate: "d", daysLate: 3, payee: "P", upiId: "u@v" }).includes("pay online"), false);

console.log(fails ? `${fails} FAILED` : "ALL PASSED");
process.exit(fails ? 1 : 0);
