import mongoose from "mongoose";
import AppError from "../../../core/errors/AppError.js";
import { docId } from "../../../core/http/formatHelpers.js";
import Project from "../projects/project.model.js";
import MaterialSelection from "./materialSelection.model.js";
import {
  DEFAULT_FURNITURE_ROWS,
  DEFAULT_PAINT_ROWS,
  DEFAULT_TILE_QTY_ROWS,
  DEFAULT_TILE_ROWS,
} from "./materialSelection.constants.js";

function formatRow(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: docId(o),
    projectId: o.projectId?.toString?.(),
    selectionType: o.selectionType,
    sortOrder: o.sortOrder,
    space: o.space,
    company: o.company,
    productName: o.productName,
    code: o.code,
    floor: o.floor,
    areaSqft: o.areaSqft,
    areaText: o.areaText,
    vendorId: o.vendorId?.toString?.() || null,
    notes: o.notes,
    completed: Boolean(o.completed),
  };
}

function parseAreaSqft(row) {
  if (row.areaSqft != null && !Number.isNaN(Number(row.areaSqft))) {
    return Number(row.areaSqft);
  }
  const text = row.areaText || "";
  const first = text.split("+")[0]?.replace(/[^\d.]/g, "");
  const n = Number(first);
  return Number.isFinite(n) ? n : 0;
}

async function syncMaterialSelectionsPct(projectId) {
  const rows = await MaterialSelection.find({ projectId }).lean();
  const selectionPct = rows.length
    ? Math.round((rows.filter((r) => r.completed).length / rows.length) * 100)
    : 0;
  const brandRow =
    await Project.findById(projectId).select("phases.materialPct");
  const brandPct = brandRow?.phases?.materialPct ?? 0;
  const combined = Math.round((brandPct + selectionPct) / 2);
  await Project.findByIdAndUpdate(projectId, {
    $set: { "phases.materialPct": combined },
  });
  return combined;
}

export async function listMaterialSelections(projectId) {
  const project = await Project.findById(projectId);
  if (!project) throw AppError.notFound("Project not found");

  const rows = await MaterialSelection.find({ projectId }).sort({
    selectionType: 1,
    sortOrder: 1,
  });

  const grouped = { tile: [], paint: [], furniture: [], tile_qty: [] };
  for (const row of rows) {
    if (grouped[row.selectionType]) {
      grouped[row.selectionType].push(formatRow(row));
    }
  }

  const qtyNumeric = grouped.tile_qty.reduce(
    (sum, r) => sum + parseAreaSqft(r),
    0,
  );

  return {
    initialized: rows.length > 0,
    selections: grouped,
    totals: {
      tileQtySqft: qtyNumeric,
      tileRows: grouped.tile.length,
      paintRows: grouped.paint.length,
      furnitureRows: grouped.furniture.length,
    },
  };
}

export async function initializeMaterialSelections(projectId) {
  const project = await Project.findById(projectId);
  if (!project) throw AppError.notFound("Project not found");

  const existing = await MaterialSelection.countDocuments({ projectId });
  if (existing > 0) {
    return {
      created: 0,
      existing,
      message: "Material selections already initialized",
    };
  }

  const docs = [];
  let order = 0;
  for (const row of DEFAULT_TILE_ROWS) {
    docs.push({
      projectId,
      selectionType: "tile",
      sortOrder: order++,
      ...row,
    });
  }
  order = 0;
  for (const row of DEFAULT_PAINT_ROWS) {
    docs.push({
      projectId,
      selectionType: "paint",
      sortOrder: order++,
      ...row,
    });
  }
  order = 0;
  for (const row of DEFAULT_FURNITURE_ROWS) {
    docs.push({
      projectId,
      selectionType: "furniture",
      sortOrder: order++,
      ...row,
    });
  }
  order = 0;
  for (const row of DEFAULT_TILE_QTY_ROWS) {
    docs.push({
      projectId,
      selectionType: "tile_qty",
      sortOrder: order++,
      ...row,
    });
  }

  await MaterialSelection.insertMany(docs);
  await syncMaterialSelectionsPct(projectId);

  return { created: docs.length, existing: 0 };
}

export async function bulkUpdateMaterialSelections(projectId, { rows }) {
  if (!Array.isArray(rows) || !rows.length) {
    throw AppError.badRequest("rows array is required");
  }
  if (!mongoose.isValidObjectId(projectId)) {
    throw AppError.badRequest("Invalid project id");
  }

  const projectOid = new mongoose.Types.ObjectId(projectId);
  let modified = 0;

  for (const row of rows) {
    if (!row.id || !mongoose.isValidObjectId(row.id)) continue;
    const patch = {};
    const fields = [
      "space",
      "company",
      "productName",
      "code",
      "floor",
      "areaText",
      "notes",
    ];
    for (const f of fields) {
      if (row[f] !== undefined) patch[f] = row[f];
    }
    if (row.areaSqft !== undefined) {
      patch.areaSqft =
        row.areaSqft === "" || row.areaSqft == null
          ? null
          : Number(row.areaSqft);
    }
    if (row.vendorId !== undefined) {
      patch.vendorId = row.vendorId || null;
    }

    const result = await MaterialSelection.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(row.id), projectId: projectOid },
      { $set: patch },
      { new: true },
    );
    if (result) modified += 1;
  }

  if (modified === 0) {
    throw AppError.notFound("No material rows were updated");
  }

  const materialPct = await syncMaterialSelectionsPct(projectId);
  return { updated: modified, materialPct };
}

export async function addMaterialSelectionRow(projectId, body) {
  const project = await Project.findById(projectId);
  if (!project) throw AppError.notFound("Project not found");
  const type = body.selectionType;
  if (!["tile", "paint", "furniture", "tile_qty"].includes(type)) {
    throw AppError.badRequest("Invalid selectionType");
  }

  const maxOrder = await MaterialSelection.findOne({
    projectId,
    selectionType: type,
  })
    .sort({ sortOrder: -1 })
    .select("sortOrder")
    .lean();

  const doc = await MaterialSelection.create({
    projectId,
    selectionType: type,
    sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
    space: body.space || "",
    company: body.company || "",
    productName: body.productName || "",
    code: body.code || "",
    floor: body.floor || "",
    areaSqft: body.areaSqft ?? null,
    areaText: body.areaText || "",
    vendorId: body.vendorId || null,
    notes: body.notes || "",
  });

  await syncMaterialSelectionsPct(projectId);
  return formatRow(doc);
}

export async function deleteMaterialSelectionRow(projectId, rowId) {
  if (!mongoose.isValidObjectId(rowId)) {
    throw AppError.badRequest("Invalid row id");
  }
  const deleted = await MaterialSelection.findOneAndDelete({
    _id: rowId,
    projectId,
  });
  if (!deleted) throw AppError.notFound("Row not found");
  await syncMaterialSelectionsPct(projectId);
  return { deleted: true };
}
