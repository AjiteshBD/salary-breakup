// Salary breakup engine. Given an annual CTC, a variable portion, and a band,
// it produces three scenarios — With PF, Capped PF, Without PF — each with full
// per-component amounts and the summary lines used on the payslip.

import {
  BANDS, COMPONENTS, type BandKey, type ComponentKey, type Pct,
  PF_RATE, PF_CAP_ANNUAL, PT_MONTHLY,
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

export interface PfOptions {
  pfRate: number; // fraction, e.g. 0.12
  cappedMonthly: number; // ₹/month, e.g. 1800
}

export const DEFAULT_PF: PfOptions = {
  pfRate: PF_RATE,
  cappedMonthly: PF_CAP_ANNUAL / 12,
};

export function computeBreakup(
  annualCtc: number,
  variable: number,
  bandKey: BandKey,
  pf: PfOptions = DEFAULT_PF,
): Breakup {
  const band = BANDS[bandKey];
  const fixed = Math.max(0, annualCtc - variable);

  // Policy allocations.
  const policyWith = amountsFrom(band.withPF, fixed);
  const noAmts = amountsFrom(band.noPF, fixed);

  // PF is computed from the (editable) rate against Basic. Bands that carry no
  // PF in the policy (e.g. Director) stay PF-free. Whatever differs from the
  // policy's PF allocation is absorbed by LTA so the column still ties to 100%.
  const hasPf = policyWith.pf > 0;
  const basicAnnual = policyWith.basic;
  const policyPf = policyWith.pf;
  const cap = round2(pf.cappedMonthly * 12);

  const withPfAmount = hasPf ? round2(pf.pfRate * basicAnnual) : 0;
  const cappedPfAmount = hasPf ? round2(Math.min(pf.pfRate * basicAnnual, cap)) : 0;

  // With PF — policy "If PF" column, PF set from the rate.
  const withAmts = { ...policyWith };
  withAmts.pf = withPfAmount;
  withAmts.lta = round2(policyWith.lta + (policyPf - withPfAmount));

  // Capped PF — same, but PF capped.
  const cappedAmts = { ...policyWith };
  cappedAmts.pf = cappedPfAmount;
  cappedAmts.lta = round2(policyWith.lta + (policyPf - cappedPfAmount));

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
