import AppError from "../../../core/errors/AppError.js";
import { nextCode } from "../../../core/counters/counter.service.js";
import { getInitials, docId } from "../../../core/http/formatHelpers.js";
import { Client, Vendor, Product, Service, Material } from "./master.model.js";
import ProductCategory from "./productCategory.model.js";

async function findOr404(Model, id, label) {
  const doc = await Model.findById(id);
  if (!doc) throw AppError.notFound(`${label} not found`);
  return doc;
}

function fmtClient(d) {
  const o = d.toObject ? d.toObject() : d;
  return {
    id: docId(o),
    code: o.code,
    name: o.name,
    status: o.status,
    initials: o.initials || getInitials(o.name),
    email: o.email,
    mobile: o.mobile,
    city: o.city,
    project: o.project,
  };
}

function fmtVendor(d) {
  const o = d.toObject ? d.toObject() : d;
  return {
    id: docId(o),
    code: o.code,
    name: o.name,
    type: o.type || o.vendorTypes?.[0] || "",
    vendorTypes: o.vendorTypes || [],
    tradeDesignations: o.tradeDesignations || [],
    category: o.category,
    contact: o.contact,
    status: o.status,
    profile: o.profile || {},
  };
}

function slugPart(value, len = 4) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, len) || "STD";
}

async function buildMaterialCode({ category, colourName, colourCode }) {
  const cat = slugPart(category, 3);
  const colour = slugPart(colourCode || colourName, 4);
  const prefix = `MAT-${cat}-${colour}`;
  const existing = await Material.countDocuments({
    code: new RegExp(`^${prefix}-`, "i"),
  });
  return `${prefix}-${String(existing + 1).padStart(4, "0")}`;
}

function fmtMaterial(d) {
  const o = d.toObject ? d.toObject() : d;
  return {
    id: docId(o),
    code: o.code,
    category: o.category,
    company: o.company || "",
    variant: o.variant || "",
    colourName: o.colourName || "",
    colourCode: o.colourCode || "",
    status: o.status,
    businessModule: o.businessModule || "residential",
  };
}

function fmtProduct(d) {
  const o = d.toObject ? d.toObject() : d;
  const qty = o.stockQuantity ?? 0;
  const low = o.lowStockAlert ?? 0;
  return {
    id: docId(o),
    code: o.code,
    name: o.name,
    group: o.group,
    category: o.category,
    brand: o.brand,
    imageUrl: o.imageUrl || "",
    unit: o.unit || "",
    purchasePrice: o.purchasePrice || "0",
    salePrice: o.salePrice || "0",
    gst18: !!o.gst18,
    stock: o.stock,
    openingStock: o.openingStock ?? 0,
    stockQuantity: qty,
    lowStockAlert: low,
    isLowStock: low > 0 && qty <= low,
    hsnCode: o.hsnCode || "",
    asOfDate: o.asOfDate,
    stockMovements: o.stockMovements || [],
    marginPercentage: o.marginPercentage,
    gstPercentage: o.gstPercentage,
    status: o.status,
    vendorId: o.vendorId?.toString?.() || null,
    vendorName: o.vendorName || "",
  };
}

export async function getProductStockAsOf(productId, asOfDate) {
  const doc = await findOr404(Product, productId, "Product");
  const target = asOfDate ? new Date(asOfDate) : new Date();
  const movements = [...(doc.stockMovements || [])].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );
  const entry = movements.find((m) => new Date(m.date) <= target);
  if (entry) return entry.quantityAfter ?? doc.stockQuantity ?? 0;
  return doc.openingStock ?? doc.stockQuantity ?? 0;
}

export async function adjustProductStock(
  productId,
  delta,
  { note = "", refType = "", refId = "" } = {},
) {
  const doc = await findOr404(Product, productId, "Product");
  const current = doc.stockQuantity ?? 0;
  const next = Math.max(0, current + Number(delta));
  doc.stockQuantity = next;
  doc.stock = next > 0 ? "In Stock" : "Out of Stock";
  doc.stockMovements = doc.stockMovements || [];
  doc.stockMovements.push({
    date: new Date(),
    quantityAfter: next,
    delta: Number(delta),
    note,
    refType,
    refId,
  });
  await doc.save();
  return fmtProduct(doc);
}

function fmtService(d) {
  const o = d.toObject ? d.toObject() : d;
  return {
    id: docId(o),
    code: o.code,
    name: o.name,
    unit: o.unit,
    group: o.group,
    displayOnEnquiry: o.displayOnEnquiry,
    estimatedAmount: o.estimatedAmount,
    marginPercentage: o.marginPercentage,
    status: o.status,
  };
}

export async function listClients() {
  return (await Client.find().sort({ name: 1 })).map(fmtClient);
}

export async function listVendors() {
  return (await Vendor.find().sort({ name: 1 }).lean()).map(fmtVendor);
}

export async function listMaterials({ module } = {}) {
  const filter = {};
  if (module) filter.businessModule = module;
  return (await Material.find(filter).sort({ category: 1, company: 1 }).lean()).map(
    fmtMaterial,
  );
}

export async function listProducts() {
  return (await Product.find().sort({ name: 1 })).map(fmtProduct);
}

export async function listServices() {
  return (await Service.find().sort({ name: 1 })).map(fmtService);
}

export async function createVendor(body) {
  const code = body.code || (await nextCode("VND", "VND-", 3, 1));
  const vendorTypes = body.vendorTypes || (body.type ? [body.type] : []);
  const doc = await Vendor.create({
    code,
    name: body.name,
    type: vendorTypes[0] || body.type || "",
    vendorTypes,
    tradeDesignations: body.tradeDesignations || [],
    contact: body.contact || body.profile?.phone || "",
    status: body.status || "Active",
    profile: body.profile || {},
  });
  return fmtVendor(doc);
}

export async function createClient(body) {
  const code = await nextCode("CLT", "CLT-", 4, 2200);
  const doc = await Client.create({
    code,
    name: body.name,
    status: body.status || "Active",
    initials: getInitials(body.name),
    email: body.email,
    mobile: body.mobile,
    city: body.city,
    project: body.project,
  });
  return fmtClient(doc);
}

export async function createProduct(body) {
  const code = await nextCode("PRD", "PRD-", 3, 100);
  const opening = Number(body.openingStock) || 0;
  const asOf = body.asOfDate ? new Date(body.asOfDate) : new Date();
  const doc = await Product.create({
    code,
    name: body.name,
    group: body.group || body.category || "General",
    category: body.category || body.group || "General",
    brand: body.brand,
    imageUrl: body.imageUrl || "",
    unit: body.unit || "",
    purchasePrice: body.purchasePrice || "0",
    salePrice: body.salePrice || "0",
    gst18: !!body.gst18,
    gstPercentage: body.gst18 ? "18" : body.gstPercentage || "0",
    openingStock: opening,
    stockQuantity: opening,
    lowStockAlert: Number(body.lowStockAlert) || 0,
    hsnCode: body.hsnCode || "",
    asOfDate: asOf,
    stock: opening > 0 ? "In Stock" : "Out of Stock",
    stockMovements: opening
      ? [{ date: asOf, quantityAfter: opening, delta: opening, note: "Opening stock" }]
      : [],
    marginPercentage: body.marginPercentage || "10",
    status: body.status || "Active",
    vendorId: body.vendorId || null,
    vendorName: body.vendorName || "",
  });
  return fmtProduct(doc);
}

export async function createService(body) {
  const code = await nextCode("SRV", "SRV-", 4, 70);
  const doc = await Service.create({
    code,
    name: body.name,
    unit: body.unit,
    group: body.group,
    displayOnEnquiry: !!body.displayOnEnquiry,
    estimatedAmount: body.estimatedAmount || "0",
    marginPercentage: body.marginPercentage || "10",
    status: body.status || "Active",
  });
  return fmtService(doc);
}

export async function updateVendor(id, body) {
  const doc = await findOr404(Vendor, id, "Vendor");
  if (body.name !== undefined) doc.name = body.name;
  if (body.type !== undefined) doc.type = body.type;
  if (body.vendorTypes !== undefined) {
    doc.vendorTypes = body.vendorTypes;
    doc.type = body.vendorTypes[0] || doc.type;
  }
  if (body.tradeDesignations !== undefined) {
    doc.tradeDesignations = body.tradeDesignations;
  }
  if (body.contact !== undefined) doc.contact = body.contact;
  if (body.status !== undefined) doc.status = body.status;
  if (body.profile !== undefined) doc.profile = { ...(doc.profile || {}), ...body.profile };
  await doc.save();
  return fmtVendor(doc);
}

export async function deleteVendor(id) {
  await findOr404(Vendor, id, "Vendor");
  await Vendor.findByIdAndDelete(id);
  return { deleted: true };
}

export async function updateClient(id, body) {
  const doc = await findOr404(Client, id, "Client");
  if (body.name !== undefined) {
    doc.name = body.name;
    doc.initials = getInitials(body.name);
  }
  if (body.email !== undefined) doc.email = body.email;
  if (body.mobile !== undefined) doc.mobile = body.mobile;
  if (body.city !== undefined) doc.city = body.city;
  if (body.project !== undefined) doc.project = body.project;
  if (body.status !== undefined) doc.status = body.status;
  if (body.initials !== undefined) doc.initials = body.initials;
  await doc.save();
  return fmtClient(doc);
}

export async function deleteClient(id) {
  await findOr404(Client, id, "Client");
  await Client.findByIdAndDelete(id);
  return { deleted: true };
}

export async function updateProduct(id, body) {
  const doc = await findOr404(Product, id, "Product");
  if (body.name !== undefined) doc.name = body.name;
  if (body.group !== undefined) doc.group = body.group;
  if (body.category !== undefined) doc.category = body.category;
  if (body.brand !== undefined) doc.brand = body.brand;
  if (body.imageUrl !== undefined) doc.imageUrl = body.imageUrl;
  if (body.unit !== undefined) doc.unit = body.unit;
  if (body.purchasePrice !== undefined) doc.purchasePrice = body.purchasePrice;
  if (body.salePrice !== undefined) doc.salePrice = body.salePrice;
  if (body.gst18 !== undefined) {
    doc.gst18 = !!body.gst18;
    doc.gstPercentage = body.gst18 ? "18" : body.gstPercentage || "0";
  }
  if (body.openingStock !== undefined) {
    doc.openingStock = Number(body.openingStock) || 0;
  }
  if (body.stockQuantity !== undefined) {
    doc.stockQuantity = Number(body.stockQuantity) || 0;
    doc.stock = doc.stockQuantity > 0 ? "In Stock" : "Out of Stock";
  }
  if (body.lowStockAlert !== undefined) {
    doc.lowStockAlert = Number(body.lowStockAlert) || 0;
  }
  if (body.hsnCode !== undefined) doc.hsnCode = body.hsnCode;
  if (body.asOfDate !== undefined) doc.asOfDate = new Date(body.asOfDate);
  if (body.stock !== undefined) doc.stock = body.stock;
  if (body.marginPercentage !== undefined)
    doc.marginPercentage = body.marginPercentage;
  if (body.gstPercentage !== undefined && body.gst18 === undefined)
    doc.gstPercentage = body.gstPercentage;
  if (body.status !== undefined) doc.status = body.status;
  if (body.vendorId !== undefined) doc.vendorId = body.vendorId || null;
  if (body.vendorName !== undefined) doc.vendorName = body.vendorName || "";
  await doc.save();
  return fmtProduct(doc);
}

export async function deleteProduct(id) {
  await findOr404(Product, id, "Product");
  await Product.findByIdAndDelete(id);
  return { deleted: true };
}

export async function updateService(id, body) {
  const doc = await findOr404(Service, id, "Service");
  if (body.name !== undefined) doc.name = body.name;
  if (body.unit !== undefined) doc.unit = body.unit;
  if (body.group !== undefined) doc.group = body.group;
  if (body.displayOnEnquiry !== undefined)
    doc.displayOnEnquiry = !!body.displayOnEnquiry;
  if (body.estimatedAmount !== undefined)
    doc.estimatedAmount = body.estimatedAmount;
  if (body.marginPercentage !== undefined)
    doc.marginPercentage = body.marginPercentage;
  if (body.status !== undefined) doc.status = body.status;
  await doc.save();
  return fmtService(doc);
}

export async function deleteService(id) {
  await findOr404(Service, id, "Service");
  await Service.findByIdAndDelete(id);
  return { deleted: true };
}

function fmtProductCategory(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: docId(o),
    title: o.title,
    descriptions: (o.descriptions || []).map((d) => {
      const desc = d.toObject ? d.toObject() : d;
      return {
        id: desc._id?.toString?.(),
        text: desc.text,
        createdAt: desc.createdAt,
      };
    }),
    updatedAt: o.updatedAt,
  };
}

export async function listProductCategories() {
  const rows = await ProductCategory.find().sort({ title: 1 });
  return rows.map(fmtProductCategory);
}

export async function listProductCategoryTitles() {
  const rows = await ProductCategory.find().sort({ title: 1 }).select("title");
  return rows.map((r) => r.title);
}

export async function getProductCategoryDescriptions(title) {
  const doc = await ProductCategory.findOne({
    title: String(title || "").trim(),
  });
  if (!doc) return { title: title?.trim() || "", descriptions: [] };
  return {
    title: doc.title,
    descriptions: (doc.descriptions || []).map((d) => ({
      id: d._id?.toString?.(),
      text: d.text,
    })),
  };
}

export async function addProductCategoryDescription(body) {
  const title = String(body.title || "").trim();
  const text = String(body.description || body.text || "").trim();
  if (!title) throw AppError.badRequest("Title is required");
  if (!text) throw AppError.badRequest("Description is required");

  let doc = await ProductCategory.findOne({ title });
  if (!doc) {
    doc = await ProductCategory.create({ title, descriptions: [{ text }] });
    return fmtProductCategory(doc);
  }

  const exists = doc.descriptions.some(
    (d) => d.text.toLowerCase() === text.toLowerCase(),
  );
  if (!exists) {
    doc.descriptions.push({ text });
    await doc.save();
  }
  return fmtProductCategory(doc);
}

export async function deleteProductCategoryDescription(categoryId, descId) {
  const doc = await findOr404(ProductCategory, categoryId, "Product category");
  const before = doc.descriptions.length;
  doc.descriptions = doc.descriptions.filter(
    (d) => d._id.toString() !== descId,
  );
  if (doc.descriptions.length === before) {
    throw AppError.notFound("Description not found");
  }
  if (doc.descriptions.length === 0) {
    await ProductCategory.findByIdAndDelete(doc._id);
    return { deleted: true, categoryRemoved: true };
  }
  await doc.save();
  return fmtProductCategory(doc);
}

export async function createMaterial(body) {
  const code =
    body.code ||
    (await buildMaterialCode({
      category: body.category,
      colourName: body.colourName,
      colourCode: body.colourCode,
    }));
  const doc = await Material.create({
    code,
    category: body.category,
    company: body.company || "",
    variant: body.variant || "",
    colourName: body.colourName || "",
    colourCode: body.colourCode || "",
    status: body.status || "Active",
    businessModule: body.businessModule || "residential",
  });
  return fmtMaterial(doc);
}

export async function previewMaterialCode(body) {
  const code = await buildMaterialCode({
    category: body.category,
    colourName: body.colourName,
    colourCode: body.colourCode,
  });
  return { code };
}

export async function updateMaterial(id, body) {
  const doc = await findOr404(Material, id, "Material");
  const fields = [
    "category",
    "company",
    "variant",
    "colourName",
    "colourCode",
    "status",
    "businessModule",
  ];
  for (const k of fields) {
    if (body[k] !== undefined) doc[k] = body[k];
  }
  await doc.save();
  return fmtMaterial(doc);
}

export async function deleteMaterial(id) {
  await findOr404(Material, id, "Material");
  await Material.findByIdAndDelete(id);
  return { deleted: true };
}
