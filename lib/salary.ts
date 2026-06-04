// Salary breakup calculations.
// All inputs are MONTHLY rupee amounts. Period scaling (monthly/annual)
// is applied at display time, not here.

export const PF_RATE = 0.12; // 12% employee + 12% employer
export const PF_CAPPED_AMOUNT = 1800; // statutory cap: 12% of ₹15,000

export interface SalaryInput {
  basic: number;
  hra: number;
  special: number;
  variable: number;
}

export interface ModeResult {
  key: ModeKey;
  label: string;
  blurb: string;
  employeePf: number;
  employerPf: number;
  takeHome: number; // gross - employee PF (pre-tax)
  ctc: number; // gross + employer PF
}

export type ModeKey = "capped" | "percent" | "none";

export function grossOf(input: SalaryInput): number {
  return input.basic + input.hra + input.special + input.variable;
}

export function computeModes(input: SalaryInput): ModeResult[] {
  const gross = grossOf(input);
  const pctPf = round(input.basic * PF_RATE);

  return [
    buildMode("capped", "Capped PF", "Flat ₹1,800 — statutory cap", gross, PF_CAPPED_AMOUNT, PF_CAPPED_AMOUNT),
    buildMode("percent", "PF on Basic", "12% of Basic salary", gross, pctPf, pctPf),
    buildMode("none", "Without PF", "No provident fund", gross, 0, 0),
  ];
}

function buildMode(
  key: ModeKey,
  label: string,
  blurb: string,
  gross: number,
  employeePf: number,
  employerPf: number,
): ModeResult {
  return {
    key,
    label,
    blurb,
    employeePf,
    employerPf,
    takeHome: gross - employeePf,
    ctc: gross + employerPf,
  };
}

function round(n: number): number {
  return Math.round(n);
}

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

// Format a monthly figure, scaling to annual when requested.
export function formatINR(monthly: number, period: "monthly" | "annual"): string {
  const value = period === "annual" ? monthly * 12 : monthly;
  return inr.format(value);
}
