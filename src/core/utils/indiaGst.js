import { roundMoney } from "./money.js";

/**
 * Compute India GST split (CGST+SGST intra-state, IGST inter-state).
 */
export function computeIndiaGst({
  taxableValue = 0,
  gstPercent = 18,
  supplyType = "intra_state",
  taxMode = "gst",
} = {}) {
  const taxable = roundMoney(Number(taxableValue) || 0);
  if (taxMode === "non_gst") {
    return {
      taxMode: "non_gst",
      supplyType: "intra_state",
      taxableValue: taxable,
      gstPercent: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      totalAmount: taxable,
    };
  }
  const rate = Number(gstPercent) || 0;
  const tax = roundMoney((taxable * rate) / 100);
  if (supplyType === "inter_state") {
    return {
      taxMode: "gst",
      supplyType: "inter_state",
      taxableValue: taxable,
      gstPercent: rate,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: tax,
      totalAmount: roundMoney(taxable + tax),
    };
  }
  const half = roundMoney(tax / 2);
  return {
    taxMode: "gst",
    supplyType: "intra_state",
    taxableValue: taxable,
    gstPercent: rate,
    cgstAmount: half,
    sgstAmount: half,
    igstAmount: 0,
    totalAmount: roundMoney(taxable + tax),
  };
}

/** Build GST fields from API body; taxable falls back to amount. */
export function mergeGstFromBody(body, fallbackAmount = 0) {
  const taxMode = body.taxMode === "non_gst" ? "non_gst" : "gst";
  let taxable = Number(body.taxableValue);
  if (!Number.isFinite(taxable)) {
    taxable = Number(body.amount) || fallbackAmount || 0;
  }
  return computeIndiaGst({
    taxableValue: taxable,
    gstPercent: body.gstPercent ?? 18,
    supplyType:
      body.supplyType === "inter_state" ? "inter_state" : "intra_state",
    taxMode,
  });
}
