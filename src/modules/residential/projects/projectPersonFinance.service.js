import AppError from "../../../core/errors/AppError.js";
import { roundMoney } from "../../../core/utils/money.js";
import PayableObligation from "../../common/payables/payableObligation.model.js";
import PayableLedgerEntry from "../../common/payables/payableLedgerEntry.model.js";
import ProjectSiteManagement from "../siteManagement/projectSiteManagement.model.js";
import Project from "./project.model.js";

function slugifyPayee(name) {
  return (
    String(name || "unknown")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "unknown"
  );
}

function parseQuoteAmount(value) {
  if (!value || value === "-") return 0;
  const m = String(value)
    .replace(/,/g, "")
    .match(/[\d.]+/);
  return m ? parseFloat(m[0]) : 0;
}

function namesMatch(a, b) {
  if (!a || !b) return false;
  const na = a.toLowerCase().trim();
  const nb = b.toLowerCase().trim();
  if (na === nb) return true;
  return na.includes(nb) || nb.includes(na);
}

async function loadProjectPayableContext(projectId) {
  const project = await Project.findById(projectId).lean();
  if (!project) throw AppError.notFound("Project not found");

  const obligations = await PayableObligation.find({
    projectId: project._id,
    status: { $in: ["active", "draft", "closed"] },
  })
    .populate("vendorId", "code name")
    .lean();

  const paidAgg = obligations.length
    ? await PayableLedgerEntry.aggregate([
        {
          $match: {
            obligationId: { $in: obligations.map((o) => o._id) },
          },
        },
        { $group: { _id: "$obligationId", total: { $sum: "$amount" } } },
      ])
    : [];

  const paidMap = new Map(paidAgg.map((r) => [r._id.toString(), r.total || 0]));

  return { project, obligations, paidMap };
}

function matchObligations(obligations, paidMap, names) {
  const matched = [];
  let committed = 0;
  let paid = 0;

  for (const o of obligations) {
    const vendorName = o.vendorId?.name || "";
    const title = o.title || "";
    const hit = names.some(
      (n) => namesMatch(n, vendorName) || namesMatch(n, title),
    );
    if (!hit) continue;

    const c = o.committedAmount || 0;
    const p = paidMap.get(o._id.toString()) || 0;
    committed += c;
    paid += p;
    matched.push({
      obligationId: o._id.toString(),
      title: o.title,
      vendorName: vendorName || "—",
      committed: roundMoney(c),
      paid: roundMoney(p),
      outstanding: roundMoney(Math.max(0, c - p)),
      status: o.status,
    });
  }

  return {
    obligations: matched,
    committed: roundMoney(committed),
    paid: roundMoney(paid),
    outstanding: roundMoney(Math.max(0, committed - paid)),
  };
}

function buildRegistryFromSiteMgmt(siteDoc) {
  const registry = new Map();

  const add = (entry) => {
    if (!entry.displayName?.trim()) return;
    const key = slugifyPayee(entry.displayName);
    const existing = registry.get(key);
    if (existing) {
      existing.aliases = [...new Set([...existing.aliases, ...entry.aliases])];
      existing.quoteCommitted = Math.max(
        existing.quoteCommitted,
        entry.quoteCommitted,
      );
      return;
    }
    registry.set(key, entry);
  };

  for (const c of siteDoc?.contractors || []) {
    const displayName = (c.workManager || "").trim();
    if (!displayName) continue;
    const rowId = c._id?.toString?.() || "";
    add({
      payeeKey: rowId ? `c-${rowId}` : slugifyPayee(displayName),
      siteRowId: rowId,
      type: "contractor",
      displayName,
      tradeOrMaterial: c.work || "",
      contactNo: c.contactNo || "",
      quoteCommitted: roundMoney(
        parseQuoteAmount(c.finalQuotation) || parseQuoteAmount(c.estimate),
      ),
      quoteRaw: c.finalQuotation || c.estimate || "",
      unit: c.unit || "",
      aliases: [displayName, c.work].filter(Boolean),
    });
  }

  for (const v of siteDoc?.vendors || []) {
    const displayName = (v.shopName || "").trim();
    if (!displayName) continue;
    const rowId = v._id?.toString?.() || "";
    add({
      payeeKey: rowId ? `v-${rowId}` : slugifyPayee(displayName),
      siteRowId: rowId,
      type: "vendor",
      displayName,
      tradeOrMaterial: v.material || "",
      contactNo: v.contactNo || "",
      quoteCommitted: 0,
      quoteRaw: "",
      unit: "",
      aliases: [displayName, v.material].filter(Boolean),
    });
  }

  return registry;
}

export async function listProjectFinancePayees(projectId) {
  const { obligations, paidMap } = await loadProjectPayableContext(projectId);
  const siteDoc = await ProjectSiteManagement.findOne({ projectId }).lean();
  const registry = buildRegistryFromSiteMgmt(siteDoc);

  const payees = [];

  for (const entry of registry.values()) {
    const payables = matchObligations(obligations, paidMap, entry.aliases);
    payees.push({
      payeeKey: entry.payeeKey,
      type: entry.type,
      displayName: entry.displayName,
      tradeOrMaterial: entry.tradeOrMaterial,
      contactNo: entry.contactNo,
      quoteCommitted: entry.quoteCommitted,
      payablesCommitted: payables.committed,
      payablesPaid: payables.paid,
      payablesOutstanding: payables.outstanding,
      totalAmountGiven: payables.paid,
      remainingBalance: payables.outstanding,
      obligationCount: payables.obligations.length,
      obligationId: payables.obligations[0]?.obligationId || null,
    });
  }

  payees.sort((a, b) => a.displayName.localeCompare(b.displayName));

  let totalQuoted = 0;
  let totalPayableOutstanding = 0;
  for (const p of payees) {
    totalQuoted += p.quoteCommitted || 0;
    totalPayableOutstanding += p.payablesOutstanding || 0;
  }

  return {
    projectId,
    initialized: Boolean(siteDoc?.initialized),
    payees,
    summary: {
      count: payees.length,
      totalQuoted: roundMoney(totalQuoted),
      totalPayableOutstanding: roundMoney(totalPayableOutstanding),
    },
  };
}

export async function getProjectFinancePayee(projectId, payeeKey) {
  const list = await listProjectFinancePayees(projectId);
  const payee = list.payees.find((p) => p.payeeKey === payeeKey);
  if (!payee) throw AppError.notFound("Payee not found on this project");

  const { obligations, paidMap } = await loadProjectPayableContext(projectId);
  const siteDoc = await ProjectSiteManagement.findOne({ projectId }).lean();
  const registry = buildRegistryFromSiteMgmt(siteDoc);
  const entry = registry.get(payeeKey);
  const payables = matchObligations(
    obligations,
    paidMap,
    entry?.aliases || [payee.displayName],
  );

  const paymentHistory = [];
  for (const ob of payables.obligations) {
    const ledger = await PayableLedgerEntry.find({
      obligationId: ob.obligationId,
    })
      .sort({ paidAt: -1 })
      .lean();
    for (const l of ledger) {
      paymentHistory.push({
        id: l._id.toString(),
        obligationId: ob.obligationId,
        amount: roundMoney(l.amount),
        paymentMode: l.paymentMode || "",
        reference: l.reference || "",
        paidAt: l.paidAt,
        note: l.note || "",
      });
    }
  }

  return {
    ...payee,
    quoteRaw: entry?.quoteRaw || "",
    unit: entry?.unit || "",
    payables,
    totalAmountGiven: payables.paid,
    remainingBalance: payables.outstanding,
    paymentHistory,
  };
}
