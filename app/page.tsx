"use client";

import { useState } from "react";
import { computeModes, grossOf, formatINR, type SalaryInput } from "@/lib/salary";

type Period = "monthly" | "annual";

const FIELDS: { key: keyof SalaryInput; label: string }[] = [
  { key: "basic", label: "Basic" },
  { key: "hra", label: "HRA" },
  { key: "special", label: "Special Allow." },
  { key: "variable", label: "Variable" },
];

export default function Home() {
  const [input, setInput] = useState<SalaryInput>({
    basic: 30000,
    hra: 15000,
    special: 10000,
    variable: 5000,
  });
  const [period, setPeriod] = useState<Period>("monthly");

  const gross = grossOf(input);
  const modes = computeModes(input);
  const bestTakeHome = Math.max(...modes.map((m) => m.takeHome));
  const baseTakeHome = modes.find((m) => m.key === "none")?.takeHome ?? gross;

  const update = (key: keyof SalaryInput, raw: string) => {
    const value = raw === "" ? 0 : Math.max(0, Number(raw));
    if (Number.isNaN(value)) return;
    setInput((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <main className="shell">
      <p className="kicker">Internal · Payroll Tooling</p>
      <h1 className="title">
        Salary <em>Breakup</em>
      </h1>
      <p className="lede">
        Enter the monthly pay components and compare take-home across three
        provident-fund treatments — capped, percentage, and none.
      </p>

      <section className="panel" aria-label="Salary inputs">
        <div className="panel-head">
          <h2>Pay components</h2>
          <span className="hint">monthly amounts · ₹</span>
        </div>

        <div className="fields">
          {FIELDS.map((f) => (
            <div className="field" key={f.key}>
              <label htmlFor={f.key}>{f.label}</label>
              <div className="input-wrap">
                <span className="rupee">₹</span>
                <input
                  id={f.key}
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={input[f.key] === 0 ? "" : input[f.key]}
                  placeholder="0"
                  onChange={(e) => update(f.key, e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="panel-foot">
          <div className="gross">
            <span className="lbl">Gross</span>
            <span className="val mono">{formatINR(gross, period)}</span>
            <span className="lbl">/ {period === "annual" ? "yr" : "mo"}</span>
          </div>
          <div className="toggle" role="group" aria-label="Display period">
            <button
              className={period === "monthly" ? "on" : ""}
              onClick={() => setPeriod("monthly")}
            >
              Monthly
            </button>
            <button
              className={period === "annual" ? "on" : ""}
              onClick={() => setPeriod("annual")}
            >
              Annual
            </button>
          </div>
        </div>
      </section>

      <section className="grid" aria-label="Breakup comparison">
        {modes.map((m, i) => {
          const delta = m.takeHome - baseTakeHome;
          return (
            <article
              key={m.key}
              className={`card${m.takeHome === bestTakeHome ? " best" : ""}`}
            >
              <span className="card-num">0{i + 1}</span>
              <h3>{m.label}</h3>
              <p className="blurb">{m.blurb}</p>

              <div className="hero">
                <div className="lbl">Net take-home</div>
                <div className="amt">{formatINR(m.takeHome, period)}</div>
                <div className={`delta${delta === 0 ? " zero" : ""}`}>
                  {delta === 0
                    ? "— baseline (no PF)"
                    : `${delta > 0 ? "+" : "−"}${formatINR(
                        Math.abs(delta),
                        period,
                      )} vs no-PF`}
                </div>
              </div>

              <div className="rows">
                <div className="row">
                  <span className="k">Gross</span>
                  <span className="v">{formatINR(gross, period)}</span>
                </div>
                <div className="row deduct">
                  <span className="k">Employee PF</span>
                  <span className="v">
                    {m.employeePf === 0 ? "—" : `− ${formatINR(m.employeePf, period)}`}
                  </span>
                </div>
                <div className="row">
                  <span className="k">Employer PF</span>
                  <span className="v">
                    {m.employerPf === 0 ? "—" : formatINR(m.employerPf, period)}
                  </span>
                </div>
                <div className="row total">
                  <span className="k">Total CTC</span>
                  <span className="v">{formatINR(m.ctc, period)}</span>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <p className="note">
        <span className="mark">※</span>
        <span>
          Net take-home is gross minus the employee PF contribution, shown
          before professional tax and income tax (TDS). PF is calculated at 12%
          for both employee and employer; the capped figure uses the statutory
          ceiling of ₹1,800/month. Figures are indicative for internal planning.
        </span>
      </p>
    </main>
  );
}
