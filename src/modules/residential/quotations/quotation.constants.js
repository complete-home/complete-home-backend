export const QUOTATION_STATUSES = [
  "Draft",
  "Sent",
  "Changes Requested",
  "Approved",
  "Rejected",
];

export const CLIENT_QUOTATION_ACTIONS = [
  "approve",
  "reject",
  "request_changes",
  "request_revision",
];

/** Staff may edit line items / settings */
export function isQuotationEditableByStaff(status) {
  const s = normalizeQuotationStatus(status);
  return ["Draft", "Changes Requested"].includes(s);
}

export function isQuotationLocked(status) {
  return normalizeQuotationStatus(status) === "Approved";
}

export function canSendQuotation(status) {
  return isQuotationEditableByStaff(status);
}

export function canClientActOnQuotation(status) {
  return normalizeQuotationStatus(status) === "Sent";
}

export function canRequestRevision(status) {
  return normalizeQuotationStatus(status) === "Approved";
}

export function canReopenQuotation(status) {
  return normalizeQuotationStatus(status) === "Rejected";
}

export function normalizeQuotationStatus(status) {
  if (!status || status === "Active") return "Draft";
  return status;
}
