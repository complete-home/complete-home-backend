import AppError from "../../../core/errors/AppError.js";
import { docId } from "../../../core/http/formatHelpers.js";
import { paymentAmountNumeric, roundMoney } from "../../../core/utils/money.js";
import PayableObligation from "../../common/payables/payableObligation.model.js";
import PayableLedgerEntry from "../../common/payables/payableLedgerEntry.model.js";
import FinanceTransaction from "../../common/finance/financeTransaction.model.js";
import EnquiryPayment from "../enquiries/enquiryPayment.model.js";
import Project from "./project.model.js";
import ProjectAgreement from "./projectAgreement.model.js";
import { listProjectFinancePayees } from "./projectPersonFinance.service.js";

async function paidTotalsByObligationIds(obligationIds) {
  if (!obligationIds.length) return new Map();
  const agg = await PayableLedgerEntry.aggregate([
    { $match: { obligationId: { $in: obligationIds } } },
    { $group: { _id: "$obligationId", total: { $sum: "$amount" } } },
  ]);
  return new Map(agg.map((r) => [r._id.toString(), r.total || 0]));
}

export async function getProjectFinanceSummary(projectId) {
  const project = await Project.findById(projectId).lean();
  if (!project) throw AppError.notFound("Project not found");

  const clientPayments = [];
  let clientReceived = 0;
  let clientRecorded = 0;

  if (project.enquiryId) {
    const payments = await EnquiryPayment.find({
      enquiryId: project.enquiryId,
    })
      .sort({ createdAt: -1 })
      .lean();

    for (const p of payments) {
      const amt = paymentAmountNumeric(p);
      clientRecorded += amt;
      const completed =
        p.status === "Completed" && p.clientStatus !== "disputed";
      if (completed) clientReceived += amt;
      clientPayments.push({
        id: p._id.toString(),
        amount: p.amount,
        amountNumeric: amt,
        paymentType: p.paymentType || "",
        status: p.status,
        paymentDate: p.paymentDate || "",
        completed,
      });
    }
  }

  const obligations = await PayableObligation.find({
    projectId: project._id,
    status: { $in: ["active", "draft"] },
  })
    .populate("vendorId", "code name")
    .lean();

  const paidMap = await paidTotalsByObligationIds(
    obligations.map((o) => o._id),
  );

  let vendorCommitted = 0;
  let vendorPaid = 0;
  let contractorCommitted = 0;
  let contractorPaid = 0;
  const vendorLines = [];
  const contractorLines = [];

  for (const o of obligations) {
    const id = o._id.toString();
    const committed = o.committedAmount || 0;
    const paid = paidMap.get(id) || 0;
    const isContractor = ["siteContractor", "contractor"].includes(
      o.payeeKind,
    );
    if (isContractor) {
      contractorCommitted += committed;
      contractorPaid += paid;
      contractorLines.push({
        obligationId: id,
        title: o.title,
        payeeName: o.payeeLabel || o.title || "—",
        committed: roundMoney(committed),
        paid: roundMoney(paid),
        outstanding: roundMoney(Math.max(0, committed - paid)),
      });
    } else {
      vendorCommitted += committed;
      vendorPaid += paid;
      const vendor = o.vendorId;
      vendorLines.push({
        obligationId: id,
        title: o.title,
        vendorName: vendor?.name || o.payeeLabel || "—",
        vendorCode: vendor?.code || "",
        committed: roundMoney(committed),
        paid: roundMoney(paid),
        outstanding: roundMoney(Math.max(0, committed - paid)),
      });
    }
  }

  const agreement = await ProjectAgreement.findOne({
    projectId: project._id,
  }).lean();

  let consultancyFeeTotal = 0;
  let consultancyPaid = 0;
  let consultancyDue = 0;
  const milestones = [];

  if (agreement) {
    consultancyFeeTotal = agreement.consultancyFeeTotal || 0;
    for (const m of agreement.clientMilestones || []) {
      const amount = m.amount || 0;
      if (m.status === "paid") consultancyPaid += amount;
      else consultancyDue += amount;
      milestones.push({
        key: m.key,
        label: m.label,
        amount: roundMoney(amount),
        percent: m.percent,
        status: m.status,
      });
    }
  }

  const clientOutstanding = roundMoney(
    Math.max(0, consultancyFeeTotal - clientReceived),
  );
  const vendorOutstanding = roundMoney(
    Math.max(0, vendorCommitted - vendorPaid),
  );
  const contractorOutstanding = roundMoney(
    Math.max(0, contractorCommitted - contractorPaid),
  );

  let payeesSummary = { count: 0, totalQuoted: 0, totalPayableOutstanding: 0 };
  try {
    const payees = await listProjectFinancePayees(projectId);
    payeesSummary = payees.summary;
  } catch {
    /* site management may not be initialized */
  }

  const financeTxns = await FinanceTransaction.find({
    projectId: project._id,
    status: "completed",
  }).lean();
  let txnCashIn = 0;
  let txnCashOut = 0;
  for (const t of financeTxns) {
    if (t.transactionType === "cash_in") txnCashIn += t.amount;
    else txnCashOut += t.amount;
  }

  return {
    currency: "INR",
    projectId: project._id.toString(),
    enquiryId: project.enquiryId?.toString?.() || null,
    client: {
      received: roundMoney(clientReceived),
      recorded: roundMoney(clientRecorded),
      outstanding: clientOutstanding,
      payments: clientPayments,
    },
    vendor: {
      committed: roundMoney(vendorCommitted),
      paid: roundMoney(vendorPaid),
      outstanding: vendorOutstanding,
      lines: vendorLines,
    },
    contractor: {
      committed: roundMoney(contractorCommitted),
      paid: roundMoney(contractorPaid),
      outstanding: contractorOutstanding,
      lines: contractorLines,
    },
    consultancy: {
      feeTotal: roundMoney(consultancyFeeTotal),
      paidViaMilestones: roundMoney(consultancyPaid),
      dueViaMilestones: roundMoney(consultancyDue),
      milestones,
    },
    net: {
      clientReceived: roundMoney(clientReceived),
      vendorPaid: roundMoney(vendorPaid),
      balance: roundMoney(clientReceived - vendorPaid),
    },
    payees: payeesSummary,
    cashflow: {
      cashIn: roundMoney(txnCashIn),
      cashOut: roundMoney(txnCashOut),
      net: roundMoney(txnCashIn - txnCashOut),
      transactionCount: financeTxns.length,
    },
  };
}
