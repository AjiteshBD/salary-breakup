// Authoritative salary-breakup policy table for FY 2026-27.
// Source: "Salary BreakUp Policy 26-27.xlsx" (Appx. Policy sheet).
// Every percentage is a fraction of the FIXED pay (CTC minus variable).
// Within each band/scenario the components sum to exactly 1.00 (100% of fixed).

export type ComponentKey =
  | "basic"
  | "hra"
  | "lta"
  | "special"
  | "fuel"
  | "driver"
  | "books"
  | "telephone"
  | "office"
  | "bizPromo"
  | "meal"
  | "pf"
  | "esic"
  | "pi";

export type Group = "A" | "B" | "C" | "D";

export interface ComponentDef {
  key: ComponentKey;
  label: string;
  group: Group;
}

// Display order + grouping, matching the policy sheet.
export const COMPONENTS: ComponentDef[] = [
  { key: "basic", label: "Basic Salary", group: "A" },
  { key: "hra", label: "HRA", group: "A" },
  { key: "lta", label: "LTA", group: "A" },
  { key: "special", label: "Special Allowance", group: "A" },
  { key: "fuel", label: "Fuel & Vehicle (R)", group: "B" },
  { key: "driver", label: "Driver Salary (R)", group: "B" },
  { key: "books", label: "Books & Periodicals (R)", group: "B" },
  { key: "telephone", label: "Telephone Allowance (R)", group: "B" },
  { key: "office", label: "Office Attire (R)", group: "B" },
  { key: "bizPromo", label: "Business Promotion (R)", group: "B" },
  { key: "meal", label: "Meal Coupons (R)", group: "B" },
  { key: "pf", label: "Provident Fund", group: "C" },
  { key: "esic", label: "ESIC", group: "C" },
  { key: "pi", label: "Performance Incentive", group: "D" },
];

export const GROUP_LABELS: Record<Group, string> = {
  A: "Fixed Components",
  B: "Reimbursement Components",
  C: "Statutory Benefits",
  D: "Performance Incentive",
};

export type Pct = Record<ComponentKey, number>;

const ZERO: Pct = {
  basic: 0, hra: 0, lta: 0, special: 0, fuel: 0, driver: 0, books: 0,
  telephone: 0, office: 0, bizPromo: 0, meal: 0, pf: 0, esic: 0, pi: 0,
};

const pct = (p: Partial<Pct>): Pct => ({ ...ZERO, ...p });

export type BandKey = "director" | "gt50" | "b25_50" | "b12_25" | "lt12";

export interface BandDef {
  key: BandKey;
  label: string;
  range: string;
  // withPF: policy "If PF" column. noPF: policy "If No PF" column.
  withPF: Pct;
  noPF: Pct;
}

export const BANDS: Record<BandKey, BandDef> = {
  director: {
    key: "director",
    label: "Director",
    range: "Role-based",
    // Director has a single structure (no PF). Business Promotion 7% included
    // so the column totals 100%.
    withPF: pct({ basic: 0.51, hra: 0.21, lta: 0.03, special: 0.18, bizPromo: 0.07 }),
    noPF: pct({ basic: 0.51, hra: 0.21, lta: 0.03, special: 0.18, bizPromo: 0.07 }),
  },
  gt50: {
    key: "gt50",
    label: "Employee > 50 Lacs",
    range: "Above ₹50,00,000",
    withPF: pct({
      basic: 0.51, hra: 0.175, lta: 0.015, special: 0.1,
      fuel: 0.03, driver: 0.03, books: 0.0052, telephone: 0.005, office: 0.01, meal: 0.0102,
      pf: 0.0612, pi: 0.0484,
    }),
    noPF: pct({
      basic: 0.51, hra: 0.2, lta: 0.02, special: 0.12,
      fuel: 0.055, driver: 0.055, books: 0.0076, telephone: 0.005, office: 0.01, meal: 0.0174,
    }),
  },
  b25_50: {
    key: "b25_50",
    label: "Employee 25–50 Lacs",
    range: "₹25,00,000 – ₹50,00,000",
    withPF: pct({
      basic: 0.51, hra: 0.2, lta: 0.02, special: 0.12,
      fuel: 0.02, driver: 0.02, books: 0.0038, telephone: 0.02, office: 0.025,
      pf: 0.0612,
    }),
    noPF: pct({
      basic: 0.51, hra: 0.22, lta: 0.04, special: 0.12,
      fuel: 0.02, driver: 0.02, books: 0.005, telephone: 0.02, office: 0.025, bizPromo: 0.02,
    }),
  },
  b12_25: {
    key: "b12_25",
    label: "Employee 12–25 Lacs",
    range: "₹12,00,000 – ₹25,00,000",
    withPF: pct({
      basic: 0.51, hra: 0.2, lta: 0.0325, special: 0.1,
      books: 0.0094, telephone: 0.0225, office: 0.03, meal: 0.0344,
      pf: 0.0612,
    }),
    noPF: pct({
      basic: 0.51, hra: 0.22, lta: 0.04, special: 0.13,
      books: 0.01, telephone: 0.025, office: 0.03, meal: 0.035,
    }),
  },
  lt12: {
    key: "lt12",
    label: "Employee < 12 Lacs",
    range: "Below ₹12,00,000",
    withPF: pct({ basic: 0.51, hra: 0.22, lta: 0.05, special: 0.1588, pf: 0.0612 }),
    noPF: pct({ basic: 0.51, hra: 0.25, lta: 0.07, special: 0.17 }),
  },
};

// Auto-select an employee band from annual CTC. Director is manual only.
export function bandForCTC(annualCTC: number): BandKey {
  if (annualCTC >= 5_000_000) return "gt50";
  if (annualCTC >= 2_500_000) return "b25_50";
  if (annualCTC >= 1_200_000) return "b12_25";
  return "lt12";
}

// Statutory constants.
export const PF_RATE = 0.12; // 12% of Basic (employee + employer each)
export const PF_CAP_ANNUAL = 21_600; // ₹1,800/month statutory cap
export const PT_MONTHLY = 200; // Professional Tax
