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
    <div className="rounded border border-zinc-700 bg-zinc-900 p-4">
      <h2 className="text-base font-semibold mb-4">Cost Estimate</h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-500 text-xs uppercase tracking-wide border-b border-zinc-800">
              <th className="pb-2 pr-4">Affix</th>
              <th className="pb-2 pr-4">Tier</th>
              <th className="pb-2 pr-4 text-right">Probability</th>
              <th className="pb-2 pr-4 text-right">Avg Attempts</th>
              <th className="pb-2 text-right">Avg Cost</th>
            </tr>
          </thead>
          <tbody>
            {estimates.map((e) => (
              <tr key={`${e.group}-${e.affixId}-${e.tier}`} className="border-b border-zinc-800/50">
                <td className="py-2 pr-4 text-zinc-200">{e.affixName}</td>
                <td className="py-2 pr-4 text-zinc-400">{e.tier}</td>
                <td className="py-2 pr-4 text-right text-zinc-400">{fmtProb(e.probability)}</td>
                <td className="py-2 pr-4 text-right text-zinc-300">{fmt(e.expectedAttempts)}</td>
                <td className="py-2 text-right text-amber-400">{fmt(e.expectedCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 pt-4 border-t border-zinc-800 flex flex-col sm:flex-row sm:justify-between gap-2 text-sm">
        <div className="text-zinc-400">
          Cost per attempt: <span className="text-zinc-200">{fmt(costPerAttempt)}</span>
        </div>
        <div className="flex gap-6">
          <div className="text-zinc-400">
            Total avg attempts:{" "}
            <span className="text-zinc-200">{fmt(totalExpectedAttempts)}</span>
          </div>
          <div className="text-zinc-400">
            Total avg cost:{" "}
            <span className="font-semibold text-amber-400">{fmt(totalExpectedCost)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
