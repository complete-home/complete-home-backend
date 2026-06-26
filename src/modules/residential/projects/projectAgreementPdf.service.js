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

function amountInWords(num) {
  const n = Math.round(Number(num) || 0);
  if (!n) return "Zero";
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const two = (x) => {
    if (x < 20) return ones[x];
    return `${tens[Math.floor(x / 10)]}${x % 10 ? ` ${ones[x % 10]}` : ""}`.trim();
  };
  const three = (x) => {
    if (x < 100) return two(x);
    return `${ones[Math.floor(x / 100)]} Hundred${x % 100 ? ` ${two(x % 100)}` : ""}`.trim();
  };
  const parts = [];
  let rem = n;
  const crore = Math.floor(rem / 10000000);
  rem %= 10000000;
  const lakh = Math.floor(rem / 100000);
  rem %= 100000;
  const thousand = Math.floor(rem / 1000);
  rem %= 1000;
  if (crore) parts.push(`${three(crore)} Crore`);
  if (lakh) parts.push(`${two(lakh)} Lakh`);
  if (thousand) parts.push(`${two(thousand)} Thousand`);
  if (rem) parts.push(three(rem));
  return parts.join(" ");
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

const AGREEMENT_SECTIONS = [
  {
    title: "1. PROJECT DETAILS",
    body: (ctx) =>
      `<p><strong>Project Name:</strong> ${escapeHtml(ctx.projectName)}</p>
       <p><strong>Project Location:</strong> ${escapeHtml(ctx.siteAddress)}</p>
       <p><strong>Project Type:</strong> ${escapeHtml(ctx.projectType)}</p>
       <p><strong>Built-up Area:</strong> ${escapeHtml(ctx.area)} Sq.ft.</p>`,
  },
  {
    title: "2. APPOINTMENT",
    body: () =>
      `<p>The Client hereby appoints Complete Home as the Design-Build Contractor for planning, designing, material procurement, labour management, construction, interior execution, supervision, quality control and project handover.</p>
       <p>Complete Home agrees to execute the work in accordance with the approved quotation, drawings, specifications and terms contained in this Agreement.</p>`,
  },
  {
    title: "3. CONTRACT VALUE",
    body: (ctx) =>
      `<p>The total contract value shall be:</p>
       <p><strong>${fmtMoney(ctx.contractValue)}</strong></p>
       <p>(Rupees <strong>${escapeHtml(ctx.amountInWords)}</strong> Only)</p>
       <p>The contract value shall be governed by the approved quotation attached with this Agreement.</p>`,
  },
  {
    title: "4. SCOPE OF WORK",
    body: () =>
      `<p>The scope of work shall be as detailed in the approved quotation, BOQ, drawings and specifications. Only works specifically mentioned in the approved quotation shall be deemed included in the contract value.</p>`,
  },
  {
    title: "5. MATERIAL SPECIFICATIONS",
    body: () =>
      `<p>All materials shall be supplied and installed as per the approved quotation and material specifications. Any change requested by the Client shall be treated as Variation Work and charged separately.</p>`,
  },
  {
    title: "6. PAYMENT TERMS",
    body: () =>
      `<p>Payment shall be made strictly as per the approved payment schedule. Complete Home reserves the right to suspend work if any payment remains overdue. Any delay in payment shall automatically extend the project completion timeline.</p>`,
  },
  {
    title: "7. PROJECT DURATION",
    body: (ctx) =>
      `<p>Commencement: <strong>${escapeHtml(ctx.startDate)}</strong> · Expected completion: <strong>${escapeHtml(ctx.completionDate)}</strong> · Duration: ${escapeHtml(ctx.durationMonths)} months, subject to site conditions, approvals, material availability and timely payments.</p>`,
  },
  {
    title: "8. VARIATION / EXTRA WORK",
    body: () =>
      `<p>Any work not included in the approved quotation shall be treated as Variation Work, documented separately, requiring Client approval, charged additionally, and may extend timelines.</p>`,
  },
  {
    title: "9. CLIENT RESPONSIBILITIES",
    body: () =>
      `<p>The Client shall provide uninterrupted site access, release payments per schedule, provide timely approvals for drawings, materials and variations, and ensure electricity and water during execution unless otherwise agreed.</p>`,
  },
  {
    title: "10. QUALITY & EXECUTION",
    body: () =>
      `<p>Complete Home shall execute the project using standard construction practices and accepted workmanship standards. Minor shade variations, natural material variations and manufacturing tolerances shall not be considered defects.</p>`,
  },
  {
    title: "11. WARRANTY",
    body: (ctx) =>
      `<p>Complete Home shall provide workmanship warranty of <strong>${escapeHtml(ctx.warrantyYears)} year(s)</strong> as specified in the approved quotation. Warranty excludes natural wear and tear, structural movement, misuse, third-party damage, natural calamities, and client-supplied materials against advice.</p>`,
  },
  {
    title: "12. DELAY & EXTENSION OF TIME",
    body: () =>
      `<p>The project schedule shall automatically extend for delayed client approvals or payments, variation work, material or labour shortages, government restrictions, force majeure, or adverse weather beyond reasonable control.</p>`,
  },
  {
    title: "15. DOCUMENTS FORMING PART OF THIS AGREEMENT",
    body: () =>
      `<ol>
        <li>Approved Quotation</li>
        <li>BOQ</li>
        <li>Approved Drawings</li>
        <li>Material Specifications</li>
        <li>Payment Schedule</li>
        <li>Variation Orders (if any)</li>
      </ol>
      <p>In case of conflict, the latest approved document shall prevail.</p>`,
  },
  {
    title: "13. TERMINATION",
    body: () =>
      `<p>Either party may terminate with fifteen (15) days written notice. Upon termination, completed work shall be measured and billed, procured materials shall be payable, and all obligations settled before closure.</p>`,
  },
  {
    title: "14. DISPUTE RESOLUTION",
    body: () =>
      `<p>Disputes shall first be resolved through mutual discussion. Failing resolution, jurisdiction shall be courts at Durg, Chhattisgarh.</p>`,
  },
];

export async function buildAgreementPdfHtml(projectId) {
  const { agreement, project, company } = await getAgreementForPdf(projectId);
  const client = agreement.clientParty || {};
  const consultant = agreement.consultantParty || {};
  const companyName = consultant.company || company?.name || "Complete Home";
  const logoUrl = company?.logoUrl || "/assets/logo.png";
  const companyAddress =
    company?.address ||
    consultant.address ||
    "Complete Home — Plan • Design • Build";

  const ctx = {
    projectName: project.name,
    siteAddress: agreement.siteAddress || project.siteAddress || "—",
    projectType: project.workType || "Residential",
    area: project.area || "—",
    contractValue: agreement.consultancyFeeTotal,
    amountInWords: amountInWords(agreement.consultancyFeeTotal),
    startDate: agreement.workStartDate || "—",
    completionDate: agreement.completionDate || "—",
    durationMonths: agreement.workDurationMonths || "—",
    warrantyYears: agreement.warrantyYears || 1,
  };

  const sectionsHtml = AGREEMENT_SECTIONS.map(
    (s) => `<section class="ag-section"><h2>${s.title}</h2>${s.body(ctx)}</section>`,
  ).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Agreement — ${escapeHtml(project.code)}</title>
  <style>
    @page { margin: 18mm 14mm; }
    body {
      font-family: "Segoe UI", Georgia, serif;
      color: #1a1a1a;
      max-width: 820px;
      margin: 0 auto;
      padding: 24px 20px 48px;
      line-height: 1.55;
      font-size: 13px;
      position: relative;
    }
    .watermark {
      position: fixed;
      top: 42%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-28deg);
      font-size: 84px;
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
      margin-bottom: 24px;
    }
    .header img { height: 56px; margin-bottom: 8px; }
    .header h1 {
      font-size: 18px;
      color: #00695c;
      margin: 8px 0 4px;
      letter-spacing: 0.3px;
      text-transform: uppercase;
    }
    .header .tagline { color: #757575; font-size: 12px; }
    h2 {
      font-size: 14px;
      color: #00695c;
      margin: 20px 0 8px;
      border-bottom: 1px solid #e0e0e0;
      padding-bottom: 4px;
    }
    .party-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin: 16px 0;
    }
    .party {
      padding: 14px;
      background: #f8fafb;
      border: 1px solid #e8ecef;
      border-radius: 8px;
    }
    .party strong { color: #00695c; display: block; margin-bottom: 6px; }
    table.lines { width: 100%; border-collapse: collapse; font-size: 11px; margin: 10px 0; }
    table.lines th, table.lines td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
    table.lines th { background: #e0f2f1; color: #004d40; }
    .num { text-align: right; }
    .signatures { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .sign-block { border-top: 1px solid #333; padding-top: 8px; margin-top: 48px; }
    .witness { margin-top: 32px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 12px; }
    @media print { .no-print { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="watermark">COMPLETE HOME</div>
  <div class="content">
    <div class="no-print" style="margin-bottom:16px">
      <button onclick="window.print()" style="background:#00897b;color:#fff;border:none;padding:10px 18px;border-radius:6px;cursor:pointer;font-weight:600">Print / Save as PDF</button>
    </div>

    <header class="header">
      <img src="${escapeHtml(logoUrl)}" alt="Complete Home" onerror="this.style.display='none'" />
      <h1>Construction &amp; Interior Design-Build Agreement</h1>
      <p class="tagline">Plan • Design • Build</p>
      <p style="margin-top:8px;font-size:12px;color:#616161">Executed on <strong>${escapeHtml(agreement.agreementDate || new Date().toLocaleDateString("en-IN"))}</strong> · Project ${escapeHtml(project.code)}</p>
    </header>

    <div class="party-grid">
      <div class="party">
        <strong>FIRST PARTY (CLIENT)</strong>
        Name: ${escapeHtml(client.name)}<br/>
        Address: ${escapeHtml(client.address)}<br/>
        Mobile: ${escapeHtml(client.phone)}<br/>
        <em>(Hereinafter referred to as the "Client")</em>
      </div>
      <div class="party">
        <strong>SECOND PARTY</strong>
        ${escapeHtml(companyName)}<br/>
        <span class="tagline">Plan • Design • Build</span><br/>
        Address: ${escapeHtml(companyAddress)}<br/>
        Mobile: ${escapeHtml(consultant.phone || company?.phone || "—")}<br/>
        <em>(Hereinafter referred to as the "Contractor")</em>
      </div>
    </div>

    ${sectionsHtml}

    <section class="ag-section">
      <h2>Payment Schedule (Client)</h2>
      ${renderMilestones(agreement.clientMilestones)}
    </section>

    <section class="ag-section">
      <h2>Annexure-I — Subcontractor Payment Schedule</h2>
      ${renderSubcontractor(agreement.subcontractorSchedule)}
    </section>

    <section class="ag-section">
      <h2>Annexure-II — Approved Contractors &amp; Contract Amounts</h2>
      ${renderTrades(agreement.approvedTrades)}
    </section>

    <section class="ag-section">
      <h2>16. ACCEPTANCE</h2>
      <p>Both parties confirm that they have read, understood and accepted all terms and conditions of this Agreement.</p>
      <div class="signatures">
        <div>
          <p><strong>FIRST PARTY (CLIENT)</strong></p>
          <p>Name: ${escapeHtml(client.name)}</p>
          <div class="sign-block">Signature: ________________</div>
          <p>Date: ________________</p>
        </div>
        <div>
          <p><strong>FOR COMPLETE HOME</strong></p>
          <p>Authorized Signatory</p>
          <div class="sign-block">Signature: ________________</div>
          <p>Date: ________________</p>
        </div>
      </div>
      <div class="witness">
        <div><strong>Witness 1</strong><br/>Name: _______________<br/>Signature: _______________</div>
        <div><strong>Witness 2</strong><br/>Name: _______________<br/>Signature: _______________</div>
      </div>
    </section>
  </div>
</body>
</html>`;
}
