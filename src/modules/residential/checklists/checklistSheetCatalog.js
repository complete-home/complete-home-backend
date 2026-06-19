/**
 * Human-readable checklist sheet ids (stored as sheetCode) per phase.
 * Legacy codes (C-1, C1, …) are migrated via npm run migrate:sheet-codes
 */

export const PLANNING_SHEETS = [
  {
    id: "concept-architecture",
    legacy: "C-1",
    label: "Concept & Architecture",
  },
  { id: "structural-drawing", legacy: "C-2", label: "Structural Drawing" },
  { id: "mepf-drawing", legacy: "C-3", label: "M.E.P.F. Drawing" },
  { id: "interior-drawing", legacy: "C-4", label: "Interior Drawing" },
];

export const MATERIAL_BRAND_SHEETS = [
  { id: "land-structure", legacy: "C1", label: "Land & Structure" },
  { id: "openings", legacy: "C2", label: "Openings Selection" },
  { id: "mep-phase", legacy: "C3", label: "MEP Phase" },
  { id: "interior-finishes", legacy: "C4", label: "Interior Finishes" },
  { id: "finishes-fixtures", legacy: "C5", label: "Finishes & Fixtures" },
  { id: "final-selections", legacy: "C6", label: "Final Selections" },
];

export const EXECUTION_SHEETS = [
  { id: "civil-works", legacy: "C-1", label: "Civil Works" },
  { id: "plumbing", legacy: "C-2", label: "Plumbing" },
  { id: "electrical", legacy: "C-3", label: "Electrical" },
  { id: "waterproofing", legacy: "C-4", label: "Waterproofing" },
  { id: "flooring", legacy: "C-5", label: "Flooring" },
  { id: "hvac-ac", legacy: "C-6", label: "HVAC & AC" },
  { id: "ceiling-systems", legacy: "C-7", label: "Ceiling Systems" },
  { id: "walls-panelling", legacy: "C-8", label: "Walls & Panelling" },
  { id: "carpentry-joinery", legacy: "C-9", label: "Carpentry & Joinery" },
  { id: "paint-finishes", legacy: "C-10", label: "Paint & Finishes" },
  { id: "hardware-washroom", legacy: "C-11", label: "Hardware & Washroom" },
  { id: "snag-handover", legacy: "C-12", label: "Snag & Handover" },
];

export const SITE_MANAGEMENT_SHEETS = [
  { id: "pooja-kickoff", label: "Pooja & Site Kickoff" },
];

const SHEETS_BY_PHASE = {
  planning: PLANNING_SHEETS,
  material_brand: MATERIAL_BRAND_SHEETS,
  execution: EXECUTION_SHEETS,
  site_management: SITE_MANAGEMENT_SHEETS,
};

const LEGACY_TO_ID = {};
for (const [phase, sheets] of Object.entries(SHEETS_BY_PHASE)) {
  LEGACY_TO_ID[phase] = {};
  for (const s of sheets) {
    LEGACY_TO_ID[phase][s.id] = s.id;
    if (s.legacy) LEGACY_TO_ID[phase][s.legacy] = s.id;
  }
}

const ORDER_INDEX = {};
for (const [phase, sheets] of Object.entries(SHEETS_BY_PHASE)) {
  ORDER_INDEX[phase] = Object.fromEntries(sheets.map((s, i) => [s.id, i]));
}

export function resolveSheetId(phase, sheetCode) {
  if (!sheetCode) return sheetCode;
  return LEGACY_TO_ID[phase]?.[sheetCode] || sheetCode;
}

export function getSheetLabel(phase, sheetCode) {
  const id = resolveSheetId(phase, sheetCode);
  const sheet = SHEETS_BY_PHASE[phase]?.find((s) => s.id === id);
  return sheet?.label || sheetCode;
}

export function getSheetsForPhase(phase) {
  return SHEETS_BY_PHASE[phase] || [];
}

export function sortSheetCodes(phase, codes) {
  const order = ORDER_INDEX[phase] || {};
  return [...codes].sort(
    (a, b) =>
      (order[resolveSheetId(phase, a)] ?? 99) -
      (order[resolveSheetId(phase, b)] ?? 99),
  );
}

/** Map legacy parser output → catalog id */
export function mapLegacyPlanningCode(legacy) {
  return LEGACY_TO_ID.planning[legacy] || legacy;
}

export function mapLegacyMaterialCode(legacy) {
  return LEGACY_TO_ID.material_brand[legacy] || legacy;
}

export function mapLegacyExecutionCode(legacy) {
  return LEGACY_TO_ID.execution[legacy] || legacy;
}

export function getAllLegacyMappings() {
  const rows = [];
  for (const [phase, sheets] of Object.entries(SHEETS_BY_PHASE)) {
    for (const s of sheets) {
      if (s.legacy)
        rows.push({ phase, legacy: s.legacy, id: s.id, label: s.label });
    }
  }
  return rows;
}
