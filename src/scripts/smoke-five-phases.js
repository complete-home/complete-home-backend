/**
 * API smoke test: five project hub phases + person-wise payees.
 * Usage: npm run smoke:five-phases
 * Requires: MongoDB + API running (npm run dev), or only Mongo for template counts.
 */
import "dotenv/config";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import ChecklistTemplate from "../modules/residential/checklists/checklistTemplate.model.js";
import { env } from "../config/env.js";

const API = process.env.SMOKE_API_URL || `http://127.0.0.1:${env.port}/api/v1`;

async function api(path, { method = "GET", token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

async function login() {
  const { ok, json } = await api("/auth/login", {
    method: "POST",
    body: {
      userId: env.seedAdminUserId,
      password: env.seedAdminPassword,
    },
  });
  if (!ok)
    throw new Error(`Login failed: ${json?.error?.message || "unknown"}`);
  return json.data?.token;
}

function assert(name, cond, detail = "") {
  if (!cond) throw new Error(`${name} failed${detail ? `: ${detail}` : ""}`);
  console.log(`  ✓ ${name}`);
}

async function smokeTemplates() {
  await connectDatabase();
  const phases = [
    ["planning", 4],
    ["material_brand", 5],
    ["execution", 12],
    ["site_management", 1],
  ];
  for (const [phase, minSheets] of phases) {
    const sheets = await ChecklistTemplate.distinct("sheetCode", { phase });
    assert(
      `Templates ${phase}`,
      sheets.length >= minSheets,
      `found ${sheets.length} sheets`,
    );
  }
  await disconnectDatabase();
}

async function smokeApi(token) {
  const projects = await api("/projects?module=residential", { token });
  assert("List projects", projects.ok);
  const items = projects.json?.data?.items ?? projects.json?.data ?? [];
  const projectId = items[0]?.id || items[0]?._id;
  assert("Has at least one project", projectId, "run npm run seed");

  const checks = [
    [`/projects/${projectId}`, "GET project"],
    [`/projects/${projectId}/phases`, "GET phases"],
    [`/projects/${projectId}/finance/summary`, "GET finance"],
    [`/projects/${projectId}/agreement`, "GET agreement"],
    [`/projects/${projectId}/checklists?phase=planning`, "GET planning"],
    [
      `/projects/${projectId}/checklists?phase=material_brand`,
      "GET material brands",
    ],
    [`/projects/${projectId}/checklists?phase=execution`, "GET execution"],
    [
      `/projects/${projectId}/checklists?phase=site_management`,
      "GET site mgmt",
    ],
    [`/projects/${projectId}/material/selections`, "GET material selections"],
    [`/projects/${projectId}/site-management`, "GET site management"],
    [`/projects/${projectId}/finance/payees`, "GET person-wise payees"],
  ];

  for (const [path, label] of checks) {
    const r = await api(path, { token });
    assert(label, r.ok, `HTTP ${r.status}`);
  }

  const payees = await api(`/projects/${projectId}/finance/payees`, { token });
  const list = payees.json?.data?.payees || [];
  if (list.length) {
    const key = list[0].payeeKey;
    const detail = await api(`/projects/${projectId}/finance/payees/${key}`, {
      token,
    });
    assert("GET payee detail", detail.ok);
  } else {
    console.log(
      "  ⚠ Person-wise payees empty — initialize site management on project hub",
    );
  }

  return projectId;
}

async function main() {
  console.log("Five-phase smoke test\n— Template seeds (DB)");
  await smokeTemplates();

  console.log("\n— API endpoints", API);
  try {
    const token = await login();
    assert("Admin login", Boolean(token));
    await smokeApi(token);
    console.log("\nAll smoke checks passed.");
  } catch (e) {
    if (
      e.cause?.code === "ECONNREFUSED" ||
      e.message?.includes("fetch failed")
    ) {
      console.warn(
        "\nAPI not reachable. Start backend: npm run dev\nTemplate DB checks passed.",
      );
      process.exit(0);
    }
    throw e;
  }
}

main().catch((e) => {
  console.error("\nSmoke failed:", e.message);
  process.exit(1);
});
