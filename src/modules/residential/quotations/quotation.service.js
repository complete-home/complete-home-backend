import AppError from "../../../core/errors/AppError.js";
import { nextCode } from "../../../core/counters/counter.service.js";
import { formatShortDate, docId } from "../../../core/http/formatHelpers.js";
import {
  calcCategorySectionsGrandTotal,
  formatCategorySections,
} from "../../common/quotation-templates/quotationCategorySections.js";
import Enquiry from "../enquiries/enquiry.model.js";
import EnquiryActivity from "../enquiries/enquiryActivity.model.js";
import Quotation from "./quotation.model.js";
import {
  canClientActOnQuotation,
  canReopenQuotation,
  canRequestRevision,
  canSendQuotation,
  isQuotationEditableByStaff,
  isQuotationLocked,
  normalizeQuotationStatus,
} from "./quotation.constants.js";

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
      } else {
        area = 0;
      }
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

const DEFAULT_QUOTE_GROUP = "General";

function buildGroupSubtotals(items) {
  const order = [];
  const amounts = {};
  for (const it of items) {
    const groupKey = String(it.group || "").trim() || DEFAULT_QUOTE_GROUP;
    if (amounts[groupKey] === undefined) {
      order.push(groupKey);
      amounts[groupKey] = 0;
    }
    amounts[groupKey] += lineAmount(it);
  }
  const fmt = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;
  return order.map((group) => ({
    group,
    amount: amounts[group],
    amountFormatted: fmt(amounts[group]),
  }));
}

function calcTotals(doc) {
  const items = [...(doc.products || []), ...(doc.services || [])];
  let sum = 0;
  for (const it of items) {
    sum += lineAmount(it);
  }
  const categorySum = calcCategorySectionsGrandTotal(doc.categorySections || []);
  if (categorySum > 0) sum = categorySum;
  const extraSum = doc.extraWorkEnabled
    ? calcCategorySectionsGrandTotal(doc.extraWorkSections || [])
    : 0;
  const totalBeforeTax = sum + extraSum;
  const taxPct = parseFloat(doc.taxPercent) || 18;
  const tax = (totalBeforeTax * taxPct) / 100;
  const fmt = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;
  return {
    subtotal: fmt(totalBeforeTax),
    taxAmount: fmt(tax),
    grandTotal: fmt(totalBeforeTax + tax),
    amount: fmt(totalBeforeTax + tax),
    subtotalNumeric: totalBeforeTax,
    categoryGrandTotal: String(categorySum),
    extraWorkGrandTotal: String(extraSum),
    groupSubtotals: buildGroupSubtotals(items),
  };
}

function formatHistoryEntry(h) {
  const o = h.toObject ? h.toObject() : h;
  return {
    id: o._id?.toString(),
    action: o.action,
    comment: o.comment || "",
    actorName: o.actorName,
    actorType: o.actorType,
    time: o.createdAt
      ? new Date(o.createdAt).toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "",
  };
}

function formatRevisionRequest(r) {
  const o = r.toObject ? r.toObject() : r;
  return {
    id: o._id?.toString(),
    comment: o.comment,
    actorName: o.actorName,
    actorType: o.actorType,
    status: o.status,
    time: o.createdAt
      ? new Date(o.createdAt).toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "",
  };
}

function formatQuotationItem(p) {
  const o = p.toObject ? p.toObject() : p;
  const lineAmt = lineAmount(o);
  const fmtLine = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;
  return {
    id: o._id?.toString(),
    itemType: o.itemType,
    source: o.source,
    catalogId: o.catalogId?.toString?.() || null,
    group: o.group,
    title: o.title,
    name: o.name || o.title,
    description: o.description,
    unit: o.unit,
    qty: o.quantity,
    quantity: o.quantity,
    rate: o.rate,
    price: o.price || o.rate,
    lineAmount: lineAmt,
    lineAmountFormatted: fmtLine(lineAmt),
    hsnCode: o.hsnCode,
    gstPercentage: o.gstPercentage,
    marginPercentage: o.marginPercentage,
    measurementType: o.measurementType,
    currency: o.currency,
    width: o.width,
    height: o.height,
    areaSqft: o.areaSqft,
    ratePerSqft: o.ratePerSqft,
  };
}

function formatQuotationList(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  const status = normalizeQuotationStatus(o.status);
  return {
    id: docId(o),
    code: o.code,
    name: o.name,
    client: o.client,
    clientDisplay: o.clientDisplay || o.client || "—",
    amount: o.amount || o.grandTotal || "₹0",
    status,
    dateCreated: formatShortDate(o.createdAt),
    enquiryId: o.enquiryId?.toString?.() || null,
    projectId: o.projectId?.toString?.() || null,
    partyType: o.partyType || "client",
    payeeLabel: o.payeeLabel || "",
    variantLabel: o.variantLabel || "",
    formatType: o.formatType || null,
    isPrimary: !!o.isPrimary,
    sortOrder: o.sortOrder ?? 0,
  };
}

export function formatQuotationDetail(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  const status = normalizeQuotationStatus(o.status);
  const allItems = [...(o.products || []), ...(o.services || [])];
  const computedGroups = buildGroupSubtotals(allItems);
  return {
    id: docId(o),
    name: o.name,
    code: o.code,
    status,
    formatType: o.formatType || null,
    variantLabel: o.variantLabel || "",
    isPrimary: !!o.isPrimary,
    templateId: o.templateId?.toString?.() || null,
    templateVersion: o.templateVersion ?? null,
    templateCode: o.templateCode || null,
    termsText: o.termsText || "",
    paymentSchedule: o.paymentSchedule || [],
    paymentMilestones: o.paymentMilestones || [],
    selectedCategories: o.selectedCategories || [],
    categorySections: formatCategorySections(o.categorySections),
    categoryGrandTotal:
      o.categoryGrandTotal ||
      String(calcCategorySectionsGrandTotal(o.categorySections || [])),
    extraWorkEnabled: !!o.extraWorkEnabled,
    extraWorkSections: formatCategorySections(o.extraWorkSections),
    extraWorkGrandTotal: String(
      calcCategorySectionsGrandTotal(o.extraWorkSections || []),
    ),
    baseAmountSnapshot: o.baseAmountSnapshot || "",
    copiedFromQuotationId: o.copiedFromQuotationId?.toString?.() || null,
    copiedFromQuotationCode: o.copiedFromQuotationCode || "",
    validityDays: o.validityDays || "",
    validUntil: o.validUntil ? formatShortDate(o.validUntil) : null,
    scopeNotes: o.scopeNotes || "",
    exclusions: o.exclusions || "",
    internalNotes: o.internalNotes || "",
    preparedBy: o.preparedBy || "",
    siteAddress: o.siteAddress || "",
    discountPercent: o.discountPercent || "",
    clientDisplay: o.clientDisplay || o.client || "—",
    createdAt: formatShortDate(o.createdAt),
    sentAt: o.sentAt ? formatShortDate(o.sentAt) : null,
    approvedAt: o.approvedAt ? formatShortDate(o.approvedAt) : null,
    rejectedAt: o.rejectedAt ? formatShortDate(o.rejectedAt) : null,
    clientComment: o.clientComment || "",
    isLocked: isQuotationLocked(status),
    canEdit: isQuotationEditableByStaff(status),
    canSend: canSendQuotation(status),
    canClientAct: canClientActOnQuotation(status),
    canRequestRevision: canRequestRevision(status),
    canReopen: canReopenQuotation(status),
    showRate: o.showRate,
    showGst: o.showGst,
    showDimension: o.showDimension,
    showGroupWise: o.showGroupWise,
    showSqftBased: !!o.showSqftBased,
    notes: o.notes || "",
    products: (o.products || []).map(formatQuotationItem),
    services: (o.services || []).map(formatQuotationItem),
    groupSubtotals: computedGroups,
    subtotal: o.subtotal,
    taxPercent: o.taxPercent,
    taxAmount: o.taxAmount,
    grandTotal: o.grandTotal,
    approvalHistory: (o.approvalHistory || []).map(formatHistoryEntry),
    revisionRequests: (o.revisionRequests || []).map(formatRevisionRequest),
    partyType: o.partyType || "client",
    payeeId: o.payeeId?.toString?.() || null,
    payeeLabel: o.payeeLabel || "",
    projectId: o.projectId?.toString?.() || null,
    projectRef: o.projectRef || "",
    sourceChannel: o.sourceChannel || "crm",
    attachmentUrls: o.attachmentUrls || [],
    linkedPayableObligationId:
      o.linkedPayableObligationId?.toString?.() || null,
  };
}

async function logQuotationActivity(enquiryId, title, desc, actor) {
  await EnquiryActivity.create({
    enquiryId,
    title,
    desc,
    actor: actor || "EMPLOYEE - System",
  });
}

async function resolveEnquiryQuotation(enquiryId, quotationId) {
  if (quotationId) {
    const quotation = await Quotation.findOne({
      _id: quotationId,
      enquiryId,
    });
    if (!quotation) {
      throw AppError.notFound("Quotation not found for this enquiry");
    }
    return quotation;
  }
  let quotation = await Quotation.findOne({ enquiryId, isPrimary: true });
  if (!quotation) {
    quotation = await Quotation.findOne({ enquiryId }).sort({
      sortOrder: 1,
      createdAt: 1,
    });
  }
  if (!quotation) {
    throw AppError.notFound("Quotation not found for this enquiry");
  }
  return quotation;
}

async function assertNoOtherSent(enquiryId, excludeId) {
  const other = await Quotation.findOne({
    enquiryId,
    status: "Sent",
    _id: { $ne: excludeId },
  });
  if (other) {
    throw AppError.badRequest(
      `Another variant (${other.variantLabel || other.code}) is already sent. Only one quotation can be sent at a time.`,
    );
  }
}

export async function listEnquiryQuotations(enquiryId) {
  const rows = await Quotation.find({ enquiryId }).sort({
    sortOrder: 1,
    createdAt: 1,
  });
  return rows.map(formatQuotationList);
}

function assertStaffCanEdit(quotation) {
  const status = normalizeQuotationStatus(quotation.status);
  if (!isQuotationEditableByStaff(status)) {
    throw AppError.badRequest(
      `Quotation cannot be edited while status is "${status}". Reopen or wait for client feedback.`,
    );
  }
}

function pushHistory(quotation, entry) {
  quotation.approvalHistory.push(entry);
}

export async function listQuotations({ moduleId } = {}) {
  const filter = moduleId ? { businessModule: moduleId } : {};
  const rows = await Quotation.find(filter).sort({ updatedAt: -1 });
  return rows.map(formatQuotationList);
}

export async function getQuotationById(id) {
  const row = await Quotation.findById(id);
  if (!row) throw AppError.notFound("Quotation not found");
  return formatQuotationList(row);
}

export async function getEnquiryQuotation(enquiryId, quotationId) {
  if (quotationId) {
    const row = await Quotation.findOne({ _id: quotationId, enquiryId });
    if (!row) return null;
    return formatQuotationDetail(row);
  }
  let row = await Quotation.findOne({ enquiryId, isPrimary: true });
  if (!row) {
    row = await Quotation.findOne({ enquiryId }).sort({
      sortOrder: 1,
      createdAt: 1,
    });
  }
  if (!row) return null;
  return formatQuotationDetail(row);
}

export async function createQuotation(body) {
  const code = await nextCode("QUO", "QT-", 4, 5235);
  const quotation = await Quotation.create({
    code,
    name: body.name,
    client: body.client || "",
    clientDisplay: body.clientDisplay || body.client || "—",
    status: "Draft",
    enquiryId: body.enquiryId,
    projectId: body.projectId,
    businessModule: body.businessModule || "residential",
    products: body.products || [],
    services: body.services || [],
    taxPercent: body.taxPercent,
  });
  const totals = calcTotals(quotation);
  Object.assign(quotation, totals);
  await quotation.save();
  return formatQuotationList(quotation);
}

export async function applyTemplateToEnquiry(enquiryId, body, user) {
  const QuotationTemplateModel = (
    await import("../../common/quotation-templates/quotationTemplate.model.js")
  ).default;

  const templateDoc = await QuotationTemplateModel.findById(body.templateId);
  if (!templateDoc || templateDoc.status !== "Active") {
    throw AppError.notFound("Quotation template not found or inactive");
  }

  const enquiry = await Enquiry.findById(enquiryId);
  if (!enquiry) throw AppError.notFound("Enquiry not found");

  const existingCount = await Quotation.countDocuments({ enquiryId });
  const variantLabel =
    body.variantLabel?.trim() || templateDoc.name || "Quotation variant";
  const setPrimary =
    body.setPrimary === true ||
    body.setPrimary === "true" ||
    existingCount === 0;

  if (setPrimary) {
    await Quotation.updateMany({ enquiryId }, { $set: { isPrimary: false } });
  }

  const refreshCatalog =
    body.refreshCatalog === true ||
    body.refreshCatalog === "true" ||
    templateDoc.freezeRatesOnApply === false;
  const { snapshotTemplateLines } =
    await import("../../common/quotation-templates/quotationTemplate.service.js");
  const { products, services } = await snapshotTemplateLines(templateDoc, {
    refreshCatalog,
  });
  const display = templateDoc.displayDefaults || {};
  const code = await nextCode("QUO", "QT-", 4, 5235);

  const quotation = await Quotation.create({
    code,
    name: body.name || templateDoc.name,
    client: enquiry.clientName || "",
    clientDisplay: enquiry.clientName || enquiry.name || "—",
    enquiryId,
    status: "Draft",
    businessModule: templateDoc.businessModule || "residential",
    templateId: templateDoc._id,
    templateVersion: templateDoc.version,
    templateCode: templateDoc.code,
    formatType: templateDoc.formatType,
    variantLabel,
    isPrimary: setPrimary,
    sortOrder: existingCount,
    termsText: templateDoc.termsText || "",
    notes: templateDoc.notesText || "",
    paymentSchedule: templateDoc.paymentSchedule || [],
    paymentMilestones: templateDoc.paymentMilestones || [],
    selectedCategories: templateDoc.selectedCategories || [],
    categorySections: templateDoc.categorySections || [],
    showRate: display.showRate ?? true,
    showGst: display.showGst ?? true,
    showDimension: display.showDimension ?? true,
    showGroupWise: display.showGroupWise ?? true,
    taxPercent: templateDoc.defaultTaxPercent || "18",
    products,
    services,
  });

  const totals = calcTotals(quotation);
  Object.assign(quotation, totals);
  await quotation.save();

  await logQuotationActivity(
    enquiryId,
    "Quotation created from template",
    `${quotation.code} — ${variantLabel}`,
    user?.name ? `EMPLOYEE - ${user.name}` : undefined,
  );

  return formatQuotationDetail(quotation);
}

export async function setPrimaryEnquiryQuotation(enquiryId, quotationId) {
  const quotation = await resolveEnquiryQuotation(enquiryId, quotationId);
  await Quotation.updateMany({ enquiryId }, { $set: { isPrimary: false } });
  quotation.isPrimary = true;
  await quotation.save();
  return formatQuotationDetail(quotation);
}

function cloneQuotationLineItems(items) {
  return (items || []).map((item) => {
    const raw = item.toObject ? item.toObject() : { ...item };
    const { _id, ...rest } = raw;
    return rest;
  });
}

/** Copy an existing enquiry quotation into a new Draft with a unique code. */
export async function duplicateEnquiryQuotation(enquiryId, body, user) {
  const sourceId = body.sourceQuotationId;
  if (!sourceId) {
    throw AppError.badRequest("sourceQuotationId is required");
  }

  const src = await Quotation.findOne({ _id: sourceId, enquiryId });
  if (!src) {
    throw AppError.notFound("Source quotation not found for this enquiry");
  }

  const enquiry = await Enquiry.findById(enquiryId);
  if (!enquiry) throw AppError.notFound("Enquiry not found");

  const existingCount = await Quotation.countDocuments({ enquiryId });
  const setPrimary =
    body.setPrimary === true ||
    body.setPrimary === "true" ||
    (existingCount === 0 && body.setPrimary !== false);

  if (setPrimary) {
    await Quotation.updateMany({ enquiryId }, { $set: { isPrimary: false } });
  }

  const mode = body.mode === "copy" ? "copy" : "duplicate";
  const variantLabel =
    body.variantLabel?.trim() ||
    (mode === "copy"
      ? src.variantLabel || src.name
      : `${src.variantLabel || src.name} (copy)`.trim());
  const name =
    body.name?.trim() ||
    (mode === "copy" ? src.name : `${src.name} (copy)`.trim());

  const code = await nextCode("QUO", "QT-", 4, 5235);

  const quotation = await Quotation.create({
    code,
    name,
    client: src.client || enquiry.clientName || "",
    clientDisplay:
      src.clientDisplay || enquiry.clientName || enquiry.name || "—",
    enquiryId,
    status: "Draft",
    businessModule: src.businessModule || "residential",
    formatType: src.formatType,
    variantLabel,
    isPrimary: setPrimary,
    sortOrder: existingCount,
    templateId: src.templateId,
    templateVersion: src.templateVersion,
    templateCode: src.templateCode,
    termsText: src.termsText || "",
    paymentSchedule: src.paymentSchedule || [],
    showRate: src.showRate,
    showGst: src.showGst,
    showDimension: src.showDimension,
    showGroupWise: src.showGroupWise,
    taxPercent: src.taxPercent || "18",
    discountPercent: src.discountPercent || "",
    validityDays: src.validityDays || "",
    validUntil: src.validUntil || null,
    scopeNotes: src.scopeNotes || "",
    exclusions: src.exclusions || "",
    internalNotes: src.internalNotes || "",
    preparedBy: src.preparedBy || "",
    siteAddress: src.siteAddress || src.client || "",
    products: cloneQuotationLineItems(src.products),
    services: cloneQuotationLineItems(src.services),
    copiedFromQuotationId: src._id,
    copiedFromQuotationCode: src.code,
    sentAt: null,
    approvedAt: null,
    rejectedAt: null,
    clientComment: "",
    approvalHistory: [],
    revisionRequests: [],
  });

  const totals = calcTotals(quotation);
  Object.assign(quotation, totals);
  await quotation.save();

  await logQuotationActivity(
    enquiryId,
    mode === "copy" ? "Quotation copied" : "Quotation duplicated",
    `${quotation.code} from ${src.code}`,
    user?.name ? `EMPLOYEE - ${user.name}` : undefined,
  );

  return formatQuotationDetail(quotation);
}

export async function upsertEnquiryQuotation(enquiryId, body) {
  const quotationId = body.quotationId;
  let quotation = quotationId
    ? await Quotation.findOne({ _id: quotationId, enquiryId })
    : await Quotation.findOne({ enquiryId });
  if (!quotation) {
    const code = await nextCode("QUO", "QT-", 4, 5235);
    const count = await Quotation.countDocuments({ enquiryId });
    quotation = new Quotation({
      code,
      name: body.name || "Quotation",
      enquiryId,
      status: "Draft",
      businessModule: body.businessModule || "residential",
      isPrimary: count === 0,
      sortOrder: count,
    });
  } else {
    assertStaffCanEdit(quotation);
  }
  const allowed = [
    "name",
    "variantLabel",
    "formatType",
    "client",
    "clientDisplay",
    "showRate",
    "showGst",
    "showDimension",
    "showGroupWise",
    "showSqftBased",
    "notes",
    "products",
    "services",
    "taxPercent",
    "discountPercent",
    "termsText",
    "paymentSchedule",
    "paymentMilestones",
    "selectedCategories",
    "categorySections",
    "categoryGrandTotal",
    "extraWorkEnabled",
    "extraWorkSections",
    "baseAmountSnapshot",
    "validityDays",
    "validUntil",
    "scopeNotes",
    "exclusions",
    "internalNotes",
    "preparedBy",
    "siteAddress",
  ];
  for (const k of allowed) {
    if (body[k] !== undefined) quotation[k] = body[k];
  }
  const totals = calcTotals(quotation);
  Object.assign(quotation, totals);
  await quotation.save();
  return formatQuotationDetail(quotation);
}

export async function addQuotationItem(enquiryId, body) {
  const quotationId = body.quotationId;
  let quotation = quotationId
    ? await Quotation.findOne({ _id: quotationId, enquiryId })
    : await Quotation.findOne({ enquiryId });
  if (!quotation) {
    const code = await nextCode("QUO", "QT-", 4, 5235);
    const count = await Quotation.countDocuments({ enquiryId });
    quotation = await Quotation.create({
      code,
      name: "Quotation",
      enquiryId,
      status: "Draft",
      products: [],
      services: [],
      isPrimary: count === 0,
      sortOrder: count,
    });
  } else {
    assertStaffCanEdit(quotation);
  }
  const sqftAmt = isSqftItem(body)
    ? lineAmount({
        ...body,
        ratePerSqft: body.ratePerSqft ?? body.rate,
      })
    : null;
  const item = {
    itemType: body.itemType || "particular",
    source: body.catalogId ? "catalog" : body.source || "manual",
    catalogId: body.catalogId || null,
    group: body.group,
    title: body.title,
    name: body.itemName || body.particular || body.title || body.name,
    description: body.description,
    hsnCode: body.hsnCode,
    gstPercentage: body.gstPercentage,
    rate: body.ratePerSqft ?? body.rate,
    ratePerSqft: body.ratePerSqft ?? body.rate,
    currency: body.currency || "INR",
    marginPercentage: body.marginPercentage,
    unit: body.unit || "PER SQFT",
    measurementType: body.measurementType || "sqft",
    quantity: body.quantity || body.areaSqft,
    width: body.width != null && body.width !== "" ? Number(body.width) : null,
    height:
      body.height != null && body.height !== "" ? Number(body.height) : null,
    areaSqft:
      body.areaSqft != null && body.areaSqft !== ""
        ? Number(body.areaSqft)
        : null,
    price: body.price ?? (sqftAmt != null ? String(sqftAmt) : body.rate),
  };
  if (body.itemType === "product") {
    quotation.products.push(item);
  } else {
    quotation.services.push(item);
  }
  if (body.itemType === "product" && body.catalogId) {
    try {
      const { adjustProductStock } =
        await import("../../common/masters/master.service.js");
      const deduct = Number(body.quantity) || 1;
      await adjustProductStock(body.catalogId, -deduct, {
        note: `Quotation ${quotation.code}`,
        refType: "quotation",
        refId: quotation._id.toString(),
      });
    } catch {
      /* catalog may not be a product master record */
    }
  }
  const totals = calcTotals(quotation);
  Object.assign(quotation, totals);
  await quotation.save();

  const EnquiryActivity = (
    await import("../enquiries/enquiryActivity.model.js")
  ).default;
  const label = item.name || item.title || "Item";
  await EnquiryActivity.create({
    enquiryId,
    title: "Quotation item added",
    desc: label,
    actor: "EMPLOYEE - System",
  });

  return formatQuotationDetail(quotation);
}

export async function sendEnquiryQuotation(enquiryId, user, quotationId) {
  const quotation = await resolveEnquiryQuotation(enquiryId, quotationId);
  await assertNoOtherSent(enquiryId, quotation._id);
  const status = normalizeQuotationStatus(quotation.status);
  if (!canSendQuotation(status)) {
    throw AppError.badRequest(
      `Cannot send quotation while status is "${status}".`,
    );
  }
  quotation.status = "Sent";
  quotation.sentAt = new Date();
  await quotation.save();
  await logQuotationActivity(
    enquiryId,
    "Quotation sent to client",
    `${quotation.code} is awaiting client review.`,
    user?.name ? `EMPLOYEE - ${user.name}` : undefined,
  );

  const enquiry = await Enquiry.findById(enquiryId).lean();
  if (enquiry) {
    const { notifyQuotationSent } =
      await import("../../common/notifications/notification.service.js");
    await notifyQuotationSent({ enquiry, quotation });
  }

  return formatQuotationDetail(quotation);
}

export async function reopenEnquiryQuotation(enquiryId, user, quotationId) {
  const quotation = await resolveEnquiryQuotation(enquiryId, quotationId);
  const status = normalizeQuotationStatus(quotation.status);
  if (!canReopenQuotation(status)) {
    throw AppError.badRequest(
      `Only rejected quotations can be reopened (current: "${status}").`,
    );
  }
  quotation.status = "Draft";
  quotation.rejectedAt = undefined;
  quotation.clientComment = "";
  pushHistory(quotation, {
    action: "reopen",
    comment: "Reopened for editing by staff",
    actorName: user?.name || user?.userId || "Staff",
    actorType: "employee",
  });
  await quotation.save();
  await logQuotationActivity(
    enquiryId,
    "Quotation reopened",
    `${quotation.code} moved back to Draft.`,
    user?.name ? `EMPLOYEE - ${user.name}` : undefined,
  );
  return formatQuotationDetail(quotation);
}

function resolveActor(user, actorType = "employee") {
  const name = user?.name || user?.userId || "User";
  return {
    actorName: name,
    actorType: user?.userType === "client" ? "client" : actorType,
    actorLabel:
      user?.userType === "client" ? `CLIENT - ${name}` : `EMPLOYEE - ${name}`,
  };
}

/**
 * Client (or staff on behalf of client) quotation decision.
 * @param {string} enquiryId
 * @param {{ action: 'approve'|'reject'|'request_changes'|'request_revision', comment?: string }} payload
 * @param {object} user - req.user
 */
export async function clientQuotationAction(enquiryId, payload, user) {
  const { action, comment = "", quotationId } = payload;
  const trimmedComment = String(comment || "").trim();
  const quotation = await resolveEnquiryQuotation(enquiryId, quotationId);
  const status = normalizeQuotationStatus(quotation.status);
  const { actorName, actorType, actorLabel } = resolveActor(user);

  if (action === "request_revision") {
    if (!canRequestRevision(status)) {
      throw AppError.badRequest(
        "Revision requests are only allowed after the quotation is approved.",
      );
    }
    if (!trimmedComment) {
      throw AppError.badRequest("Please describe the changes you need.");
    }
    quotation.revisionRequests.push({
      comment: trimmedComment,
      actorName,
      actorType,
      status: "open",
    });
    quotation.clientComment = trimmedComment;
    pushHistory(quotation, {
      action: "request_revision",
      comment: trimmedComment,
      actorName,
      actorType,
    });
    await quotation.save();
    await logQuotationActivity(
      enquiryId,
      "Client requested quotation revision",
      trimmedComment,
      actorLabel,
    );
    return formatQuotationDetail(quotation);
  }

  if (!canClientActOnQuotation(status)) {
    throw AppError.badRequest(
      `Client actions are only available when quotation status is "Sent" (current: "${status}").`,
    );
  }

  if (action === "approve") {
    quotation.status = "Approved";
    quotation.approvedAt = new Date();
    quotation.clientComment = trimmedComment;
    pushHistory(quotation, {
      action: "approve",
      comment: trimmedComment,
      actorName,
      actorType,
    });
    await quotation.save();
    await logQuotationActivity(
      enquiryId,
      "Quotation approved by client",
      trimmedComment || `${quotation.code} approved. Amount locked.`,
      actorLabel,
    );
    return formatQuotationDetail(quotation);
  }

  if (action === "reject") {
    if (!trimmedComment) {
      throw AppError.badRequest(
        "A comment is required when rejecting a quotation.",
      );
    }
    quotation.status = "Rejected";
    quotation.rejectedAt = new Date();
    quotation.clientComment = trimmedComment;
    pushHistory(quotation, {
      action: "reject",
      comment: trimmedComment,
      actorName,
      actorType,
    });
    await quotation.save();
    await logQuotationActivity(
      enquiryId,
      "Quotation rejected by client",
      trimmedComment,
      actorLabel,
    );
    return formatQuotationDetail(quotation);
  }

  if (action === "request_changes") {
    if (!trimmedComment) {
      throw AppError.badRequest(
        "Please describe the changes you want before approval.",
      );
    }
    quotation.status = "Changes Requested";
    quotation.clientComment = trimmedComment;
    pushHistory(quotation, {
      action: "request_changes",
      comment: trimmedComment,
      actorName,
      actorType,
    });
    await quotation.save();
    await logQuotationActivity(
      enquiryId,
      "Client requested quotation changes",
      trimmedComment,
      actorLabel,
    );
    return formatQuotationDetail(quotation);
  }

  throw AppError.badRequest(`Unknown quotation action: ${action}`);
}

/** @deprecated Use clientQuotationAction with action approve */
export async function approveEnquiryQuotation(enquiryId, user, comment) {
  return clientQuotationAction(enquiryId, { action: "approve", comment }, user);
}

export async function updateQuotationItem(
  enquiryId,
  quotationId,
  itemId,
  body,
) {
  const quotation = await resolveEnquiryQuotation(enquiryId, quotationId);
  assertStaffCanEdit(quotation);
  const listName = body.listType === "product" ? "products" : "services";
  const item = quotation[listName].id(itemId);
  if (!item) throw AppError.notFound("Line item not found");

  const fields = [
    "group",
    "title",
    "name",
    "description",
    "hsnCode",
    "gstPercentage",
    "rate",
    "ratePerSqft",
    "currency",
    "marginPercentage",
    "unit",
    "measurementType",
    "quantity",
    "width",
    "height",
    "areaSqft",
    "catalogId",
    "source",
  ];
  for (const k of fields) {
    if (body[k] !== undefined) item[k] = body[k];
  }
  if (body.itemName) item.name = body.itemName;
  if (body.ratePerSqft !== undefined) {
    item.ratePerSqft = body.ratePerSqft;
    item.rate = body.ratePerSqft;
  }
  if (body.rate !== undefined) item.price = body.rate;
  if (body.price !== undefined) item.price = body.price;
  if (isSqftItem(body) || isSqftItem(item)) {
    item.price = String(lineAmount({ ...item.toObject?.() || item, ...body }));
  }

  const totals = calcTotals(quotation);
  Object.assign(quotation, totals);
  await quotation.save();
  return formatQuotationDetail(quotation);
}

export async function deleteQuotationItem(
  enquiryId,
  quotationId,
  itemId,
  listType,
) {
  const quotation = await resolveEnquiryQuotation(enquiryId, quotationId);
  assertStaffCanEdit(quotation);
  const listName = listType === "product" ? "products" : "services";
  const item = quotation[listName].id(itemId);
  if (!item) throw AppError.notFound("Line item not found");
  if (listType === "product" && item.catalogId) {
    try {
      const { adjustProductStock } =
        await import("../../common/masters/master.service.js");
      await adjustProductStock(item.catalogId, Number(item.quantity) || 1, {
        note: `Removed from quotation ${quotation.code}`,
        refType: "quotation",
        refId: quotation._id.toString(),
      });
    } catch {
      /* ignore */
    }
  }
  item.deleteOne();
  const totals = calcTotals(quotation);
  Object.assign(quotation, totals);
  await quotation.save();
  return formatQuotationDetail(quotation);
}

export async function refreshQuotationFromCatalog(
  enquiryId,
  quotationId,
  user,
) {
  const quotation = await resolveEnquiryQuotation(enquiryId, quotationId);
  assertStaffCanEdit(quotation);
  const { refreshQuotationLinesFromCatalog } =
    await import("../../common/quotation-templates/quotationTemplate.service.js");
  await refreshQuotationLinesFromCatalog(quotation);
  const totals = calcTotals(quotation);
  Object.assign(quotation, totals);
  await quotation.save();
  await logQuotationActivity(
    enquiryId,
    "Quotation rates refreshed from catalog",
    `${quotation.code} — latest product/service prices applied.`,
    user?.name ? `EMPLOYEE - ${user.name}` : undefined,
  );
  return formatQuotationDetail(quotation);
}

export async function resetQuotationToTemplate(
  enquiryId,
  quotationId,
  body,
  user,
) {
  const quotation = await resolveEnquiryQuotation(enquiryId, quotationId);
  assertStaffCanEdit(quotation);
  if (!quotation.templateId) {
    throw AppError.badRequest(
      "This quotation was not created from a template.",
    );
  }
  const QuotationTemplateModel = (
    await import("../../common/quotation-templates/quotationTemplate.model.js")
  ).default;
  const templateDoc = await QuotationTemplateModel.findById(
    quotation.templateId,
  );
  if (!templateDoc) {
    throw AppError.notFound("Source template not found");
  }
  const refreshCatalog =
    body?.refreshCatalog === true || body?.refreshCatalog === "true";
  const { snapshotTemplateLines } =
    await import("../../common/quotation-templates/quotationTemplate.service.js");
  const { products, services } = await snapshotTemplateLines(templateDoc, {
    refreshCatalog,
  });
  const display = templateDoc.displayDefaults || {};
  quotation.products = products;
  quotation.services = services;
  quotation.templateVersion = templateDoc.version;
  quotation.templateCode = templateDoc.code;
  quotation.formatType = templateDoc.formatType;
  quotation.termsText = templateDoc.termsText || quotation.termsText;
  quotation.notes = templateDoc.notesText || quotation.notes;
  quotation.paymentSchedule = templateDoc.paymentSchedule || [];
  quotation.paymentMilestones = templateDoc.paymentMilestones || [];
  quotation.selectedCategories = templateDoc.selectedCategories || [];
  quotation.categorySections = templateDoc.categorySections || [];
  quotation.taxPercent = templateDoc.defaultTaxPercent || quotation.taxPercent;
  quotation.showRate = display.showRate ?? quotation.showRate;
  quotation.showGst = display.showGst ?? quotation.showGst;
  quotation.showDimension = display.showDimension ?? quotation.showDimension;
  quotation.showGroupWise = display.showGroupWise ?? quotation.showGroupWise;
  const totals = calcTotals(quotation);
  Object.assign(quotation, totals);
  await quotation.save();
  await logQuotationActivity(
    enquiryId,
    "Quotation reset to template",
    `${quotation.code} ← ${templateDoc.code} v${templateDoc.version}`,
    user?.name ? `EMPLOYEE - ${user.name}` : undefined,
  );
  return formatQuotationDetail(quotation);
}
