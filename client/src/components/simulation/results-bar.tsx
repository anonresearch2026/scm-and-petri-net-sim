import type { SimulationResults } from "@shared/schema";

interface ResultsBarProps {
  results: SimulationResults;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
}

export function ResultsBar({ results }: ResultsBarProps) {
  const hiddenRisk = results.standardCost > 0 
    ? ((results.integratedCost - results.standardCost) / results.standardCost * 100)
    : 0;

  return (
    <div className="bg-white border border-gray-200 p-5 rounded-lg mb-6 shadow-lg sticky top-2 z-50">
      <div className="flex items-center justify-center mb-3">
        <span className="text-xs uppercase tracking-widest text-gray-500">Live Simulation Metrics</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-5">
        <div className="text-center px-3 border-r border-gray-200 last:border-r-0">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Simulation Day</div>
          <div className="text-2xl font-bold text-gray-900" data-testid="result-day">{results.day}</div>
        </div>

        <div className="text-center px-3 border-r border-gray-200 last:border-r-0">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">FTA Probability</div>
          <div className="text-2xl font-bold text-gray-900" data-testid="result-fta">
            {(results.ftaProbability * 100).toFixed(1)}%
          </div>
        </div>

        <div className="text-center px-3 border-r border-gray-200 last:border-r-0">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Cascades</div>
          <div className="text-2xl font-bold text-gray-900" data-testid="result-cascades">{results.cascadeCount}</div>
        </div>

        <div className="text-center px-3 border-r border-gray-200 last:border-r-0">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Traditional</div>
          <div className="text-2xl font-bold text-blue-600" data-testid="result-standard">
            {formatCurrency(results.standardCost)}
          </div>
        </div>

        <div className="text-center px-3 border-r border-gray-200 last:border-r-0">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Integrated</div>
          <div className="text-2xl font-bold text-red-600" data-testid="result-integrated">
            {formatCurrency(results.integratedCost)}
          </div>
        </div>

        <div className="text-center px-3 border-r border-gray-200 last:border-r-0">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Mitigated</div>
          <div className="text-2xl font-bold text-emerald-600" data-testid="result-mitigated">
            {formatCurrency(results.mitigatedCost)}
          </div>
        </div>

        <div className="text-center px-3">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Hidden Risk</div>
          <div className="text-2xl font-bold text-amber-600" data-testid="result-hidden">
            {hiddenRisk.toFixed(0)}%
          </div>
        </div>
      </div>
    </div>
  );
}
