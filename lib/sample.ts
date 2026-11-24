import { addDays, todayStr } from "./format";

// [number, customer, amount, due offset in days from today, paid offset from due date or null if open]
const ROWS: [string, string, number, number, number | null][] = [
  ["INV-2001", "Ganesh Kirana Stores", 42500, -75, -1],
  ["INV-2002", "Ganesh Kirana Stores", 38200, -45, 1],
  ["INV-2003", "Shree Sai Provisions", 96000, -70, 8],
  ["INV-2004", "Shree Sai Provisions", 88400, -38, 13],
  ["INV-2005", "Mahalaxmi Traders", 71000, -60, -1],
  ["INV-2006", "Mahalaxmi Traders", 64500, -30, -2],
  ["INV-2007", "Patel General Store", 27800, -50, 2],
  ["INV-2008", "Om Sai Supermart", 154000, -55, 35],
  ["INV-2101", "Ganesh Kirana Stores", 48600, -12, null],
  ["INV-2102", "Shree Sai Provisions", 127300, -7, null],
  ["INV-2103", "Mahalaxmi Traders", 86250, 7, null],
  ["INV-2104", "Patel General Store", 32900, 11, null],
  ["INV-2105", "Om Sai Supermart", 214000, 16, null],
  ["INV-2106", "Om Sai Supermart", 99000, -40, null],
];

export function sampleInvoices(ownerId: string) {
  const today = todayStr();
  return ROWS.map(([number, customer, amount, due, paid]) => {
    const dueDate = addDays(today, due);
    return {
      owner_id: ownerId,
      number,
      customer,
      amount,
      due_date: dueDate,
      paid_at: paid === null ? null : new Date(addDays(dueDate, paid) + "T12:00:00").toISOString(),
    };
  });
}

export const SAMPLE_NUMBERS = ROWS.map((r) => r[0]);
