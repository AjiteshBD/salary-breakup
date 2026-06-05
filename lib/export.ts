// CSV export for a salary breakup. Numbers are written raw (no ₹ / commas) so
// Excel/Sheets parse them as numbers. Opens directly in Excel.

import type { Breakup, Scenario, ScenarioKey } from "./salary";
import { COMPONENTS } from "./policy";

export interface ExportMeta {
  pfRatePct: number;
  cappedMonthly: number;
  generatedOn: string; // human-readable date stamp
}

const SCEN: ScenarioKey[] = ["capped", "withPF", "noPF"];

function esc(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function row(cells: (string | number)[]): string {
  return cells.map(esc).join(",");
}

const monthly = (annual: number) => Math.round((annual / 12) * 100) / 100;

export function buildCsv(b: Breakup, meta: ExportMeta): string {
  const get = (k: ScenarioKey) => b.scenarios.find((s) => s.key === k)!;
  const lines: string[] = [];

  lines.push(row(["Salary Breakup - FY 2026-27"]));
  lines.push(row(["Band", b.bandLabel]));
  lines.push(row(["Total Annual CTC", b.annualCtc]));
  lines.push(row(["Variable Pay (annual)", b.variable]));
  lines.push(row(["Fixed (annual)", b.fixed]));
  lines.push(row(["PF Rate (%)", meta.pfRatePct]));
  lines.push(row(["Capped PF (per month)", meta.cappedMonthly]));
  lines.push(row(["Generated", meta.generatedOn]));
  lines.push("");

  lines.push(
    row([
      "Component", "Group",
      "Capped PF (Monthly)", "Capped PF (Annual)",
      "With PF (Monthly)", "With PF (Annual)",
      "Without PF (Monthly)", "Without PF (Annual)",
    ]),
  );

  const valueRow = (label: string, group: string, vals: number[]) =>
    row([
      label, group,
      monthly(vals[0]), vals[0],
      monthly(vals[1]), vals[1],
      monthly(vals[2]), vals[2],
    ]);

  for (const c of COMPONENTS) {
    const vals = SCEN.map((k) => get(k).amounts[c.key]);
    if (vals.every((v) => v === 0)) continue;
    lines.push(valueRow(c.label, c.group, vals));
  }

  lines.push("");
  const summary = (label: string, pick: (s: Scenario) => number) =>
    lines.push(valueRow(label, "", SCEN.map((k) => pick(get(k)))));

  summary("Total Gross", (s) => s.grossAnnual);
  summary("Employer PF", (s) => s.employerPfAnnual);
  summary("CTC", (s) => s.ctcAnnual);
  summary("Employee PF", (s) => s.employeePfAnnual);
  summary("Professional Tax", (s) => s.ptAnnual);
  summary("Net before TDS", (s) => s.netBeforeTdsAnnual);

  return lines.join("\r\n");
}
