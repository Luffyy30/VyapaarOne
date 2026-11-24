// Indian mobile number helpers and message links. No imports.

/** Returns digits with country code, like 919820012345, or null if it is not a valid Indian mobile. */
export function normalizePhone(input: string): string | null {
  const d = input.replace(/\D/g, "");
  let ten: string | null = null;
  if (d.length === 10) ten = d;
  else if (d.length === 11 && d.startsWith("0")) ten = d.slice(1);
  else if (d.length === 12 && d.startsWith("91")) ten = d.slice(2);
  else if (d.length === 13 && d.startsWith("091")) ten = d.slice(3);
  if (!ten || !/^[6-9]\d{9}$/.test(ten)) return null;
  return "91" + ten;
}

export const waLink = (phone: string, text: string) => `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
export const smsLink = (phone: string, text: string) => `sms:+${phone}?&body=${encodeURIComponent(text)}`;
export const prettyPhone = (phone: string) => `+${phone.slice(0, 2)} ${phone.slice(2, 7)} ${phone.slice(7)}`;
