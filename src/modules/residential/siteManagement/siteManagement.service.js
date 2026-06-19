import AppError from "../../../core/errors/AppError.js";
import { docId } from "../../../core/http/formatHelpers.js";
import Project from "../projects/project.model.js";
import ProjectSiteManagement from "./projectSiteManagement.model.js";
import {
  DEFAULT_CONTRACTORS,
  DEFAULT_OPERATION_TEAM,
  DEFAULT_VENDORS,
} from "./siteManagement.defaults.js";

function formatRow(row) {
  const o = row.toObject ? row.toObject() : row;
  return {
    id: docId(o),
    department: o.department ?? "",
    name: o.name ?? "",
    designation: o.designation ?? "",
    mobile: o.mobile ?? "",
    work: o.work ?? "",
    workManager: o.workManager ?? "",
    contactNo: o.contactNo ?? "",
    materialList: o.materialList ?? "",
    estimate: o.estimate ?? "",
    finalQuotation: o.finalQuotation ?? "",
    unit: o.unit ?? "",
    review: o.review ?? "",
    material: o.material ?? "",
    shopName: o.shopName ?? "",
    sortOrder: o.sortOrder ?? 0,
  };
}

export async function getProjectSiteManagement(projectId) {
  const project = await Project.findById(projectId);
  if (!project) throw AppError.notFound("Project not found");

  const doc = await ProjectSiteManagement.findOne({ projectId });
  if (!doc) {
    return {
      initialized: false,
      operationTeam: [],
      contractors: [],
      vendors: [],
    };
  }

  return {
    initialized: doc.initialized,
    operationTeam: doc.operationTeam.map(formatRow),
    contractors: doc.contractors.map(formatRow),
    vendors: doc.vendors.map(formatRow),
  };
}

export async function initializeProjectSiteManagement(projectId) {
  const project = await Project.findById(projectId);
  if (!project) throw AppError.notFound("Project not found");

  let doc = await ProjectSiteManagement.findOne({ projectId });
  if (doc?.initialized) {
    return { created: false, message: "Site management already initialized" };
  }

  const withOrder = (rows) => rows.map((r, i) => ({ ...r, sortOrder: i + 1 }));

  if (!doc) {
    doc = await ProjectSiteManagement.create({
      projectId,
      operationTeam: withOrder(DEFAULT_OPERATION_TEAM),
      contractors: withOrder(DEFAULT_CONTRACTORS),
      vendors: withOrder(DEFAULT_VENDORS),
      initialized: true,
    });
  } else {
    doc.operationTeam = withOrder(DEFAULT_OPERATION_TEAM);
    doc.contractors = withOrder(DEFAULT_CONTRACTORS);
    doc.vendors = withOrder(DEFAULT_VENDORS);
    doc.initialized = true;
    await doc.save();
  }

  return { created: true, id: docId(doc) };
}

export async function updateProjectSiteManagement(projectId, body) {
  const project = await Project.findById(projectId);
  if (!project) throw AppError.notFound("Project not found");

  let doc = await ProjectSiteManagement.findOne({ projectId });
  if (!doc) {
    doc = await ProjectSiteManagement.create({
      projectId,
      initialized: true,
      operationTeam: [],
      contractors: [],
      vendors: [],
    });
  }

  if (Array.isArray(body.operationTeam)) {
    doc.operationTeam = body.operationTeam.map((r, i) => ({
      department: r.department ?? "",
      name: r.name ?? "",
      designation: r.designation ?? "",
      mobile: r.mobile ?? "",
      sortOrder: r.sortOrder ?? i + 1,
    }));
  }
  if (Array.isArray(body.contractors)) {
    doc.contractors = body.contractors.map((r, i) => ({
      work: r.work ?? "",
      workManager: r.workManager ?? "",
      contactNo: r.contactNo ?? "",
      materialList: r.materialList ?? "",
      estimate: r.estimate ?? "",
      finalQuotation: r.finalQuotation ?? "",
      unit: r.unit ?? "",
      review: r.review ?? "",
      sortOrder: r.sortOrder ?? i + 1,
    }));
  }
  if (Array.isArray(body.vendors)) {
    doc.vendors = body.vendors.map((r, i) => ({
      material: r.material ?? "",
      shopName: r.shopName ?? "",
      contactNo: r.contactNo ?? "",
      review: r.review ?? "",
      sortOrder: r.sortOrder ?? i + 1,
    }));
  }

  doc.initialized = true;
  await doc.save();

  return getProjectSiteManagement(projectId);
}

export async function addSiteManagementRow(projectId, { section }) {
  const doc = await ProjectSiteManagement.findOne({ projectId });
  if (!doc?.initialized) {
    throw AppError.badRequest("Initialize site management first");
  }

  if (section === "operation_team") {
    doc.operationTeam.push({
      department: "",
      name: "",
      designation: "",
      mobile: "",
      sortOrder: doc.operationTeam.length + 1,
    });
  } else if (section === "contractor") {
    doc.contractors.push({
      work: "",
      workManager: "",
      contactNo: "",
      sortOrder: doc.contractors.length + 1,
    });
  } else if (section === "vendor") {
    doc.vendors.push({
      material: "",
      shopName: "",
      contactNo: "",
      sortOrder: doc.vendors.length + 1,
    });
  } else {
    throw AppError.badRequest("Invalid section");
  }

  await doc.save();
  return getProjectSiteManagement(projectId);
}

export async function removeSiteManagementRow(projectId, { section, rowId }) {
  const doc = await ProjectSiteManagement.findOne({ projectId });
  if (!doc) throw AppError.notFound("Site management not found");

  const filter = (arr) => arr.filter((r) => docId(r) !== rowId);

  if (section === "operation_team")
    doc.operationTeam = filter(doc.operationTeam);
  else if (section === "contractor") doc.contractors = filter(doc.contractors);
  else if (section === "vendor") doc.vendors = filter(doc.vendors);
  else throw AppError.badRequest("Invalid section");

  await doc.save();
  return getProjectSiteManagement(projectId);
}
