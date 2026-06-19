import AppError from "../../../core/errors/AppError.js";
import { nextCode } from "../../../core/counters/counter.service.js";
import { docId } from "../../../core/http/formatHelpers.js";
import QuotationTemplate from "./quotationTemplate.model.js";
import { Product, Service } from "../masters/master.model.js";
import {
  FORMAT_TYPE_LABELS,
  QUOTATION_FORMAT_TYPES,
} from "./quotationTemplate.constants.js";
import {
  formatCategorySections,
  calcCategorySectionsGrandTotal,
} from "./quotationCategorySections.js";

function formatTemplateList(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: docId(o),
    code: o.code,
    name: o.name,
    formatType: o.formatType,
    formatTypeLabel: FORMAT_TYPE_LABELS[o.formatType] || o.formatType,
    status: o.status,
    businessModule: o.businessModule,
    lineCount: (o.lines || []).length,
    version: o.version,
    updatedAt: o.updatedAt,
  };
}

function formatTemplateDetail(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    ...formatTemplateList(doc),
    description: o.description || "",
    defaultTaxPercent: o.defaultTaxPercent || "18",
    displayDefaults: o.displayDefaults || {},
    termsText: o.termsText || "",
    notesText: o.notesText || "",
    lines: (o.lines || []).map((line) => {
      const l = line.toObject ? line.toObject() : line;
      return {
        id: l._id?.toString(),
        source: l.source,
        itemType: l.itemType,
        catalogId: l.catalogId?.toString?.() || null,
        group: l.group,
        name: l.name,
        description: l.description,
        unit: l.unit,
        defaultQuantity: l.defaultQuantity,
        defaultRate: l.defaultRate,
        marginPercentage: l.marginPercentage,
        gstPercentage: l.gstPercentage,
        hsnCode: l.hsnCode,
        isOptional: l.isOptional,
        sortOrder: l.sortOrder,
        source: l.source,
        catalogId: l.catalogId?.toString?.() || null,
      };
    }),
    paymentSchedule: o.paymentSchedule || [],
    paymentMilestones: o.paymentMilestones || [],
    selectedCategories: o.selectedCategories || [],
    categorySections: formatCategorySections(o.categorySections),
    categoryGrandTotal: String(
      calcCategorySectionsGrandTotal(o.categorySections || []),
    ),
    freezeRatesOnApply: o.freezeRatesOnApply !== false,
  };
}

async function findOr404(id) {
  const doc = await QuotationTemplate.findById(id);
  if (!doc) throw AppError.notFound("Quotation template not found");
  return doc;
}

export async function listQuotationTemplates(query = {}) {
  const filter = {};
  if (query.module) filter.businessModule = query.module;
  if (query.formatType) filter.formatType = query.formatType;
  if (query.status) filter.status = query.status;
  const rows = await QuotationTemplate.find(filter).sort({ updatedAt: -1 });
  return rows.map(formatTemplateList);
}

export async function getQuotationTemplateById(id) {
  return formatTemplateDetail(await findOr404(id));
}

export async function createQuotationTemplate(body, user) {
  const formatType = body.formatType || "with_material";
  if (!QUOTATION_FORMAT_TYPES.includes(formatType)) {
    throw AppError.badRequest("Invalid format type");
  }
  const code = await nextCode("QTM", "QTM-", 4, 1);
  const doc = await QuotationTemplate.create({
    code,
    name: body.name,
    formatType,
    status: body.status || "Active",
    businessModule: body.businessModule || "residential",
    description: body.description || "",
    defaultTaxPercent: body.defaultTaxPercent || "18",
    displayDefaults: body.displayDefaults,
    termsText: body.termsText || "",
    notesText: body.notesText || "",
    lines: body.lines || [],
    selectedCategories: body.selectedCategories || [],
    categorySections: body.categorySections || [],
    paymentMilestones: body.paymentMilestones || [],
    paymentSchedule: body.paymentSchedule || [],
    freezeRatesOnApply: body.freezeRatesOnApply !== false,
    updatedBy: user?.name || user?.userId || "",
  });
  return formatTemplateDetail(doc);
}

function buildTemplateSnapshot(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    name: o.name,
    formatType: o.formatType,
    status: o.status,
    businessModule: o.businessModule,
    description: o.description,
    defaultTaxPercent: o.defaultTaxPercent,
    displayDefaults: o.displayDefaults,
    termsText: o.termsText,
    notesText: o.notesText,
    lines: o.lines,
    selectedCategories: o.selectedCategories,
    categorySections: o.categorySections,
    paymentMilestones: o.paymentMilestones,
    paymentSchedule: o.paymentSchedule,
    freezeRatesOnApply: o.freezeRatesOnApply,
  };
}

export async function listQuotationTemplateVersions(id) {
  const doc = await findOr404(id);
  const history = [...(doc.versionHistory || [])].sort(
    (a, b) => (b.version || 0) - (a.version || 0),
  );
  return history.map((h) => {
    const entry = h.toObject ? h.toObject() : h;
    return {
      version: entry.version,
      changedAt: entry.changedAt,
      changedBy: entry.changedBy,
      changeNote: entry.changeNote || "",
      lineCount: entry.snapshot?.lines?.length ?? 0,
    };
  });
}

export async function getQuotationTemplateVersion(id, version) {
  const doc = await findOr404(id);
  const vNum = parseInt(version, 10);
  if (doc.version === vNum) return formatTemplateDetail(doc);
  const entry = (doc.versionHistory || []).find((h) => h.version === vNum);
  if (!entry?.snapshot) {
    throw AppError.notFound("Template version not found");
  }
  return {
    ...formatTemplateList(doc),
    ...entry.snapshot,
    id: docId(doc),
    version: vNum,
    isHistorical: true,
  };
}

export async function updateQuotationTemplate(id, body, user) {
  const doc = await findOr404(id);
  if (body.formatType && !QUOTATION_FORMAT_TYPES.includes(body.formatType)) {
    throw AppError.badRequest("Invalid format type");
  }

  doc.versionHistory = doc.versionHistory || [];
  doc.versionHistory.push({
    version: doc.version || 1,
    snapshot: buildTemplateSnapshot(doc),
    changedAt: new Date(),
    changedBy: user?.name || user?.userId || "",
    changeNote: body.changeNote || "",
  });
  if (doc.versionHistory.length > 50) {
    doc.versionHistory = doc.versionHistory.slice(-50);
  }

  const fields = [
    "name",
    "formatType",
    "status",
    "businessModule",
    "description",
    "defaultTaxPercent",
    "displayDefaults",
    "termsText",
    "notesText",
    "lines",
    "selectedCategories",
    "categorySections",
    "paymentMilestones",
    "paymentSchedule",
    "freezeRatesOnApply",
  ];
  for (const k of fields) {
    if (body[k] !== undefined) doc[k] = body[k];
  }
  doc.version = (doc.version || 1) + 1;
  doc.updatedBy = user?.name || user?.userId || doc.updatedBy;
  await doc.save();
  return formatTemplateDetail(doc);
}

export async function deleteQuotationTemplate(id) {
  const doc = await findOr404(id);
  doc.status = "Inactive";
  await doc.save();
  return { id: docId(doc), status: doc.status };
}

export async function duplicateQuotationTemplate(id, user) {
  const src = await findOr404(id);
  const code = await nextCode("QTM", "QTM-", 4, 1);
  const copy = await QuotationTemplate.create({
    code,
    name: `${src.name} (copy)`,
    formatType: src.formatType,
    status: "Active",
    businessModule: src.businessModule,
    description: src.description,
    defaultTaxPercent: src.defaultTaxPercent,
    displayDefaults: src.displayDefaults,
    termsText: src.termsText,
    notesText: src.notesText,
    lines: src.lines,
    selectedCategories: src.selectedCategories,
    categorySections: src.categorySections,
    paymentMilestones: src.paymentMilestones,
    paymentSchedule: src.paymentSchedule,
    freezeRatesOnApply: src.freezeRatesOnApply,
    version: 1,
    updatedBy: user?.name || user?.userId || "",
  });
  return formatTemplateDetail(copy);
}

/** Pull latest list/catalog defaults for a template line. */
export async function resolveCatalogLineDefaults(catalogId, itemType) {
  if (!catalogId) return null;
  if (itemType === "product") {
    const p = await Product.findById(catalogId);
    if (!p) return null;
    return {
      name: p.name,
      group: p.group || p.category || "",
      unit: "nos",
      rate: "0",
      gstPercentage: p.gstPercentage || "18",
      marginPercentage: p.marginPercentage || "10",
      hsnCode: "",
    };
  }
  if (itemType === "service") {
    const s = await Service.findById(catalogId);
    if (!s) return null;
    return {
      name: s.name,
      group: s.group || "",
      unit: s.unit || "nos",
      rate: s.estimatedAmount || "0",
      gstPercentage: "18",
      marginPercentage: s.marginPercentage || "10",
      hsnCode: "",
    };
  }
  return null;
}

function buildItemFromTemplateLine(l, overrides = {}) {
  const rate = overrides.rate ?? l.defaultRate ?? "0";
  return {
    itemType: l.itemType || "particular",
    source: l.source || (l.catalogId ? "catalog" : "manual"),
    catalogId: l.catalogId || null,
    group: overrides.group ?? l.group,
    title: overrides.name ?? l.name,
    name: overrides.name ?? l.name,
    description: l.description || overrides.description || "",
    unit: overrides.unit ?? l.unit ?? "nos",
    quantity: l.defaultQuantity || "1",
    rate,
    price: rate,
    marginPercentage: overrides.marginPercentage ?? l.marginPercentage,
    gstPercentage: overrides.gstPercentage ?? l.gstPercentage,
    hsnCode: overrides.hsnCode ?? l.hsnCode,
    currency: "INR",
    measurementType: "quantity",
  };
}

/**
 * Snapshot template lines into quotation items.
 * @param {object} template
 * @param {{ refreshCatalog?: boolean }} options — when true, rates/names come from Product/Service masters
 */
export async function snapshotTemplateLines(template, options = {}) {
  const { refreshCatalog = false } = options;
  const products = [];
  const services = [];
  const sorted = [...(template.lines || [])].sort(
    (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0),
  );
  for (const line of sorted) {
    const l = line.toObject ? line.toObject() : line;
    let overrides = {};
    if (refreshCatalog && l.catalogId) {
      const fromCatalog = await resolveCatalogLineDefaults(
        l.catalogId,
        l.itemType,
      );
      if (fromCatalog) overrides = fromCatalog;
    }
    const item = buildItemFromTemplateLine(l, overrides);
    if (l.itemType === "product") products.push(item);
    else services.push(item);
  }
  if (template.formatType === "services_only") {
    return { products: [], services };
  }
  return { products, services };
}

/** Refresh rates on existing quotation line items that have catalogId. */
export async function refreshQuotationLinesFromCatalog(quotation) {
  const refreshList = async (items) => {
    for (const item of items) {
      if (!item.catalogId) continue;
      const fromCatalog = await resolveCatalogLineDefaults(
        item.catalogId,
        item.itemType,
      );
      if (!fromCatalog) continue;
      if (fromCatalog.rate != null) {
        item.rate = fromCatalog.rate;
        item.price = fromCatalog.rate;
      }
      if (fromCatalog.name) item.name = item.title = fromCatalog.name;
      if (fromCatalog.unit) item.unit = fromCatalog.unit;
      if (fromCatalog.group) item.group = fromCatalog.group;
      if (fromCatalog.gstPercentage)
        item.gstPercentage = fromCatalog.gstPercentage;
      if (fromCatalog.marginPercentage)
        item.marginPercentage = fromCatalog.marginPercentage;
      if (fromCatalog.hsnCode) item.hsnCode = fromCatalog.hsnCode;
    }
  };
  await refreshList(quotation.products);
  await refreshList(quotation.services);
}
