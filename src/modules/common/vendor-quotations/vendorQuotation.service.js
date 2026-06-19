import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import AppError from "../../../core/errors/AppError.js";
import { nextCode } from "../../../core/counters/counter.service.js";
import { docId } from "../../../core/http/formatHelpers.js";
import { formatQuotationDetail } from "../../residential/quotations/quotation.service.js";
import Quotation from "../../residential/quotations/quotation.model.js";
import { Vendor } from "../masters/master.model.js";
import Project from "../../residential/projects/project.model.js";
import { createObligation } from "../payables/payable.service.js";
import { amountInWordsINR } from "../../../core/utils/amountInWords.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, "../../../uploads/vendor-quotes");

function isSqftItem(it) {
  const u = String(it.unit || "").toUpperCase();
  const m = String(it.measurementType || "").toLowerCase();
  return (
    u.includes("SQFT") ||
    m === "sqft" ||
    m === "per_sqft" ||
    m === "dimension"
  );
}

function lineAmount(it) {
  if (isSqftItem(it)) {
    let area = Number(it.areaSqft);
    if (!Number.isFinite(area) || area <= 0) {
      const w = Number(it.width);
      const h = Number(it.height);
      if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
        area = w * h;
      } else area = 0;
    }
    const rate =
      parseFloat(
        String(it.ratePerSqft || it.rate || it.price || 0).replace(
          /[^\d.]/g,
          "",
        ),
      ) || 0;
    return area * rate;
  }
  const rate =
    parseFloat(String(it.rate || it.price || 0).replace(/[^\d.]/g, "")) || 0;
  const qty =
    parseFloat(String(it.quantity || 1).replace(/[^\d.]/g, "")) || 1;
  return rate * qty;
}

async function recalcAndSave(quotation) {
  const items = [...(quotation.products || []), ...(quotation.services || [])];
  let sum = 0;
  for (const it of items) sum += lineAmount(it);
  const taxPct = parseFloat(quotation.taxPercent) || 18;
  const tax = (sum * taxPct) / 100;
  const fmt = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;
  quotation.subtotal = fmt(sum);
  quotation.taxAmount = fmt(tax);
  quotation.grandTotal = fmt(sum + tax);
  quotation.amount = fmt(sum + tax);
  await quotation.save();
  return quotation;
}

function formatVendorQuoteRow(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: docId(o),
    code: o.code,
    name: o.name,
    status: o.status,
    vendorName: o.payeeLabel || o.clientDisplay || "—",
    projectRef: o.projectRef || "",
    projectId: o.projectId?.toString?.() || null,
    grandTotal: o.grandTotal || o.amount || "₹0",
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    sentAt: o.sentAt,
    sourceChannel: o.sourceChannel || "crm",
    attachmentUrls: o.attachmentUrls || [],
    payeeId: o.payeeId?.toString?.() || null,
  };
}

export async function listVendorQuotationsForStaff({
  projectId,
  vendorId,
  status,
} = {}) {
  const filter = { partyType: "vendor" };
  if (projectId && mongoose.isValidObjectId(projectId)) {
    filter.projectId = projectId;
  }
  if (vendorId && mongoose.isValidObjectId(vendorId)) {
    filter.payeeId = vendorId;
  }
  if (status) filter.status = status;
  const rows = await Quotation.find(filter).sort({ updatedAt: -1 });
  return rows.map(formatVendorQuoteRow);
}

export async function listVendorQuotationsForVendor(user) {
  if (!user.vendorId) {
    return { items: [], message: "Vendor account not linked to a vendor record." };
  }
  const rows = await Quotation.find({
    partyType: "vendor",
    payeeId: user.vendorId,
    status: { $in: ["Sent", "Changes Requested", "Draft"] },
  }).sort({ updatedAt: -1 });
  return {
    items: rows.map((r) => ({
      ...formatVendorQuoteRow(r),
      canSubmit: ["Sent", "Changes Requested"].includes(r.status),
    })),
    message: rows.length ? null : "No open quotation requests.",
  };
}

export async function getVendorQuotationById(id, user, { vendorOnly = false } = {}) {
  const row = await Quotation.findById(id);
  if (!row || row.partyType !== "vendor") {
    throw AppError.notFound("Vendor quotation not found");
  }
  if (vendorOnly) {
    if (!user.vendorId || row.payeeId?.toString() !== user.vendorId.toString()) {
      throw AppError.forbidden("Not your quotation");
    }
  }
  return formatQuotationDetail(row);
}

export async function createVendorQuotationRequest(body, user) {
  const vendorId = body.vendorId;
  if (!mongoose.isValidObjectId(vendorId)) {
    throw AppError.badRequest("Valid vendor is required");
  }
  const vendor = await Vendor.findById(vendorId);
  if (!vendor) throw AppError.notFound("Vendor not found");

  let projectName = "";
  if (body.projectId && mongoose.isValidObjectId(body.projectId)) {
    const project = await Project.findById(body.projectId).lean();
    projectName = project?.name || "";
  }

  const code = await nextCode("VQT", "VQ-", 4);
  const status = body.sendToVendor ? "Sent" : "Draft";
  const quotation = await Quotation.create({
    code,
    name: body.name || `Quote request — ${vendor.name}`,
    client: "Complete Home",
    clientDisplay: "Complete Home",
    status,
    partyType: "vendor",
    payeeKind: "vendor",
    payeeId: vendorId,
    payeeLabel: vendor.name,
    projectId: body.projectId || null,
    projectRef: body.projectRef || projectName,
    businessModule: body.businessModule || "residential",
    sourceChannel: "crm",
    notes: body.notes || "",
    services: body.lines || [],
    products: [],
    taxPercent: body.taxPercent || "18",
    sentAt: status === "Sent" ? new Date() : null,
    attachmentUrls: body.attachmentUrls || [],
  });
  await recalcAndSave(quotation);
  return formatVendorQuoteRow(quotation);
}

export async function captureVendorQuotation(body, user) {
  const vendorId = body.vendorId;
  if (!mongoose.isValidObjectId(vendorId)) {
    throw AppError.badRequest("Valid vendor is required");
  }
  const vendor = await Vendor.findById(vendorId);
  if (!vendor) throw AppError.notFound("Vendor not found");

  const lines = (body.lines || []).map((line) => ({
    itemType: "service",
    name: line.description || line.name || "Item",
    description: line.calculationNotes || line.description || "",
    unit: line.unit || "APROXE",
    quantity: String(line.quantity ?? 1),
    rate: line.rate != null ? String(line.rate) : "",
    price: line.amount != null ? String(line.amount) : line.price || "",
    group: line.group || "",
  }));

  const code = await nextCode("VQT", "VQ-", 4);
  const quotation = await Quotation.create({
    code,
    name: body.name || `Vendor quote — ${vendor.name}`,
    client: "Complete Home",
    clientDisplay: vendor.name,
    status: body.status || "Approved",
    partyType: "vendor",
    payeeKind: "vendor",
    payeeId: vendorId,
    payeeLabel: vendor.name,
    projectId: body.projectId || null,
    projectRef: body.projectRef || "",
    businessModule: body.businessModule || "residential",
    sourceChannel: "admin_capture",
    notes: body.notes || "",
    services: lines,
    products: [],
    taxPercent: body.taxPercent || "0",
    attachmentUrls: body.attachmentUrls || [],
    approvedAt: body.status === "Approved" ? new Date() : null,
  });
  await recalcAndSave(quotation);

  let obligation = null;
  if (body.createObligation) {
    const total = parseFloat(
      String(quotation.grandTotal).replace(/[^\d.]/g, ""),
    );
    obligation = await createObligation(
      {
        vendorId,
        title: body.obligationTitle || quotation.name,
        committedAmount: Number.isFinite(total) ? total : 0,
        projectId: body.projectId,
        businessModule: body.businessModule || "residential",
        notes: `From vendor quote ${quotation.code}`,
      },
      user,
    );
    quotation.linkedPayableObligationId = obligation.id;
    await quotation.save();
  }

  return {
    quotation: formatVendorQuoteRow(quotation),
    obligation,
  };
}

export async function submitVendorQuotation(id, body, user) {
  const row = await Quotation.findById(id);
  if (!row || row.partyType !== "vendor") {
    throw AppError.notFound("Vendor quotation not found");
  }
  if (!user.vendorId || row.payeeId?.toString() !== user.vendorId.toString()) {
    throw AppError.forbidden("Not your quotation");
  }
  if (!["Sent", "Changes Requested", "Draft"].includes(row.status)) {
    throw AppError.badRequest("This quotation can no longer be submitted");
  }

  const lines = (body.lines || body.services || []).map((line) => ({
    itemType: "service",
    name: line.name || line.description || "Item",
    description: line.description || "",
    unit: line.unit || "nos",
    quantity: String(line.quantity ?? 1),
    rate: line.rate != null ? String(line.rate) : "",
    price: line.price != null ? String(line.price) : "",
    group: line.group || "",
  }));

  row.services = lines;
  if (body.notes) row.notes = body.notes;
  if (body.attachmentUrls?.length) {
    row.attachmentUrls = [
      ...(row.attachmentUrls || []),
      ...body.attachmentUrls,
    ];
  }
  row.sourceChannel = "vendor_portal";
  row.status = "Draft";
  await recalcAndSave(row);
  return formatVendorQuoteRow(row);
}

export async function updateVendorQuotation(id, body, user) {
  const row = await Quotation.findById(id);
  if (!row || row.partyType !== "vendor") {
    throw AppError.notFound("Vendor quotation not found");
  }

  if (body.status === "Sent") {
    row.status = "Sent";
    row.sentAt = new Date();
  }
  if (body.status === "Approved") {
    row.status = "Approved";
    row.approvedAt = new Date();
  }
  if (body.notes !== undefined) row.notes = body.notes;

  if (body.createObligation && !row.linkedPayableObligationId) {
    const total = parseFloat(String(row.grandTotal).replace(/[^\d.]/g, ""));
    const obligation = await createObligation(
      {
        vendorId: row.payeeId,
        title: body.obligationTitle || row.name,
        committedAmount: Number.isFinite(total) ? total : 0,
        projectId: row.projectId,
        businessModule: row.businessModule,
        notes: `From vendor quote ${row.code}`,
      },
      user,
    );
    row.linkedPayableObligationId = obligation.id;
  }

  await row.save();
  return formatVendorQuoteRow(row);
}

export async function saveVendorQuoteAttachment(base64Data, filename) {
  if (!base64Data || typeof base64Data !== "string") {
    throw AppError.badRequest("Image data required");
  }
  const match = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) throw AppError.badRequest("Invalid image data URL");
  const ext = match[1] === "jpeg" ? "jpg" : match[1];
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > 4 * 1024 * 1024) {
    throw AppError.badRequest("Image must be under 4MB");
  }
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const safeName = `${Date.now()}-${(filename || "scan").replace(/[^a-zA-Z0-9.-]/g, "_")}.${ext}`;
  const filePath = path.join(UPLOAD_DIR, safeName);
  await fs.writeFile(filePath, buffer);
  return `/uploads/vendor-quotes/${safeName}`;
}

export { amountInWordsINR };
