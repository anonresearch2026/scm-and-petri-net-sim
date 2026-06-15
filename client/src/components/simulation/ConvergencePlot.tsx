import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface ConvergencePlotProps {
  standardCosts: number[];
  integratedCosts: number[];
  mitigatedCosts: number[];
}

function computeRunningMeans(costs: number[], sampleEvery: number = 10): { iteration: number; mean: number }[] {
  const points: { iteration: number; mean: number }[] = [];
  let sum = 0;
  for (let i = 0; i < costs.length; i++) {
    sum += costs[i];
    if ((i + 1) % sampleEvery === 0 || i === costs.length - 1) {
      points.push({ iteration: i + 1, mean: sum / (i + 1) });
    }
  }
  return points;
}

function formatCostAxis(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export function ConvergencePlot({ standardCosts, integratedCosts, mitigatedCosts }: ConvergencePlotProps) {
  const data = useMemo(() => {
    const sampleEvery = Math.max(1, Math.floor(standardCosts.length / 100));
    const stdMeans = computeRunningMeans(standardCosts, sampleEvery);
    const intMeans = computeRunningMeans(integratedCosts, sampleEvery);
    const mitMeans = computeRunningMeans(mitigatedCosts, sampleEvery);

    return stdMeans.map((pt, i) => ({
      iteration: pt.iteration,
      traditional: pt.mean,
      integrated: intMeans[i]?.mean ?? 0,
      mitigated: mitMeans[i]?.mean ?? 0,
    }));
  }, [standardCosts, integratedCosts, mitigatedCosts]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6" data-testid="chart-convergence">
      <h4 className="text-lg font-semibold text-gray-800 mb-1">Simulation Convergence</h4>
      <p className="text-sm text-gray-500 mb-4">Running mean stabilization across iterations</p>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="iteration"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            label={{ value: "Iteration", position: "insideBottom", offset: -10, fontSize: 12, fill: "#6b7280" }}
          />
          <YAxis
            tickFormatter={formatCostAxis}
            tick={{ fontSize: 11, fill: "#6b7280" }}
            label={{ value: "Running Mean Cost", angle: -90, position: "insideLeft", offset: -5, fontSize: 12, fill: "#6b7280" }}
          />
          <Tooltip
            formatter={(value: number, name: string) => [formatCostAxis(value), name.charAt(0).toUpperCase() + name.slice(1)]}
            contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          <Line type="monotone" dataKey="traditional" stroke="#2563eb" strokeWidth={2} dot={false} name="Traditional" />
          <Line type="monotone" dataKey="integrated" stroke="#dc2626" strokeWidth={2} dot={false} name="Integrated" />
          <Line type="monotone" dataKey="mitigated" stroke="#16a34a" strokeWidth={2} dot={false} name="Mitigated" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
