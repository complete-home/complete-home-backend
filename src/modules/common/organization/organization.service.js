import AppError from "../../../core/errors/AppError.js";
import { nextCode } from "../../../core/counters/counter.service.js";
import { docId, getInitials } from "../../../core/http/formatHelpers.js";
import { Branch, Department, Company } from "./organization.model.js";

function fmtBranch(d) {
  const o = d.toObject ? d.toObject() : d;
  return {
    id: docId(o),
    code: o.code,
    name: o.name,
    location: o.location,
    type: o.type,
    status: o.status,
    address: o.address,
    city: o.city,
    state: o.state,
    pincode: o.pincode,
  };
}

function fmtDepartment(d) {
  const o = d.toObject ? d.toObject() : d;
  return {
    id: docId(o),
    code: o.code,
    name: o.name,
    teamCount: o.teamCount ?? 0,
    status: o.status,
    initials: o.initials || getInitials(o.name),
  };
}

export async function listBranches() {
  const rows = await Branch.find().sort({ name: 1 });
  return rows.map(fmtBranch);
}

export async function createBranch(body) {
  const code = body.code || (await nextCode("BRN", "BRN-", 4, 2));
  const row = await Branch.create({
    code,
    name: body.name,
    location: body.location || "",
    type: body.type || "BRANCH",
    status: body.status || "Active",
    address: body.address || "",
    city: body.city || "",
    state: body.state || "",
    pincode: body.pincode || "",
  });
  return fmtBranch(row);
}

export async function updateBranch(id, body) {
  const allowed = [
    "name",
    "location",
    "type",
    "status",
    "address",
    "city",
    "state",
    "pincode",
  ];
  const patch = {};
  for (const k of allowed) {
    if (body[k] !== undefined) patch[k] = body[k];
  }
  const row = await Branch.findByIdAndUpdate(id, patch, { new: true });
  if (!row) throw AppError.notFound("Branch not found");
  return fmtBranch(row);
}

export async function deleteBranch(id) {
  const row = await Branch.findByIdAndDelete(id);
  if (!row) throw AppError.notFound("Branch not found");
  return { id };
}

export async function listDepartments() {
  const rows = await Department.find().sort({ name: 1 });
  return rows.map(fmtDepartment);
}

export async function createDepartment(body) {
  const code = body.code || (await nextCode("DPT", "DPT-", 4, 20));
  const row = await Department.create({
    code,
    name: body.name,
    teamCount: body.teamCount ?? 0,
    status: body.status || "Active",
    initials: body.initials || getInitials(body.name),
  });
  return fmtDepartment(row);
}

export async function updateDepartment(id, body) {
  const allowed = ["name", "teamCount", "status", "initials"];
  const patch = {};
  for (const k of allowed) {
    if (body[k] !== undefined) patch[k] = body[k];
  }
  const row = await Department.findByIdAndUpdate(id, patch, { new: true });
  if (!row) throw AppError.notFound("Department not found");
  return fmtDepartment(row);
}

export async function deleteDepartment(id) {
  const row = await Department.findByIdAndDelete(id);
  if (!row) throw AppError.notFound("Department not found");
  return { id };
}

const DEFAULT_COMPANY = {
  singletonKey: "default",
  name: "Complete Home Plan Design Build",
  website: "https://www.completehome.co.in/",
  mobile: "9876543210",
  email: "info@completehome.in",
  address: "FIOF 11 SURYA TI MALL JUNWANI , BHILAI",
  landmark: "FIFTH OF FLOOR IN SURYA TI MALL",
  pincode: "490020",
  area: "Smriti Nagar Bhilai, Durg",
  city: "Bhilai",
  state: "Chhattisgarh",
  cin: "U74999CT2024PTC012345",
  pan: "DMFPK0997A",
  gst: "22DMFPK0997A1ZC",
  banks: [],
};

export async function getCompany() {
  let row = await Company.findOne({ singletonKey: "default" });
  if (!row) {
    row = await Company.create(DEFAULT_COMPANY);
  }
  const o = row.toObject();
  return {
    id: docId(o),
    name: o.name,
    website: o.website,
    mobile: o.mobile,
    email: o.email,
    address: o.address,
    landmark: o.landmark,
    pincode: o.pincode,
    area: o.area,
    city: o.city,
    state: o.state,
    cin: o.cin,
    pan: o.pan,
    gst: o.gst,
    logoPreview: o.logoPreview,
    banks: o.banks || [],
  };
}

export async function updateCompany(body) {
  const allowed = [
    "name",
    "website",
    "mobile",
    "email",
    "address",
    "landmark",
    "pincode",
    "area",
    "city",
    "state",
    "cin",
    "pan",
    "gst",
    "logoPreview",
    "banks",
  ];
  const patch = {};
  for (const k of allowed) {
    if (body[k] !== undefined) patch[k] = body[k];
  }
  const row = await Company.findOneAndUpdate(
    { singletonKey: "default" },
    { $set: patch, $setOnInsert: DEFAULT_COMPANY },
    { new: true, upsert: true },
  );
  return getCompany();
}
