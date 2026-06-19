import { getAgreementForPdf } from "./projectAgreement.service.js";

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtMoney(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return `₹ ${num.toLocaleString("en-IN")}`;
}

function renderMilestones(rows) {
  if (!rows?.length) return "<p>—</p>";
  return `<table class="lines">
    <thead><tr><th>Milestone</th><th>%</th><th>Amount</th><th>Terms</th><th>Status</th></tr></thead>
    <tbody>${rows
      .map(
        (m) => `<tr>
      <td>${escapeHtml(m.label)}</td>
      <td class="num">${escapeHtml(m.percent)}%</td>
      <td class="num">${fmtMoney(m.amount)}</td>
      <td>${escapeHtml(m.trigger)}</td>
      <td>${escapeHtml(m.status)}</td>
    </tr>`,
      )
      .join("")}</tbody></table>`;
}

function renderSubcontractor(rows) {
  if (!rows?.length) return "<p>—</p>";
  return `<table class="lines">
    <thead><tr><th>Stage</th><th>Description</th><th>%</th><th>Condition</th></tr></thead>
    <tbody>${rows
      .map(
        (s) => `<tr>
      <td>${escapeHtml(s.stageNo)}</td>
      <td>${escapeHtml(s.description)}</td>
      <td class="num">${escapeHtml(s.percent)}%</td>
      <td>${escapeHtml(s.condition)}</td>
    </tr>`,
      )
      .join("")}</tbody></table>`;
}

function renderTrades(rows) {
  const filled = (rows || []).filter(
    (t) => t.contractorName || t.mobile || t.contractAmount,
  );
  const list = filled.length ? filled : rows || [];
  if (!list.length) return "<p>—</p>";
  return `<table class="lines">
    <thead><tr><th>Work</th><th>Contractor</th><th>Mobile</th><th>Amount</th></tr></thead>
    <tbody>${list
      .map(
        (t) => `<tr>
      <td>${escapeHtml(t.trade)}</td>
      <td>${escapeHtml(t.contractorName || "—")}</td>
      <td>${escapeHtml(t.mobile || "—")}</td>
      <td>${escapeHtml(t.contractAmount || "—")}</td>
    </tr>`,
      )
      .join("")}</tbody></table>`;
}

export async function buildAgreementPdfHtml(projectId) {
  const { agreement, project, company } = await getAgreementForPdf(projectId);
  const client = agreement.clientParty || {};
  const consultant = agreement.consultantParty || {};
  const companyName = consultant.company || company?.name || "Complete Home";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Agreement — ${escapeHtml(project.code)}</title>
  <style>
    body { font-family: system-ui, sans-serif; color: #212121; max-width: 800px; margin: 24px auto; padding: 0 16px; line-height: 1.5; }
    h1 { font-size: 20px; color: #00897b; margin-bottom: 8px; }
    h2 { font-size: 15px; margin-top: 24px; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; }
    h3 { font-size: 13px; margin-top: 16px; }
    .meta { color: #616161; font-size: 13px; }
    table.lines { width: 100%; border-collapse: collapse; font-size: 12px; margin: 8px 0; }
    table.lines th, table.lines td { border: 1px solid #e0e0e0; padding: 6px 8px; text-align: left; }
    table.lines th { background: #f5f5f5; }
    .num { text-align: right; }
    .party { margin: 12px 0; padding: 12px; background: #fafafa; border-radius: 8px; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom:16px">
    <button onclick="window.print()" style="background:#00897b;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600">Print / Save as PDF</button>
  </div>

  <h1>Renovation Work Planning &amp; Supervision Agreement</h1>
  <p class="meta">Project: ${escapeHtml(project.name)} (${escapeHtml(project.code)}) · Status: ${escapeHtml(agreement.status)}</p>
  ${agreement.agreementDate ? `<p class="meta">Agreement date: ${escapeHtml(agreement.agreementDate)}</p>` : ""}

  <h2>Parties</h2>
  <div class="party">
    <strong>First Party (Client / Owner)</strong><br/>
    Name: ${escapeHtml(client.name)}<br/>
    Address: ${escapeHtml(client.address)}<br/>
    Contact: ${escapeHtml(client.phone)}
  </div>
  <div class="party">
    <strong>Second Party (Consultant)</strong><br/>
    ${escapeHtml(companyName)}<br/>
    Name: ${escapeHtml(consultant.name)}<br/>
    Address: ${escapeHtml(consultant.address)}<br/>
    Contact: ${escapeHtml(consultant.phone)}
  </div>

  <h2>1. Purpose</h2>
  <p>Planning, designing, execution, and supervision of renovation work at:</p>
  <p><strong>${escapeHtml(agreement.siteAddress)}</strong></p>

  <h2>3. Work duration</h2>
  <p>Commencement: ${escapeHtml(agreement.workStartDate || "—")} · Period: ${escapeHtml(agreement.workDurationMonths)} months (or until completion, whichever is earlier)</p>

  <h2>4. Consultancy fees &amp; payment terms</h2>
  <p>Total consideration: <strong>${fmtMoney(agreement.consultancyFeeTotal)}</strong> (inclusive of taxes and supervision).</p>
  <p>Delay penalty (if attributable to consultant): ${fmtMoney(agreement.penaltyPerMonth)} per month.</p>
  <h3>Client payment milestones</h3>
  ${renderMilestones(agreement.clientMilestones)}

  <h2>Annexure-I — Subcontractor payment schedule</h2>
  ${renderSubcontractor(agreement.subcontractorSchedule)}

  <h2>Annexure-II — Approved contractors</h2>
  ${renderTrades(agreement.approvedTrades)}

  <h2>7. Warranty</h2>
  <p>${escapeHtml(agreement.warrantyYears)} year(s) defect liability from final handover, subject to agreement terms.</p>

  ${agreement.notes ? `<h2>Notes</h2><p>${escapeHtml(agreement.notes)}</p>` : ""}

  <h2>13. Signatures</h2>
  <table style="width:100%;margin-top:24px">
    <tr>
      <td style="width:50%;vertical-align:top">
        <p>Client</p>
        <p>________________________</p>
        <p>${escapeHtml(client.name)}</p>
      </td>
      <td style="width:50%;vertical-align:top">
        <p>Consultant</p>
        <p>________________________</p>
        <p>${escapeHtml(consultant.name || companyName)}</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
