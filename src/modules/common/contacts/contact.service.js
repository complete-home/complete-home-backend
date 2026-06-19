import mongoose from "mongoose";
import AppError from "../../../core/errors/AppError.js";
import { nextCode } from "../../../core/counters/counter.service.js";
import { docId } from "../../../core/http/formatHelpers.js";
import Contact from "./contact.model.js";
import CallLog from "./callLog.model.js";
import {
  buildAccessFilter,
  normalizePhoneDigits,
} from "./contact.utils.js";
import Enquiry from "../../residential/enquiries/enquiry.model.js";
import { Client, Vendor } from "../masters/master.model.js";
import ProjectSiteManagement from "../../residential/siteManagement/projectSiteManagement.model.js";
import ProjectAgreement from "../../residential/projects/projectAgreement.model.js";
import ProjectExecutionAgreement from "../../residential/projects/projectExecutionAgreement.model.js";
import User from "../../user-management/users/user.model.js";

async function loadUserNameMap(userIds) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return {};
  const users = await User.find({ _id: { $in: ids } })
    .select("name email")
    .lean();
  return Object.fromEntries(
    users.map((u) => [
      u._id.toString(),
      { name: u.name || u.email || "Employee", email: u.email || "" },
    ]),
  );
}

function formatContactList(doc, userMap = {}) {
  const o = doc.toObject ? doc.toObject() : doc;
  const createdById = o.createdBy?.toString?.() || null;
  const owner = createdById ? userMap[createdById] : null;
  const sharedIds = (o.sharedWith || []).map((id) => id.toString());
  const sharedEmployees = sharedIds
    .map((id) => {
      const u = userMap[id];
      return u ? { id, name: u.name } : null;
    })
    .filter(Boolean);

  return {
    id: docId(o),
    code: o.code,
    name: o.name,
    company: o.company || "",
    designation: o.designation || "",
    primaryPhone: o.primaryPhone,
    email: o.email || "",
    whatsapp: o.whatsapp || o.primaryPhone,
    contactType: o.contactType || "other",
    tags: o.tags || [],
    isPublic: !!o.isPublic,
    lastCalledAt: o.lastCalledAt,
    callCount: o.callCount ?? 0,
    status: o.status || "active",
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    createdBy: createdById,
    createdByName: owner?.name || null,
    sharedWith: sharedIds,
    sharedWithEmployees: sharedEmployees,
    ownerEmployeeName: owner?.name || null,
  };
}

function formatCallLog(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: docId(o),
    phoneDialed: o.phoneDialed,
    outcome: o.outcome,
    durationSeconds: o.durationSeconds,
    notes: o.notes || "",
    userId: o.userId?.toString?.() || null,
    userName: o.userName || "—",
    createdAt: o.createdAt
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

async function assertContactAccess(contactId, userId) {
  const filter = {
    _id: contactId,
    status: "active",
    ...buildAccessFilter(userId),
  };
  const doc = await Contact.findOne(filter);
  if (!doc) throw AppError.notFound("Contact not found");
  return doc;
}

export async function listContacts(userId, query = {}) {
  const { type, search, sort = "name", status = "active" } = query;
  const filter = { ...buildAccessFilter(userId) };
  if (status) filter.status = status;
  if (type && type !== "all") filter.contactType = type;
  if (search?.trim()) {
    const q = search.trim();
    filter.$and = [
      ...(filter.$and || []),
      {
        $or: [
          { name: new RegExp(q, "i") },
          { company: new RegExp(q, "i") },
          { primaryPhone: new RegExp(q, "i") },
          { email: new RegExp(q, "i") },
        ],
      },
    ];
  }

  let sortSpec = { name: 1 };
  if (sort === "recent") sortSpec = { updatedAt: -1 };
  if (sort === "calls") sortSpec = { callCount: -1, name: 1 };

  const rows = await Contact.find(filter).sort(sortSpec).lean();
  const userIds = [];
  for (const row of rows) {
    if (row.createdBy) userIds.push(row.createdBy);
    for (const id of row.sharedWith || []) userIds.push(id);
  }
  const userMap = await loadUserNameMap(userIds);
  return rows.map((row) => formatContactList(row, userMap));
}

export async function getContactDetail(contactId, userId) {
  const doc = await assertContactAccess(contactId, userId);
  const o = doc.toObject();

  const logs = await CallLog.find({ contactId: doc._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const userIds = [...new Set(logs.map((l) => l.userId?.toString()).filter(Boolean))];
  const users = userIds.length
    ? await User.find({ _id: { $in: userIds } })
        .select("name")
        .lean()
    : [];
  const callUserMap = Object.fromEntries(
    users.map((u) => [u._id.toString(), u.name]),
  );

  const detailUserIds = [
    o.createdBy,
    ...(o.sharedWith || []),
  ];
  const employeeMap = await loadUserNameMap(detailUserIds);
  const formatted = formatContactList(o, employeeMap);

  return {
    ...formatted,
    secondaryPhone: o.secondaryPhone || "",
    address: o.address || "",
    city: o.city || "",
    state: o.state || "",
    pincode: o.pincode || "",
    notes: o.notes || "",
    linkedClientId: o.linkedClientId?.toString?.() || null,
    linkedVendorId: o.linkedVendorId?.toString?.() || null,
    linkedUserId: o.linkedUserId?.toString?.() || null,
    linkedEnquiryIds: (o.linkedEnquiryIds || []).map((id) => id.toString()),
    linkedProjectIds: (o.linkedProjectIds || []).map((id) => id.toString()),
    callLogs: logs.map((log) =>
      formatCallLog({
        ...log,
        userName: callUserMap[log.userId?.toString()],
      }),
    ),
  };
}

export async function createContact(body, userId) {
  const phone = String(body.primaryPhone || "").trim();
  const normalized = normalizePhoneDigits(phone);
  if (!normalized || normalized.length !== 10) {
    throw AppError.badRequest("Valid 10-digit primary phone is required");
  }
  if (!String(body.name || "").trim()) {
    throw AppError.badRequest("Name is required");
  }

  const existing = await Contact.findOne({ phoneNormalized: normalized });
  if (existing) {
    throw AppError.conflict("A contact with this phone number already exists");
  }

  const code = await nextCode("CNT", "CNT-", 4);
  const doc = await Contact.create({
    code,
    name: body.name.trim(),
    company: body.company || "",
    designation: body.designation || "",
    primaryPhone: phone,
    phoneNormalized: normalized,
    secondaryPhone: body.secondaryPhone || "",
    email: body.email || "",
    whatsapp: body.whatsapp || phone,
    address: body.address || "",
    city: body.city || "",
    state: body.state || "",
    pincode: body.pincode || "",
    contactType: body.contactType || "other",
    tags: Array.isArray(body.tags) ? body.tags : [],
    linkedClientId: body.linkedClientId || null,
    linkedVendorId: body.linkedVendorId || null,
    linkedUserId: body.linkedUserId || null,
    linkedEnquiryIds: body.linkedEnquiryIds || [],
    linkedProjectIds: body.linkedProjectIds || [],
    isPublic: !!body.isPublic,
    sharedWith: (body.sharedWith || body.shareWithEmployeeIds || []).map(
      (id) => new mongoose.Types.ObjectId(id),
    ),
    notes: body.notes || "",
    createdBy: userId,
    status: "active",
  });

  const userMap = await loadUserNameMap([userId]);
  return formatContactList(doc, userMap);
}

export async function updateContact(contactId, body, userId) {
  const doc = await assertContactAccess(contactId, userId);

  if (body.primaryPhone !== undefined) {
    const phone = String(body.primaryPhone).trim();
    const normalized = normalizePhoneDigits(phone);
    if (!normalized || normalized.length !== 10) {
      throw AppError.badRequest("Valid 10-digit primary phone is required");
    }
    const dup = await Contact.findOne({
      phoneNormalized: normalized,
      _id: { $ne: doc._id },
    });
    if (dup) throw AppError.conflict("Another contact uses this phone number");
    doc.primaryPhone = phone;
    doc.phoneNormalized = normalized;
  }

  const fields = [
    "name",
    "company",
    "designation",
    "secondaryPhone",
    "email",
    "whatsapp",
    "address",
    "city",
    "state",
    "pincode",
    "contactType",
    "notes",
    "isPublic",
    "status",
  ];
  for (const key of fields) {
    if (body[key] !== undefined) doc[key] = body[key];
  }
  if (body.tags !== undefined) doc.tags = body.tags;
  if (body.sharedWith !== undefined || body.shareWithEmployeeIds !== undefined) {
    const ids = body.sharedWith ?? body.shareWithEmployeeIds ?? [];
    doc.sharedWith = ids.map((id) => new mongoose.Types.ObjectId(id));
  }
  if (body.name !== undefined) doc.name = String(body.name).trim();

  await doc.save();
  return getContactDetail(doc._id, userId);
}

export async function deleteContact(contactId, userId) {
  const doc = await assertContactAccess(contactId, userId);
  doc.status = "inactive";
  await doc.save();
  return { id: docId(doc) };
}

export async function shareContact(contactId, sharedWithUserIds, userId) {
  const doc = await assertContactAccess(contactId, userId);
  const ids = (sharedWithUserIds || [])
    .filter(Boolean)
    .map((id) => new mongoose.Types.ObjectId(id));
  const merged = new Set([
    ...(doc.sharedWith || []).map((x) => x.toString()),
    ...ids.map((x) => x.toString()),
  ]);
  doc.sharedWith = [...merged].map((id) => new mongoose.Types.ObjectId(id));
  await doc.save();
  return getContactDetail(doc._id, userId);
}

export async function logContactCall(contactId, body, userId) {
  const doc = await assertContactAccess(contactId, userId);
  const log = await CallLog.create({
    contactId: doc._id,
    userId,
    phoneDialed: body.phoneDialed || doc.primaryPhone,
    outcome: body.outcome || "attempted",
    durationSeconds: body.durationSeconds ?? null,
    notes: body.notes || "",
  });
  doc.lastCalledAt = new Date();
  doc.callCount = (doc.callCount || 0) + 1;
  await doc.save();
  const user = await User.findById(userId).select("name").lean();
  return formatCallLog({ ...log.toObject(), userName: user?.name });
}

export async function importContactsFromCrm(userId, options = {}) {
  const { setPublic = true } = options;
  const byPhone = new Map();

  const upsertDraft = (phone, draft) => {
    const key = normalizePhoneDigits(phone);
    if (!key || key.length !== 10) return;
    const prev = byPhone.get(key) || {
      phone: phone,
      name: "",
      company: "",
      contactType: "other",
      email: "",
      linkedEnquiryIds: new Set(),
      linkedProjectIds: new Set(),
      linkedClientId: null,
      linkedVendorId: null,
    };
    if (draft.name && draft.name.length > (prev.name?.length || 0)) {
      prev.name = draft.name;
    }
    if (draft.company) prev.company = draft.company;
    if (draft.contactType) prev.contactType = draft.contactType;
    if (draft.email) prev.email = draft.email;
    if (draft.linkedClientId) prev.linkedClientId = draft.linkedClientId;
    if (draft.linkedVendorId) prev.linkedVendorId = draft.linkedVendorId;
    (draft.linkedEnquiryIds || []).forEach((id) =>
      prev.linkedEnquiryIds.add(id.toString()),
    );
    (draft.linkedProjectIds || []).forEach((id) =>
      prev.linkedProjectIds.add(id.toString()),
    );
    byPhone.set(key, prev);
  };

  const enquiries = await Enquiry.find({ mobile: { $exists: true, $ne: "" } })
    .select("name mobile email clientId")
    .lean();
  for (const e of enquiries) {
    upsertDraft(e.mobile, {
      name: e.name,
      email: e.email || "",
      contactType: "client",
      linkedClientId: e.clientId,
      linkedEnquiryIds: [e._id],
    });
  }

  const clients = await Client.find({ mobile: { $exists: true, $ne: "" } })
    .select("name mobile email _id")
    .lean();
  for (const c of clients) {
    upsertDraft(c.mobile, {
      name: c.name,
      email: c.email || "",
      contactType: "client",
      linkedClientId: c._id,
    });
  }

  const vendors = await Vendor.find({ contact: { $exists: true, $ne: "" } })
    .select("name contact _id type")
    .lean();
  for (const v of vendors) {
    upsertDraft(v.contact, {
      name: v.name,
      company: v.type || "",
      contactType: "vendor",
      linkedVendorId: v._id,
    });
  }

  const sites = await ProjectSiteManagement.find({})
    .select("projectId contractors vendors operationTeam")
    .lean();
  for (const site of sites) {
    for (const c of site.contractors || []) {
      if (c.contactNo) {
        upsertDraft(c.contactNo, {
          name: c.workManager || c.work || "Site contractor",
          company: c.work || "",
          contactType: "contractor",
          linkedProjectIds: site.projectId ? [site.projectId] : [],
        });
      }
    }
    for (const v of site.vendors || []) {
      if (v.contactNo) {
        upsertDraft(v.contactNo, {
          name: v.shopName || v.material || "Site vendor",
          company: v.material || "",
          contactType: "vendor",
          linkedProjectIds: site.projectId ? [site.projectId] : [],
        });
      }
    }
    for (const t of site.operationTeam || []) {
      if (t.mobile) {
        upsertDraft(t.mobile, {
          name: t.name || t.department || "Team member",
          designation: t.designation || "",
          contactType: "other",
          linkedProjectIds: site.projectId ? [site.projectId] : [],
        });
      }
    }
  }

  const agreements = await ProjectAgreement.find({})
    .select("projectId approvedTrades")
    .lean();
  const execAgreements = await ProjectExecutionAgreement.find({})
    .select("projectId approvedTrades")
    .lean();
  for (const ag of [...agreements, ...execAgreements]) {
    for (const trade of ag.approvedTrades || []) {
      if (trade.mobile) {
        upsertDraft(trade.mobile, {
          name: trade.contractorName || trade.trade || "Contractor",
          company: trade.trade || "",
          contactType: "contractor",
          linkedProjectIds: ag.projectId ? [ag.projectId] : [],
        });
      }
    }
  }

  let created = 0;
  let skipped = 0;
  let updated = 0;

  for (const [normalized, draft] of byPhone.entries()) {
    const existing = await Contact.findOne({ phoneNormalized: normalized });
    if (existing) {
      let changed = false;
      if (!existing.name && draft.name) {
        existing.name = draft.name;
        changed = true;
      }
      if (draft.linkedClientId && !existing.linkedClientId) {
        existing.linkedClientId = draft.linkedClientId;
        changed = true;
      }
      if (draft.linkedVendorId && !existing.linkedVendorId) {
        existing.linkedVendorId = draft.linkedVendorId;
        changed = true;
      }
      for (const eid of draft.linkedEnquiryIds) {
        const oid = new mongoose.Types.ObjectId(eid);
        if (
          !existing.linkedEnquiryIds.some((x) => x.toString() === eid)
        ) {
          existing.linkedEnquiryIds.push(oid);
          changed = true;
        }
      }
      if (setPublic && !existing.isPublic) {
        existing.isPublic = true;
        changed = true;
      }
      if (changed) {
        await existing.save();
        updated += 1;
      } else {
        skipped += 1;
      }
      continue;
    }

    const code = await nextCode("CNT", "CNT-", 4);
    await Contact.create({
      code,
      name: draft.name || `Contact ${normalized}`,
      company: draft.company || "",
      primaryPhone: draft.phone,
      phoneNormalized: normalized,
      email: draft.email || "",
      whatsapp: draft.phone,
      contactType: draft.contactType,
      linkedClientId: draft.linkedClientId,
      linkedVendorId: draft.linkedVendorId,
      linkedEnquiryIds: [...draft.linkedEnquiryIds].map(
        (id) => new mongoose.Types.ObjectId(id),
      ),
      linkedProjectIds: [...draft.linkedProjectIds].map(
        (id) => new mongoose.Types.ObjectId(id),
      ),
      isPublic: setPublic,
      createdBy: userId,
      status: "active",
    });
    created += 1;
  }

  return { created, updated, skipped, total: byPhone.size };
}
