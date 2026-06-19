import { Company } from "../../common/organization/organization.model.js";
import Enquiry from "../enquiries/enquiry.model.js";
import Quotation from "./quotation.model.js";
import { formatQuotationDetail } from "./quotation.service.js";
import { FORMAT_TYPE_LABELS } from "../../common/quotation-templates/quotationTemplate.constants.js";
import AppError from "../../../core/errors/AppError.js";

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderLineRows(items, showRate, showGst) {
  if (!items?.length) return "";
  return items
    .map(
      (row) => `
    <tr>
      <td>${escapeHtml(row.name)}</td>
      <td>${escapeHtml(row.unit || "—")}</td>
      <td>${escapeHtml(row.qty ?? row.quantity ?? "—")}</td>
      ${showRate ? `<td class="num">${escapeHtml(row.rate)}</td>` : ""}
      ${showRate ? `<td class="num">${escapeHtml(row.lineAmountFormatted || row.price)}</td>` : ""}
      ${showGst ? `<td>${escapeHtml(row.gstPercentage || "—")}</td>` : ""}
    </tr>`,
    )
    .join("");
}

function groupLinesByField(rows) {
  const order = [];
  const map = new Map();
  for (const row of rows || []) {
    const key = String(row.group || "").trim() || "General";
    if (!map.has(key)) {
      order.push(key);
      map.set(key, []);
    }
    map.get(key).push(row);
  }
  return order.map((group) => ({ group, lines: map.get(group) }));
}

function renderGroupedSections(allLines, showRate, showGst) {
  if (!allLines?.length) return "";
  const gstCol = showGst ? "<th>GST %</th>" : "";
  const rateCols = showRate ? "<th>Rate</th><th>Amount</th>" : "";

  return groupLinesByField(allLines)
    .map((section) => {
      const subtotal =
        section.lines.reduce(
          (s, row) => s + (Number(row.lineAmount) || 0),
          0,
        ) || 0;
      const subFmt = `₹${Math.round(subtotal).toLocaleString("en-IN")}`;
      return `
    <div class="quote-section">
      <h3 class="section-head">${escapeHtml(section.group)}</h3>
      <table class="lines">
        <thead><tr><th>Item</th><th>Unit</th><th>Qty</th>${rateCols}${gstCol}</tr></thead>
        <tbody>${renderLineRows(section.lines, showRate, showGst)}</tbody>
        ${
          showRate
            ? `<tfoot><tr><td colspan="${showGst ? 5 : 4}" class="section-sub">Section total</td><td class="num section-sub">${escapeHtml(subFmt)}</td></tr></tfoot>`
            : ""
        }
      </table>
    </div>`;
    })
    .join("");
}

function renderGroupSummaryTable(groupSubtotals) {
  if (!groupSubtotals?.length) return "";
  const rows = groupSubtotals
    .map(
      (g) => `
    <tr>
      <td>${escapeHtml(g.group)}</td>
      <td class="num">${escapeHtml(g.amountFormatted)}</td>
    </tr>`,
    )
    .join("");
  return `
    <h3>Summary</h3>
    <table class="lines summary">
      <thead><tr><th>Description</th><th class="num">Amount (₹)</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderFlatSections(products, services, showProducts, showRate, showGst, formatType) {
  const gstCol = showGst ? "<th>GST %</th>" : "";
  const rateCols = showRate ? "<th>Rate</th><th>Amount</th>" : "";

  const productsSection =
    showProducts && products?.length
      ? `<h3>Materials / Products</h3>
    <table class="lines">
      <thead><tr><th>Item</th><th>Unit</th><th>Qty</th>${rateCols}${gstCol}</tr></thead>
      <tbody>${renderLineRows(products, showRate, showGst)}</tbody>
    </table>`
      : "";

  const servicesSection = services?.length
      ? `<h3>${formatType === "services_only" ? "Scope & services" : "Services"}</h3>
    <table class="lines">
      <thead><tr><th>Item</th><th>Unit</th><th>Qty</th>${rateCols}${gstCol}</tr></thead>
      <tbody>${renderLineRows(services, showRate, showGst)}</tbody>
    </table>`
      : "";

  return productsSection + servicesSection;
}

function renderPaymentSchedule(schedule) {
  if (!schedule?.length) return "";
  const rows = schedule
    .map(
      (s) => `
    <tr>
      <td>${escapeHtml(s.label)}</td>
      <td class="num">${escapeHtml(s.percent)}%</td>
      <td>${escapeHtml(s.terms)}</td>
    </tr>`,
    )
    .join("");
  return `
    <h3>Payment schedule</h3>
    <table class="lines">
      <thead><tr><th>Milestone</th><th>%</th><th>Terms</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

export async function buildQuotationPdfHtml(enquiryId, quotationId) {
  const quotation = await Quotation.findOne({ _id: quotationId, enquiryId });
  if (!quotation) throw AppError.notFound("Quotation not found");

  const [enquiry, company] = await Promise.all([
    Enquiry.findById(enquiryId).lean(),
    Company.findOne({ singletonKey: "default" }).lean(),
  ]);

  const q = formatQuotationDetail(quotation);
  const formatLabel =
    FORMAT_TYPE_LABELS[q.formatType] || q.formatType || "Quotation";
  const showProducts =
    q.formatType !== "services_only" || (q.products?.length ?? 0) > 0;
  const companyName = company?.name || "Complete Home";
  const clientName =
    q.clientDisplay || enquiry?.clientName || enquiry?.name || "Client";

  const allLines = [
    ...(showProducts ? q.products || [] : []),
    ...(q.services || []),
  ];

  const lineSections = q.showGroupWise
    ? renderGroupedSections(allLines, q.showRate, q.showGst) +
      renderGroupSummaryTable(q.groupSubtotals)
    : renderFlatSections(
        q.products,
        q.services,
        showProducts,
        q.showRate,
        q.showGst,
        q.formatType,
      );

  const billToBlock = `
    <div class="bill-to">
      <strong>Bill To</strong><br/>
      ${escapeHtml(clientName)}<br/>
      ${enquiry?.mobile ? `Mo. ${escapeHtml(enquiry.mobile)}<br/>` : ""}
      ${enquiry?.fullAddress || enquiry?.address ? escapeHtml(enquiry.fullAddress || enquiry.address) : ""}
    </div>`;

  const companyBlock = `
    <div class="company-meta">
      ${company?.address ? `${escapeHtml(company.address)}<br/>` : ""}
      ${company?.mobile ? `Phone: ${escapeHtml(company.mobile)}<br/>` : ""}
      ${company?.email ? `Email: ${escapeHtml(company.email)}<br/>` : ""}
      ${company?.gstin ? `GSTIN: ${escapeHtml(company.gstin)}<br/>` : ""}
      ${company?.state ? `State: ${escapeHtml(company.state)}` : ""}
    </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(q.code)} — ${escapeHtml(companyName)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; color: #212121; margin: 0; padding: 24px 32px; font-size: 13px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #00897b; padding-bottom: 12px; margin-bottom: 20px; }
    .brand { font-size: 18px; font-weight: 700; color: #00897b; }
    .meta { text-align: right; font-size: 12px; color: #616161; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .badge { display: inline-block; background: #e0f2f1; color: #00897b; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    h3 { font-size: 12px; text-transform: uppercase; color: #757575; margin: 20px 0 8px; }
    h3.section-head { font-size: 14px; color: #00897b; text-transform: none; margin-top: 16px; }
    .bill-to { background: #00695c; color: #fff; padding: 12px 16px; border-radius: 4px; margin: 12px 0 20px; font-size: 13px; }
    .company-meta { font-size: 12px; color: #616161; margin-top: 4px; }
    table.lines { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    table.lines th, table.lines td { border: 1px solid #e0e0e0; padding: 8px 10px; text-align: left; }
    table.lines th { background: #fafafa; font-size: 11px; text-transform: uppercase; color: #757575; }
    table.lines.summary { max-width: 480px; }
    td.num { text-align: right; }
    .section-sub { font-weight: 700; background: #f5f5f5; }
    .quote-section { margin-bottom: 8px; }
    .totals { margin-left: auto; width: 280px; margin-top: 16px; }
    .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
    .totals .grand { font-weight: 700; font-size: 16px; color: #00897b; border-top: 1px solid #e0e0e0; padding-top: 8px; margin-top: 8px; }
    .terms { margin-top: 24px; padding: 12px; background: #fafafa; border: 1px solid #e0e0e0; white-space: pre-wrap; }
    @media print { body { padding: 12px; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom:16px">
    <button onclick="window.print()" style="background:#00897b;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600">Print / Save as PDF</button>
  </div>
  <div class="header">
    <div>
      <div class="brand">${escapeHtml(companyName)}</div>
      ${company?.website ? `<div style="font-size:12px;color:#616161">${escapeHtml(company.website)}</div>` : ""}
      ${companyBlock}
    </div>
    <div class="meta">
      <div><strong>${escapeHtml(q.code)}</strong></div>
      <div>Date: ${escapeHtml(q.createdAt)}</div>
      <div>Status: ${escapeHtml(q.status)}</div>
    </div>
  </div>
  <h1>${escapeHtml(q.variantLabel || q.name)}</h1>
  <span class="badge">${escapeHtml(formatLabel)}</span>
  ${billToBlock}
  ${lineSections}
  ${renderPaymentSchedule(q.paymentSchedule)}
  ${
    q.showRate
      ? `<div class="totals">
    <div><span>Subtotal</span><span>${escapeHtml(q.subtotal)}</span></div>
    <div><span>Tax (${escapeHtml(q.taxPercent)}%)</span><span>${escapeHtml(q.taxAmount)}</span></div>
    <div class="grand"><span>Grand Total</span><span>${escapeHtml(q.grandTotal)}</span></div>
  </div>`
      : ""
  }
  ${
    q.notes
      ? `<div class="terms"><strong>Notes</strong><br/>${escapeHtml(q.notes)}</div>`
      : ""
  }
  ${
    q.termsText
      ? `<div class="terms"><strong>Terms &amp; conditions</strong><br/>${escapeHtml(q.termsText)}</div>`
      : ""
  }
</body>
</html>`;
}
