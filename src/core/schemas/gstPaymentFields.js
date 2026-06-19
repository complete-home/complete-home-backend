/** India GST fields shared by client, vendor, and employee payment records. */
export const gstPaymentFields = {
  taxMode: {
    type: String,
    enum: ["gst", "non_gst"],
    default: "gst",
  },
  supplyType: {
    type: String,
    enum: ["intra_state", "inter_state"],
    default: "intra_state",
  },
  taxableValue: { type: Number, default: 0 },
  gstPercent: { type: Number, default: 18 },
  cgstAmount: { type: Number, default: 0 },
  sgstAmount: { type: Number, default: 0 },
  igstAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: null },
};

export function formatGstFields(doc) {
  const o = doc?.toObject ? doc.toObject() : doc || {};
  return {
    taxMode: o.taxMode || "gst",
    supplyType: o.supplyType || "intra_state",
    taxableValue: o.taxableValue ?? 0,
    gstPercent: o.gstPercent ?? 18,
    cgstAmount: o.cgstAmount ?? 0,
    sgstAmount: o.sgstAmount ?? 0,
    igstAmount: o.igstAmount ?? 0,
    totalAmount: o.totalAmount ?? null,
  };
}
