/** Shared schemas for quotation template category sections. */
import mongoose from "mongoose";

export const measurementBlockSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    useQuantity: { type: Boolean, default: false },
    useSqft: { type: Boolean, default: false },
    quantity: { type: String, default: "" },
    pricePerQuantity: { type: String, default: "" },
    quantityTotal: { type: String, default: "" },
    height: { type: String, default: "" },
    width: { type: String, default: "" },
    depth: { type: String, default: "" },
    totalSqft: { type: String, default: "" },
    perSqftPrice: { type: String, default: "" },
    sqftTotal: { type: String, default: "" },
    lineTotal: { type: String, default: "" },
  },
  { _id: true },
);

export const categorySectionSchema = new mongoose.Schema(
  {
    categoryKey: { type: String, required: true },
    categoryLabel: { type: String, required: true },
    items: [measurementBlockSchema],
    sectionTotal: { type: String, default: "" },
  },
  { _id: true },
);

export const paymentMilestoneSchema = new mongoose.Schema(
  {
    label: { type: String, default: "" },
    percent: { type: String, default: "" },
    amount: { type: String, default: "" },
    terms: { type: String, default: "" },
  },
  { _id: false },
);

export function calcMeasurementLineTotal(item) {
  let total = 0;
  if (item.useQuantity) {
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.pricePerQuantity) || 0;
    total += qty * rate;
  }
  if (item.useSqft) {
    const h = parseFloat(item.height) || 0;
    const w = parseFloat(item.width) || 0;
    const d = parseFloat(item.depth) || 1;
    const sqft = h * w * d;
    const rate = parseFloat(item.perSqftPrice) || 0;
    total += sqft * rate;
  }
  return total;
}

export function calcSectionTotal(section) {
  return (section.items || []).reduce(
    (sum, item) => sum + calcMeasurementLineTotal(item),
    0,
  );
}

export function calcCategorySectionsGrandTotal(sections) {
  return (sections || []).reduce(
    (sum, section) => sum + calcSectionTotal(section),
    0,
  );
}

export function enrichMeasurementItem(item) {
  const next = { ...(item.toObject ? item.toObject() : item) };
  if (next.useSqft) {
    const h = parseFloat(next.height) || 0;
    const w = parseFloat(next.width) || 0;
    const d = parseFloat(next.depth) || 1;
    next.totalSqft = String(h * w * d);
    const rate = parseFloat(next.perSqftPrice) || 0;
    next.sqftTotal = String((parseFloat(next.totalSqft) || 0) * rate);
  }
  if (next.useQuantity) {
    const qty = parseFloat(next.quantity) || 0;
    const rate = parseFloat(next.pricePerQuantity) || 0;
    next.quantityTotal = String(qty * rate);
  }
  next.lineTotal = String(calcMeasurementLineTotal(next));
  return next;
}

export function enrichCategorySection(section) {
  const items = (section.items || []).map(enrichMeasurementItem);
  const total = items.reduce(
    (sum, item) => sum + (parseFloat(item.lineTotal) || 0),
    0,
  );
  return {
    ...(section.toObject ? section.toObject() : section),
    items,
    sectionTotal: String(total),
  };
}

export function formatCategorySections(sections) {
  return (sections || []).map((section) => {
    const enriched = enrichCategorySection(section);
    return {
      id: enriched._id?.toString?.() || enriched.id,
      categoryKey: enriched.categoryKey,
      categoryLabel: enriched.categoryLabel,
      items: enriched.items.map((item) => ({
        id: item._id?.toString?.() || item.id,
        title: item.title || "",
        description: item.description || "",
        useQuantity: !!item.useQuantity,
        useSqft: !!item.useSqft,
        quantity: item.quantity || "",
        pricePerQuantity: item.pricePerQuantity || "",
        quantityTotal: item.quantityTotal || "",
        height: item.height || "",
        width: item.width || "",
        depth: item.depth || "",
        totalSqft: item.totalSqft || "",
        perSqftPrice: item.perSqftPrice || "",
        sqftTotal: item.sqftTotal || "",
        lineTotal: item.lineTotal || "",
      })),
      sectionTotal: enriched.sectionTotal || "0",
    };
  });
}
