/** No fixed 50/30/20 — user adds milestones in the hub. */
export const DEFAULT_CLIENT_MILESTONES = [];

export const DEFAULT_AGREEMENT_STATUSES = ["draft", "finalized", "signed"];

/** Annexure-I subcontractor payment schedule. */
export const DEFAULT_SUBCONTRACTOR_SCHEDULE = [
  {
    stageNo: 1,
    description: "Work award / mobilization",
    percent: 10,
    condition: "Payable after issue of work order and mobilization at site",
  },
  {
    stageNo: 2,
    description: "25% work completion (verified)",
    percent: 20,
    condition: "Payable after verification of measurement and progress",
  },
  {
    stageNo: 3,
    description: "50% work completion",
    percent: 25,
    condition: "Payable after inspection and confirmation of quality",
  },
  {
    stageNo: 4,
    description: "75% work completion",
    percent: 25,
    condition: "Payable after satisfactory progress per approved drawings",
  },
  {
    stageNo: 5,
    description: "100% completion of respective work",
    percent: 15,
    condition: "Payable after inspection, certification, and client approval",
  },
  {
    stageNo: 6,
    description: "Defect rectification / finishing",
    percent: 5,
    condition:
      "Released after final completion, defect correction, and handover",
  },
];

/** Annexure-II trade rows (contractor details filled per project). */
export const DEFAULT_APPROVED_TRADES = [
  "CIVIL",
  "TILES",
  "STONE",
  "ELECTRIC",
  "AC",
  "F. CEILING",
  "CARPENTRY",
  "UPVC CARPENTER",
  "UPVC DOOR & WINDOW",
  "PAINTING",
  "PLUMBING",
  "WATERPROOFING",
  "GLASS WORK",
  "CLEANING",
  "FAB. (IRON)",
  "FAB. (STEEL)",
  "WIFI",
  "CAMERA",
  "CHIMNEY",
  "RO",
  "DISMANTLING",
  "PEST CONTROL",
  "PAVER BLOCK",
  "ACP",
  "ALUMINIUM",
  "WALLPAPER",
  "VINYL FLOORING",
  "GAS PIPELINE",
].map((trade) => ({
  trade,
  contractorName: "",
  mobile: "",
  contractAmount: "",
  notes: "",
}));

export const DEFAULT_CONSULTANCY_FEE = 194850;
export const DEFAULT_PENALTY_PER_MONTH = 50000;
export const DEFAULT_WARRANTY_YEARS = 1;
export const DEFAULT_WORK_DURATION_MONTHS = 7;
