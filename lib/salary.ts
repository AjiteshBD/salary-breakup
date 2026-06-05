// Salary breakup engine. Given an annual CTC, a variable portion, and a band,
// it produces three scenarios — With PF, Capped PF, Without PF — each with full
// per-component amounts and the summary lines used on the payslip.

import {
  BANDS, COMPONENTS, type BandKey, type ComponentKey, type Pct,
  PF_CAP_ANNUAL, PT_MONTHLY,
} from "./policy";

export type ScenarioKey = "withPF" | "capped" | "noPF";

export interface ScenarioMeta {
  key: ScenarioKey;
  label: string;
  blurb: string;
}

export const SCENARIOS: ScenarioMeta[] = [
  { key: "capped", label: "Capped PF", blurb: "PF capped at ₹1,800/mo" },
  { key: "withPF", label: "With PF", blurb: "PF at 12% of Basic" },
  { key: "noPF", label: "Without PF", blurb: "No provident fund" },
];

export interface Scenario {
  key: ScenarioKey;
  label: string;
  blurb: string;
  // Annual amount per component (₹).
  amounts: Record<ComponentKey, number>;
  grossAnnual: number; // groups A + B
  employerPfAnnual: number; // group C
  piAnnual: number; // group D
  employeePfAnnual: number;
  ptAnnual: number;
  ctcAnnual: number; // gross + employer PF (the monthly-CTC basis, ×12)
  netBeforeTdsAnnual: number; // gross − PT  (matches the source sheet)
}

export interface Breakup {
  bandKey: BandKey;
  bandLabel: string;
  fixed: number;
  variable: number;
  annualCtc: number;
  scenarios: Scenario[];
}

function amountsFrom(p: Pct, fixed: number): Record<ComponentKey, number> {
  const out = {} as Record<ComponentKey, number>;
  for (const c of COMPONENTS) out[c.key] = round2(p[c.key] * fixed);
  return out;
}

function buildScenario(
  meta: ScenarioMeta,
  amounts: Record<ComponentKey, number>,
): Scenario {
  let grossAnnual = 0;
  for (const c of COMPONENTS) {
    if (c.group === "A" || c.group === "B") grossAnnual += amounts[c.key];
  }
  const employerPfAnnual = amounts.pf + amounts.esic;
  const piAnnual = amounts.pi;
  const employeePfAnnual = amounts.pf; // mirrors employer contribution
  const ptAnnual = PT_MONTHLY * 12;

  return {
    key: meta.key,
    label: meta.label,
    blurb: meta.blurb,
    amounts,
    grossAnnual: round2(grossAnnual),
    employerPfAnnual: round2(employerPfAnnual),
    piAnnual: round2(piAnnual),
    employeePfAnnual: round2(employeePfAnnual),
    ptAnnual,
    ctcAnnual: round2(grossAnnual + employerPfAnnual),
    netBeforeTdsAnnual: round2(grossAnnual - PT_MONTHLY * 12),
  };
}

export function computeBreakup(
  annualCtc: number,
  variable: number,
  bandKey: BandKey,
): Breakup {
  const band = BANDS[bandKey];
  const fixed = Math.max(0, annualCtc - variable);

  // With PF — policy "If PF" column.
  const withAmts = amountsFrom(band.withPF, fixed);

  // Without PF — policy "If No PF" column.
  const noAmts = amountsFrom(band.noPF, fixed);

  // Capped PF — start from With PF, cap PF at ₹21,600/yr, move the freed
  // money into LTA so the column still ties to the fixed total.
  const cappedAmts = { ...withAmts };
  const cappedPf = Math.min(withAmts.pf, PF_CAP_ANNUAL);
  const freed = round2(withAmts.pf - cappedPf);
  cappedAmts.pf = cappedPf;
  cappedAmts.lta = round2(withAmts.lta + freed);

  const byKey: Record<ScenarioKey, Record<ComponentKey, number>> = {
    withPF: withAmts,
    capped: cappedAmts,
    noPF: noAmts,
  };

  return {
    bandKey,
    bandLabel: band.label,
    fixed,
    variable,
    annualCtc,
    scenarios: SCENARIOS.map((m) => buildScenario(m, byKey[m.key])),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const inrWhole = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inrPaise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export type Period = "monthly" | "annual";

// Format an annual figure, scaling to monthly when requested.
export function formatINR(annual: number, period: Period): string {
  const v = period === "monthly" ? annual / 12 : annual;
  return Number.isInteger(v) ? inrWhole.format(v) : inrPaise.format(v);
}

export function formatAnnual(v: number): string {
  return Number.isInteger(v) ? inrWhole.format(v) : inrPaise.format(v);
}
