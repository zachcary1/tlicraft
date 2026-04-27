"use client";

import type { CostEstimate } from "@/services/crafting/cost-estimator";

type EstimateResult = {
  estimates: CostEstimate[];
  totalExpectedAttempts: number;
  totalExpectedCost: number;
};

type Props = {
  result: EstimateResult;
  costPerAttempt: number;
};

function fmt(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function fmtProb(p: number | undefined) {
  if (p == null) return "—";
  return `${(p * 100).toFixed(4)}%`;
}

export default function CostEstimatePanel({ result, costPerAttempt }: Props) {
  const { estimates, totalExpectedAttempts, totalExpectedCost } = result;

  return (
    <div className="zinc-card">
      <h2 className="fw-semibold mb-4" style={{ fontSize: "1rem" }}>Cost Estimate</h2>

      <div className="overflow-x-auto">
        <table className="w-100 small">
          <thead>
            <tr className="text-start text-uppercase" style={{ color: "var(--zinc-500)", borderBottom: "1px solid var(--zinc-800)", letterSpacing: "0.05em" }}>
              <th className="pb-2 pe-4">Affix</th>
              <th className="pb-2 pe-4">Tier</th>
              <th className="pb-2 pe-4 text-end">Probability</th>
              <th className="pb-2 pe-4 text-end">Avg Attempts</th>
              <th className="pb-2 text-end">Avg Cost</th>
            </tr>
          </thead>
          <tbody>
            {estimates.map((e) => (
              <tr key={`${e.group}-${e.affixId}-${e.tier}`} style={{ borderBottom: "1px solid rgba(39,39,42,0.5)" }}>
                <td className="py-2 pe-4" style={{ color: "var(--zinc-200)" }}>{e.affixName}</td>
                <td className="py-2 pe-4" style={{ color: "var(--zinc-400)" }}>{e.tier}</td>
                <td className="py-2 pe-4 text-end" style={{ color: "var(--zinc-400)" }}>{fmtProb(e.probability)}</td>
                <td className="py-2 pe-4 text-end" style={{ color: "var(--zinc-300)" }}>{fmt(e.expectedAttempts)}</td>
                <td className="py-2 text-end" style={{ color: "#fbbf24" }}>{fmt(e.expectedCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 pt-4 d-flex flex-column flex-sm-row justify-content-sm-between gap-2 small" style={{ borderTop: "1px solid var(--zinc-800)" }}>
        <div style={{ color: "var(--zinc-400)" }}>
          Cost per attempt: <span style={{ color: "var(--zinc-200)" }}>{fmt(costPerAttempt)}</span>
        </div>
        <div className="d-flex gap-4">
          <div style={{ color: "var(--zinc-400)" }}>
            Total avg attempts: <span style={{ color: "var(--zinc-200)" }}>{fmt(totalExpectedAttempts)}</span>
          </div>
          <div style={{ color: "var(--zinc-400)" }}>
            Total avg cost: <span className="fw-semibold" style={{ color: "#fbbf24" }}>{fmt(totalExpectedCost)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
