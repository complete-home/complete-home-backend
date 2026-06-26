import { docId } from "../../../core/http/formatHelpers.js";
import FinanceTransaction from "./financeTransaction.model.js";
import Project from "../../residential/projects/project.model.js";
import { Vendor, Client } from "../masters/master.model.js";
import User from "../../user-management/users/user.model.js";

function fmt(row) {
  const o = row.toObject ? row.toObject() : row;
  return {
    id: docId(o),
    transactionType: o.transactionType,
    personType: o.personType,
    personId: o.personId?.toString?.() || null,
    personName: o.personName,
    projectId: o.projectId?.toString?.() || null,
    projectName: o.projectName || "",
    amount: o.amount,
    currency: o.currency || "INR",
    paymentDate: o.paymentDate,
    paymentTime: o.paymentTime || "",
    paymentMode: o.paymentMode,
    purpose: o.purpose || "",
    notes: o.notes || "",
    attachmentUrl: o.attachmentUrl || "",
    referenceNumber: o.referenceNumber || "",
    expenseCategory: o.expenseCategory || "",
    status: o.status || "completed",
    businessModule: o.businessModule || "residential",
    createdAt: o.createdAt,
  };
}

function buildFilter(query = {}) {
  const filter = {};
  if (query.module) filter.businessModule = query.module;
  if (query.transactionType) filter.transactionType = query.transactionType;
  if (query.personType) filter.personType = query.personType;
  if (query.projectId) filter.projectId = query.projectId;
  if (query.search?.trim()) {
    const re = new RegExp(query.search.trim(), "i");
    filter.$or = [
      { personName: re },
      { purpose: re },
      { projectName: re },
      { referenceNumber: re },
    ];
  }
  return filter;
}

export async function listFinanceTransactions(query = {}) {
  const filter = buildFilter(query);
  const rows = await FinanceTransaction.find(filter)
    .sort({ paymentDate: -1, createdAt: -1 })
    .limit(Number(query.limit) || 500)
    .lean();
  return rows.map(fmt);
}

export async function createFinanceTransaction(body, user) {
  let projectName = body.projectName || "";
  if (body.projectId && !projectName) {
    const p = await Project.findById(body.projectId).select("name code").lean();
    projectName = p ? `${p.code} — ${p.name}` : "";
  }
  const doc = await FinanceTransaction.create({
    transactionType: body.transactionType,
    personType: body.personType || "other",
    personId: body.personId || null,
    personName: body.personName?.trim() || "—",
    projectId: body.projectId || null,
    projectName,
    amount: Number(body.amount) || 0,
    currency: body.currency || "INR",
    paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
    paymentTime: body.paymentTime || "",
    paymentMode: body.paymentMode || "Cash",
    purpose: body.purpose || "",
    notes: body.notes || "",
    attachmentUrl: body.attachmentUrl || "",
    referenceNumber: body.referenceNumber || "",
    expenseCategory: body.expenseCategory || "",
    status: body.status || "completed",
    businessModule: body.businessModule || "residential",
    recordedBy: user?._id || null,
  });
  return fmt(doc);
}

export async function getFinanceOverview(query = {}) {
  const filter = buildFilter(query);
  const rows = await FinanceTransaction.find({
    ...filter,
    status: "completed",
  }).lean();

  let cashIn = 0;
  let cashOut = 0;
  let vendorOut = 0;
  let contractorOut = 0;
  let clientOut = 0;
  let otherOut = 0;
  let extraExpense = 0;

  for (const r of rows) {
    if (r.transactionType === "cash_in") cashIn += r.amount;
    if (r.transactionType === "cash_out") {
      cashOut += r.amount;
      if (r.personType === "vendor") vendorOut += r.amount;
      else if (r.personType === "contractor") contractorOut += r.amount;
      else if (r.personType === "client") clientOut += r.amount;
      else otherOut += r.amount;
    }
    if (r.transactionType === "extra_expense") {
      extraExpense += r.amount;
      cashOut += r.amount;
      otherOut += r.amount;
    }
  }

  return {
    totalCashIn: cashIn,
    totalCashOut: cashOut,
    netCashFlow: cashIn - cashOut,
    totalPaidToVendors: vendorOut,
    totalPaidToContractors: contractorOut,
    totalPaidToClients: clientOut,
    totalOtherExpenses: otherOut + extraExpense,
    totalExtraExpenses: extraExpense,
    currency: "INR",
  };
}

export async function getPersonLedger(personType, query = {}) {
  const filter = buildFilter({ ...query, personType });
  const rows = await FinanceTransaction.find(filter)
    .sort({ paymentDate: -1 })
    .lean();

  const byPerson = {};
  for (const r of rows) {
    const key = r.personId?.toString() || r.personName;
    if (!byPerson[key]) {
      byPerson[key] = {
        personId: r.personId?.toString() || null,
        personName: r.personName,
        personType: r.personType,
        totalReceived: 0,
        totalPaid: 0,
        transactions: [],
      };
    }
    const entry = fmt(r);
    byPerson[key].transactions.push(entry);
    if (r.transactionType === "cash_in") {
      byPerson[key].totalReceived += r.amount;
    } else {
      byPerson[key].totalPaid += r.amount;
    }
  }

  return Object.values(byPerson).map((p) => ({
    ...p,
    outstanding: p.totalReceived - p.totalPaid,
  }));
}

export async function listProjectPayees(projectId) {
  const project = await Project.findById(projectId).lean();
  if (!project) return { vendors: [], clients: [], contractors: [] };

  const [vendors, clients, contractors] = await Promise.all([
    Vendor.find({ status: "Active" }).select("name code").sort({ name: 1 }).lean(),
    Client.find({ status: "Active" }).select("name code").sort({ name: 1 }).lean(),
    User.find({ userType: "employee", status: "Active" })
      .select("name userId profile")
      .sort({ name: 1 })
      .lean(),
  ]);

  return {
    vendors: vendors.map((v) => ({ id: v._id.toString(), name: v.name, code: v.code })),
    clients: clients.map((c) => ({ id: c._id.toString(), name: c.name, code: c.code })),
    contractors: contractors
      .filter((u) => {
        const des = u.profile?.designations || [];
        const dept = u.profile?.departments || [];
        return des.some((d) => /supervisor|contractor/i.test(d)) || dept.includes("Site Execution");
      })
      .map((u) => ({ id: u._id.toString(), name: u.name, code: u.userId })),
  };
}
