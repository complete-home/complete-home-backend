/**
 * Parse display amounts (₹1,234.50) or numbers for rollups.
 */
export function parseMoneyToNumber(value) {
  if (value == null) return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const n = parseFloat(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function roundMoney(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Prefer explicit numeric; else parse string amount. */
export function paymentAmountNumeric({ amountNumeric, amount }) {
  if (typeof amountNumeric === "number" && Number.isFinite(amountNumeric)) {
    return roundMoney(amountNumeric);
  }
  return roundMoney(parseMoneyToNumber(amount));
}

export function amountNumericFromInput(amount) {
  return roundMoney(parseMoneyToNumber(amount));
}
