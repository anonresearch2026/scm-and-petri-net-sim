import { formatCurrency } from "@/lib/math";
import type { MonteCarloResults } from "@/lib/monte-carlo";

interface MonteCarloResultsProps {
  results: MonteCarloResults;
}

export function MonteCarloResultsPanel({ results }: MonteCarloResultsProps) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <ModelCard
          title="Traditional Model"
          borderColor="border-l-blue-600"
          valueColor="text-blue-700"
          mean={results.standard.mean}
          std={results.standard.std}
          testId="text-mc-standard-mean"
        />
        <ModelCard
          title="Integrated Model"
          borderColor="border-l-red-600"
          valueColor="text-red-700"
          mean={results.integrated.mean}
          std={results.integrated.std}
          testId="text-mc-integrated-mean"
        />
        <ModelCard
          title="Mitigated Model"
          borderColor="border-l-emerald-600"
          valueColor="text-emerald-700"
          mean={results.mitigated.mean}
          std={results.mitigated.std}
          testId="text-mc-mitigated-mean"
        />
      </div>

      <div className="bg-white border-l-4 border-l-amber-500 border border-gray-200 p-6 rounded-lg shadow-sm mb-6">
        <h4 className="text-lg font-semibold text-gray-800 mb-4">Hidden Risk Analysis</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-sm text-gray-600 mb-1">Mean Hidden Risk</div>
            <div className="text-4xl font-bold text-amber-700" data-testid="text-hidden-risk-mean">
              {results.hiddenRisk.mean.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500 mt-2">
              Additional cost from cyber-physical cascades
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">95% Confidence Interval</div>
            <div className="text-2xl font-bold text-amber-700" data-testid="text-confidence-interval">
              [{results.hiddenRisk.ci95[0].toFixed(1)}%, {results.hiddenRisk.ci95[1].toFixed(1)}%]
            </div>
            <div className="text-sm text-gray-500 mt-2">
              Range containing 95% of simulation outcomes
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm mb-6">
        <h4 className="text-lg font-semibold text-gray-800 mb-4">Statistical Summary</h4>
        <table className="w-full text-sm" data-testid="table-mc-stats">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left py-2 px-3 font-semibold text-gray-700">Metric</th>
              <th className="text-right py-2 px-3 font-semibold text-blue-600">Traditional</th>
              <th className="text-right py-2 px-3 font-semibold text-red-600">Integrated</th>
              <th className="text-right py-2 px-3 font-semibold text-emerald-600">Mitigated</th>
            </tr>
          </thead>
          <tbody>
            <StatsRow label="Mean Cost" values={[results.standard.mean, results.integrated.mean, results.mitigated.mean]} />
            <StatsRow label="Standard Deviation" values={[results.standard.std, results.integrated.std, results.mitigated.std]} />
            <StatsRow label="Min Cost" values={[results.standard.min, results.integrated.min, results.mitigated.min]} />
            <StatsRow label="Max Cost" values={[results.standard.max, results.integrated.max, results.mitigated.max]} border={false} />
          </tbody>
        </table>
      </div>
    </>
  );
}

function ModelCard({
  title, borderColor, valueColor, mean, std, testId,
}: {
  title: string;
  borderColor: string;
  valueColor: string;
  mean: number;
  std: number;
  testId: string;
}) {
  return (
    <div className={`bg-white border-l-4 ${borderColor} border border-gray-200 p-6 rounded-lg shadow-sm`}>
      <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{title}</h4>
      <div className={`text-3xl font-bold ${valueColor} mb-2`} data-testid={testId}>
        {formatCurrency(mean)}
      </div>
      <div className="text-sm text-gray-500">
        +/- {formatCurrency(std)} std dev
      </div>
    </div>
  );
}

function StatsRow({ label, values, border = true }: { label: string; values: [number, number, number]; border?: boolean }) {
  return (
    <tr className={border ? "border-b border-gray-100" : ""}>
      <td className="py-2 px-3 text-gray-700">{label}</td>
      {values.map((v, i) => (
        <td key={i} className="py-2 px-3 text-right font-mono text-gray-800">{formatCurrency(v)}</td>
      ))}
    </tr>
  );
}
