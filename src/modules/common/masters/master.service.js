import AppError from "../../../core/errors/AppError.js";
import { nextCode } from "../../../core/counters/counter.service.js";
import { getInitials, docId } from "../../../core/http/formatHelpers.js";
import { Client, Vendor, Product, Service } from "./master.model.js";
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
    type: o.type,
    category: o.category,
    contact: o.contact,
    status: o.status,
  };
}

function fmtProduct(d) {
  const o = d.toObject ? d.toObject() : d;
  return {
    id: docId(o),
    code: o.code,
    name: o.name,
    group: o.group,
    category: o.category,
    brand: o.brand,
    stock: o.stock,
    marginPercentage: o.marginPercentage,
    gstPercentage: o.gstPercentage,
    status: o.status,
    vendorId: o.vendorId?.toString?.() || null,
    vendorName: o.vendorName || "",
  };
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
  return (await Vendor.find().sort({ name: 1 })).map(fmtVendor);
}

export async function listProducts() {
  return (await Product.find().sort({ name: 1 })).map(fmtProduct);
}

export async function listServices() {
  return (await Service.find().sort({ name: 1 })).map(fmtService);
}

export async function createVendor(body) {
  const code = await nextCode("VND", "VND-", 3, 1);
  const doc = await Vendor.create({
    code,
    name: body.name,
    type: body.type || "",
    category: body.category || body.type || "",
    contact: body.contact || "",
    status: body.status || "Active",
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
  const doc = await Product.create({
    code,
    name: body.name,
    group: body.group,
    category: body.category || body.group,
    brand: body.brand,
    stock: body.stock || "In Stock",
    marginPercentage: body.marginPercentage || "10",
    gstPercentage: body.gstPercentage || "0",
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
  if (body.category !== undefined) doc.category = body.category;
  if (body.contact !== undefined) doc.contact = body.contact;
  if (body.status !== undefined) doc.status = body.status;
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
  if (body.stock !== undefined) doc.stock = body.stock;
  if (body.marginPercentage !== undefined)
    doc.marginPercentage = body.marginPercentage;
  if (body.gstPercentage !== undefined) doc.gstPercentage = body.gstPercentage;
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
