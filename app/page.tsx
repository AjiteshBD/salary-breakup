"use client";

import { useMemo, useState } from "react";
import {
  computeBreakup, formatINR, formatAnnual, type Period, type ScenarioKey,
} from "@/lib/salary";
import {
  BANDS, COMPONENTS, GROUP_LABELS, bandForCTC,
  type BandKey, type ComponentKey, type Group,
} from "@/lib/policy";

type BandChoice = "auto" | BandKey;

const BAND_CHIPS: { value: BandChoice; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "lt12", label: "<12L" },
  { value: "b12_25", label: "12–25L" },
  { value: "b25_50", label: "25–50L" },
  { value: "gt50", label: ">50L" },
  { value: "director", label: "Director" },
];

const SCEN_ORDER: ScenarioKey[] = ["capped", "withPF", "noPF"];

export default function Home() {
  const [ctc, setCtc] = useState(3_000_000);
  const [variable, setVariable] = useState(300_000);
  const [pfRatePct, setPfRatePct] = useState(12);
  const [cappedMonthly, setCappedMonthly] = useState(1800);
  const [bandChoice, setBandChoice] = useState<BandChoice>("auto");
  const [period, setPeriod] = useState<Period>("monthly");

  const resolvedBand: BandKey =
    bandChoice === "auto" ? bandForCTC(ctc) : bandChoice;

  const breakup = useMemo(
    () =>
      computeBreakup(ctc, Math.min(variable, ctc), resolvedBand, {
        pfRate: pfRatePct / 100,
        cappedMonthly,
      }),
    [ctc, variable, resolvedBand, pfRatePct, cappedMonthly],
  );

  const blurbOf = (k: ScenarioKey) =>
    k === "capped"
      ? `PF capped at ₹${cappedMonthly.toLocaleString("en-IN")}/mo`
      : k === "withPF"
        ? `PF at ${pfRatePct}% of Basic`
        : "No provident fund";

  // Only show component rows that are non-zero in at least one scenario.
  const visibleByGroup = useMemo(() => {
    const map: Record<Group, ComponentKey[]> = { A: [], B: [], C: [], D: [] };
    for (const c of COMPONENTS) {
      const anyNonZero = breakup.scenarios.some((s) => s.amounts[c.key] > 0);
      if (anyNonZero) map[c.group].push(c.key);
    }
    return map;
  }, [breakup]);

  const labelOf = (k: ComponentKey) =>
    COMPONENTS.find((c) => c.key === k)!.label;

  const fmt = (annual: number) => formatINR(annual, period);
  const per = period === "monthly" ? "/mo" : "/yr";

  return (
    <main className="shell">
      <p className="kicker">Internal · Payroll Tooling · FY 2026–27</p>
      <h1 className="title">
        Salary <em>Breakup</em>
      </h1>
      <p className="lede">
        Enter the annual CTC and variable pay. The structure follows the
        FY 26–27 policy for the matched band, compared across three provident-fund
        treatments — capped, on-basic, and none.
      </p>

      {/* Inputs */}
      <section className="panel" aria-label="Inputs">
        <div className="fields">
          <div className="field">
            <label htmlFor="ctc">Total Annual CTC</label>
            <div className="input-wrap">
              <span className="rupee">₹</span>
              <input
                id="ctc" type="number" min={0} inputMode="numeric"
                value={ctc === 0 ? "" : ctc} placeholder="0"
                onChange={(e) => setCtc(clamp(e.target.value))}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="variable">Variable Pay (annual)</label>
            <div className="input-wrap">
              <span className="rupee">₹</span>
              <input
                id="variable" type="number" min={0} inputMode="numeric"
                value={variable === 0 ? "" : variable} placeholder="0"
                onChange={(e) => setVariable(clamp(e.target.value))}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="pfRate">PF Rate (on Basic)</label>
            <div className="input-wrap pct">
              <input
                id="pfRate" type="number" min={0} max={100} step={0.01} inputMode="decimal"
                value={pfRatePct === 0 ? "" : pfRatePct} placeholder="12"
                onChange={(e) => setPfRatePct(clamp(e.target.value))}
              />
              <span className="suffix">%</span>
            </div>
          </div>
          <div className="field">
            <label htmlFor="cappedPf">Capped PF (per month)</label>
            <div className="input-wrap">
              <span className="rupee">₹</span>
              <input
                id="cappedPf" type="number" min={0} inputMode="numeric"
                value={cappedMonthly === 0 ? "" : cappedMonthly} placeholder="1800"
                onChange={(e) => setCappedMonthly(clamp(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="panel-foot">
          <div className="band-row">
            <span className="lbl">Band</span>
            <div className="chips">
              {BAND_CHIPS.map((c) => (
                <button
                  key={c.value}
                  className={`chip${bandChoice === c.value ? " on" : ""}`}
                  onClick={() => setBandChoice(c.value)}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <span className="band-resolved">
              {BANDS[resolvedBand].label}
              {bandChoice === "auto" && <em> (auto)</em>}
            </span>
          </div>

          <div className="toggle" role="group" aria-label="Display period">
            <button className={period === "monthly" ? "on" : ""} onClick={() => setPeriod("monthly")}>
              Monthly
            </button>
            <button className={period === "annual" ? "on" : ""} onClick={() => setPeriod("annual")}>
              Annual
            </button>
          </div>
        </div>

        <div className="meta-strip">
          <span><b>Fixed</b> {formatAnnual(breakup.fixed)}/yr</span>
          <span className="dot">·</span>
          <span><b>Variable</b> {formatAnnual(breakup.variable)}/yr</span>
          <span className="dot">·</span>
          <span><b>Total CTC</b> {formatAnnual(breakup.annualCtc)}/yr</span>
        </div>
      </section>

      {/* Comparison table */}
      <section className="table-wrap" aria-label="Breakup comparison">
        <table className="breakup">
          <thead>
            <tr>
              <th className="head-component">Component <span className="per-tag">{per}</span></th>
              {SCEN_ORDER.map((k) => {
                const s = breakup.scenarios.find((x) => x.key === k)!;
                return (
                  <th key={k} className={k === "capped" ? "head-scn best" : "head-scn"}>
                    <span className="scn-label">{s.label}</span>
                    <span className="scn-blurb">{blurbOf(k)}</span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {(["A", "B"] as Group[]).map((g) =>
              visibleByGroup[g].length === 0 ? null : (
                <GroupBlock
                  key={g} group={g}
                  keys={visibleByGroup[g]} labelOf={labelOf}
                  scenarios={breakup.scenarios} fmt={fmt}
                  subtotalLabel={g === "A" ? "Gross Salary (A)" : "Gross Salary (B)"}
                  subtotal={(s) =>
                    visibleByGroup[g].reduce((sum, k) => sum + s.amounts[k], 0)}
                />
              ),
            )}

            <tr className="line total-strong">
              <td>Total Gross</td>
              {SCEN_ORDER.map((k) => {
                const s = breakup.scenarios.find((x) => x.key === k)!;
                return <td key={k} className="num">{fmt(s.grossAnnual)}</td>;
              })}
            </tr>

            {/* Statutory (employer side) */}
            {visibleByGroup.C.length > 0 && (
              <GroupBlock
                group="C" keys={visibleByGroup.C} labelOf={labelOf}
                scenarios={breakup.scenarios} fmt={fmt}
                subtotalLabel={null} subtotal={() => 0} note="employer contribution"
              />
            )}
            {visibleByGroup.D.length > 0 && (
              <GroupBlock
                group="D" keys={visibleByGroup.D} labelOf={labelOf}
                scenarios={breakup.scenarios} fmt={fmt}
                subtotalLabel={null} subtotal={() => 0}
              />
            )}

            <tr className="line total-strong ctc">
              <td>{period === "monthly" ? "Monthly" : "Annual"} CTC</td>
              {SCEN_ORDER.map((k) => {
                const s = breakup.scenarios.find((x) => x.key === k)!;
                return <td key={k} className="num">{fmt(s.ctcAnnual)}</td>;
              })}
            </tr>

            {/* Deductions */}
            <tr className="section-row"><td colSpan={4}>Deductions</td></tr>
            <tr className="line deduct">
              <td>Employee PF</td>
              {SCEN_ORDER.map((k) => {
                const s = breakup.scenarios.find((x) => x.key === k)!;
                return <td key={k} className="num">{s.employeePfAnnual ? `− ${fmt(s.employeePfAnnual)}` : "—"}</td>;
              })}
            </tr>
            <tr className="line deduct">
              <td>Professional Tax</td>
              {SCEN_ORDER.map((k) => {
                const s = breakup.scenarios.find((x) => x.key === k)!;
                return <td key={k} className="num">− {fmt(s.ptAnnual)}</td>;
              })}
            </tr>

            <tr className="line net">
              <td>Net before TDS</td>
              {SCEN_ORDER.map((k) => {
                const s = breakup.scenarios.find((x) => x.key === k)!;
                return <td key={k} className="num">{fmt(s.netBeforeTdsAnnual)}</td>;
              })}
            </tr>

            <tr className="line foot-row">
              <td>Variable Pay (annual)</td>
              {SCEN_ORDER.map((k) => (
                <td key={k} className="num soft">{formatAnnual(breakup.variable)}</td>
              ))}
            </tr>
            <tr className="line foot-row total-strong">
              <td>Total Annual CTC</td>
              {SCEN_ORDER.map((k) => (
                <td key={k} className="num">{formatAnnual(breakup.annualCtc)}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </section>

      <p className="note">
        <span className="mark">※</span>
        <span>
          Percentages follow the FY 26–27 policy and apply to the fixed pay;
          every column ties to 100% of CTC. <b>Capped PF</b> holds employer + employee
          PF at ₹1,800/month and moves the freed amount into LTA. <b>Net before TDS</b>{" "}
          is Total Gross minus Professional Tax (₹200/mo), matching the source sheet —
          income tax (TDS) is not applied here. ESIC is assumed nil.
        </span>
      </p>
    </main>
  );
}

function GroupBlock({
  group, keys, labelOf, scenarios, fmt, subtotalLabel, subtotal, note,
}: {
  group: Group;
  keys: ComponentKey[];
  labelOf: (k: ComponentKey) => string;
  scenarios: ReturnType<typeof computeBreakup>["scenarios"];
  fmt: (n: number) => string;
  subtotalLabel: string | null;
  subtotal: (s: (typeof scenarios)[number]) => number;
  note?: string;
}) {
  return (
    <>
      <tr className="group-row">
        <td colSpan={4}>
          <span className="group-tag">{group}</span> {GROUP_LABELS[group]}
          {note && <span className="group-note"> · {note}</span>}
        </td>
      </tr>
      {keys.map((k) => (
        <tr className="line" key={k}>
          <td>{labelOf(k)}</td>
          {SCEN_ORDER.map((sk) => {
            const s = scenarios.find((x) => x.key === sk)!;
            const v = s.amounts[k];
            return <td key={sk} className="num">{v > 0 ? fmt(v) : "—"}</td>;
          })}
        </tr>
      ))}
      {subtotalLabel && (
        <tr className="line subtotal">
          <td>{subtotalLabel}</td>
          {SCEN_ORDER.map((sk) => {
            const s = scenarios.find((x) => x.key === sk)!;
            return <td key={sk} className="num">{fmt(subtotal(s))}</td>;
          })}
        </tr>
      )}
    </>
  );
}

function clamp(raw: string): number {
  if (raw === "") return 0;
  const n = Number(raw);
  return Number.isNaN(n) ? 0 : Math.max(0, n);
}
