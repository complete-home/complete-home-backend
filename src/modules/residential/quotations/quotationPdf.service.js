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

function renderCategorySectionsPdf(sections, heading, accent = "#00695c") {
  if (!sections?.length) return "";
  return sections
    .map((section) => {
      const items = (section.items || [])
        .map(
          (item) => `
        <tr>
          <td>${escapeHtml(item.title)}</td>
          <td>${escapeHtml(item.description || "—")}</td>
          <td class="num">${escapeHtml(item.lineTotalFormatted || `₹${Math.round(Number(item.lineTotal) || 0).toLocaleString("en-IN")}`)}</td>
        </tr>`,
        )
        .join("");
      const sectionTotal = section.sectionTotalFormatted
        || `₹${Math.round(Number(section.sectionTotal) || 0).toLocaleString("en-IN")}`;
      return `
    <div class="quote-section">
      <h3 class="section-head" style="color:${accent}">${escapeHtml(section.categoryLabel)}</h3>
      <table class="lines">
        <thead><tr><th>Item</th><th>Description</th><th class="num">Amount</th></tr></thead>
        <tbody>${items}</tbody>
        <tfoot><tr><td colspan="2" class="section-sub">Section total</td><td class="num section-sub">${escapeHtml(sectionTotal)}</td></tr></tfoot>
      </table>
    </div>`;
    })
    .join("");
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

  const categoryBlock = renderCategorySectionsPdf(
    q.categorySections,
    "Scope breakdown",
  );
  const extraWorkBlock = q.extraWorkEnabled
    ? `<div class="extra-work-wrap">
        <h2 style="color:#e65100">Extra Work</h2>
        ${renderCategorySectionsPdf(q.extraWorkSections, "Extra work", "#e65100")}
        ${
          q.extraWorkGrandTotal
            ? `<p class="extra-total">Extra work total: <strong>${escapeHtml(`₹${Math.round(Number(q.extraWorkGrandTotal) || 0).toLocaleString("en-IN")}`)}</strong></p>`
            : ""
        }
      </div>`
    : "";

  const logoUrl = company?.logoUrl || "/assets/logo.png";
  const companyAddress =
    company?.address || "Complete Home — Plan • Design • Build";

  const billToBlock = `
    <div class="meta-box">
      <strong>Bill To</strong>
      ${escapeHtml(clientName)}<br/>
      ${enquiry?.mobile ? `Mo. ${escapeHtml(enquiry.mobile)}<br/>` : ""}
      ${enquiry?.fullAddress || enquiry?.address ? escapeHtml(enquiry.fullAddress || enquiry.address) : ""}
    </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(q.code)} — ${escapeHtml(companyName)}</title>
  <style>
    @page { margin: 18mm 14mm; }
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", system-ui, sans-serif;
      color: #1a1a1a;
      max-width: 820px;
      margin: 0 auto;
      padding: 24px 20px 48px;
      line-height: 1.5;
      font-size: 13px;
      position: relative;
    }
    .watermark {
      position: fixed;
      top: 42%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-28deg);
      font-size: 72px;
      font-weight: 700;
      color: rgba(0, 137, 123, 0.07);
      white-space: nowrap;
      pointer-events: none;
      z-index: 0;
      letter-spacing: 6px;
    }
    .content { position: relative; z-index: 1; }
    .header {
      text-align: center;
      border-bottom: 3px solid #00897b;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .header img { height: 56px; margin-bottom: 8px; }
    .header .brand { font-size: 18px; font-weight: 700; color: #00695c; }
    .header .tagline { color: #757575; font-size: 12px; }
    .meta-row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 16px;
      font-size: 12px;
    }
    .meta-box {
      background: #f8fafb;
      border: 1px solid #e8ecef;
      border-radius: 8px;
      padding: 12px 14px;
      flex: 1;
    }
    .meta-box strong { color: #00695c; display: block; margin-bottom: 4px; }
    h1 { font-size: 20px; margin: 0 0 6px; color: #212121; }
    .badge {
      display: inline-block;
      background: #e0f2f1;
      color: #00897b;
      padding: 2px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }
    h2 { font-size: 14px; color: #00695c; margin: 20px 0 8px; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; }
    h3.section-head { font-size: 13px; text-transform: none; margin-top: 12px; }
    .extra-work-wrap {
      margin: 20px 0;
      padding: 14px;
      background: #fff8e1;
      border: 1px solid #ffcc80;
      border-radius: 8px;
    }
    .extra-total { text-align: right; font-size: 13px; margin-top: 8px; }
    table.lines { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 12px; }
    table.lines th, table.lines td { border: 1px solid #ddd; padding: 7px 9px; text-align: left; }
    table.lines th { background: #e0f2f1; color: #004d40; font-size: 11px; text-transform: uppercase; }
    table.lines.summary { max-width: 480px; }
    td.num { text-align: right; }
    .section-sub { font-weight: 700; background: #f5f5f5; }
    .quote-section { margin-bottom: 8px; }
    .totals { margin-left: auto; width: 300px; margin-top: 16px; }
    .totals div { display: flex; justify-content: space-between; padding: 5px 0; }
    .totals .grand {
      font-weight: 700;
      font-size: 16px;
      color: #00897b;
      border-top: 2px solid #00897b;
      padding-top: 8px;
      margin-top: 8px;
    }
    .terms {
      margin-top: 24px;
      padding: 12px 14px;
      background: #fafafa;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      white-space: pre-wrap;
    }
    .footer {
      margin-top: 32px;
      padding-top: 12px;
      border-top: 1px solid #e0e0e0;
      text-align: center;
      font-size: 11px;
      color: #757575;
    }
    @media print { .no-print { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="watermark">COMPLETE HOME</div>
  <div class="content">
  <div class="no-print" style="margin-bottom:16px">
    <button onclick="window.print()" style="background:#00897b;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600">Print / Save as PDF</button>
  </div>
  <div class="header">
    <img src="${escapeHtml(logoUrl)}" alt="Logo" onerror="this.style.display='none'" />
    <div class="brand">${escapeHtml(companyName)}</div>
    <div class="tagline">Plan • Design • Build</div>
    <div style="font-size:12px;color:#616161;margin-top:6px">${escapeHtml(companyAddress)}</div>
    ${company?.mobile ? `<div style="font-size:12px;color:#616161">Phone: ${escapeHtml(company.mobile)}</div>` : ""}
    ${company?.email ? `<div style="font-size:12px;color:#616161">Email: ${escapeHtml(company.email)}</div>` : ""}
    ${company?.gstin ? `<div style="font-size:12px;color:#616161">GSTIN: ${escapeHtml(company.gstin)}</div>` : ""}
  </div>
  <div class="meta-row">
    <div class="meta-box">
      <strong>Quotation</strong>
      ${escapeHtml(q.code)}<br/>
      Date: ${escapeHtml(q.createdAt)}<br/>
      Status: ${escapeHtml(q.status)}
    </div>
    ${billToBlock}
  </div>
  <h1>${escapeHtml(q.variantLabel || q.name)}</h1>
  <span class="badge">${escapeHtml(formatLabel)}</span>
  ${categoryBlock || lineSections}
  ${extraWorkBlock}
  ${renderPaymentSchedule(q.paymentSchedule)}
  ${
    q.showRate || categoryBlock || extraWorkBlock
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
  <div class="footer">
    ${escapeHtml(companyName)} · ${escapeHtml(company?.website || "www.completehome.in")}<br/>
    This is a computer-generated quotation and is valid subject to terms stated above.
  </div>
  </div>
</body>
</html>`;
}
