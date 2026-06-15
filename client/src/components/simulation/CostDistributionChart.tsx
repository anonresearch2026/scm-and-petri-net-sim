import { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { mean as calcMean } from "@/lib/math";

interface CostDistributionChartProps {
  standardCosts: number[];
  integratedCosts: number[];
  mitigatedCosts: number[];
  iterations: number;
}

function buildHistogramData(costs: number[], bins: number, globalMin: number, binWidth: number): number[] {
  const histogram = new Array(bins).fill(0);
  costs.forEach(cost => {
    const binIndex = Math.min(Math.floor((cost - globalMin) / binWidth), bins - 1);
    if (binIndex >= 0) histogram[binIndex]++;
  });
  return histogram;
}

function formatCostAxis(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export function CostDistributionChart({ standardCosts, integratedCosts, mitigatedCosts, iterations }: CostDistributionChartProps) {
  const { data, stdMean, intMean, mitMean } = useMemo(() => {
    const allCosts = [...standardCosts, ...integratedCosts, ...mitigatedCosts];
    const globalMin = Math.min(...allCosts);
    const globalMax = Math.max(...allCosts);
    const bins = 35;
    const binWidth = (globalMax - globalMin) / bins || 1;

    const stdHist = buildHistogramData(standardCosts, bins, globalMin, binWidth);
    const intHist = buildHistogramData(integratedCosts, bins, globalMin, binWidth);
    const mitHist = buildHistogramData(mitigatedCosts, bins, globalMin, binWidth);

    const data = stdHist.map((_, i) => ({
      binCenter: globalMin + (i + 0.5) * binWidth,
      traditional: stdHist[i],
      integrated: intHist[i],
      mitigated: mitHist[i],
    }));

    return {
      data,
      stdMean: calcMean(standardCosts),
      intMean: calcMean(integratedCosts),
      mitMean: calcMean(mitigatedCosts),
    };
  }, [standardCosts, integratedCosts, mitigatedCosts]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6" data-testid="chart-cost-distribution">
      <h4 className="text-lg font-semibold text-gray-800 mb-1">Monte Carlo Cost Distribution ({iterations.toLocaleString()} iterations)</h4>
      <p className="text-sm text-gray-500 mb-4">Frequency distribution of total disruption costs across all simulation runs</p>
      <ResponsiveContainer width="100%" height={420}>
        <ComposedChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="binCenter"
            tickFormatter={formatCostAxis}
            tick={{ fontSize: 11, fill: "#6b7280" }}
            label={{ value: "Total Disruption Cost", position: "insideBottom", offset: -10, fontSize: 12, fill: "#6b7280" }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#6b7280" }}
            label={{ value: "Frequency", angle: -90, position: "insideLeft", offset: -5, fontSize: 12, fill: "#6b7280" }}
          />
          <Tooltip
            formatter={(value: number, name: string) => [value, name.charAt(0).toUpperCase() + name.slice(1)]}
            labelFormatter={(label: number) => formatCostAxis(label)}
            contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
          <Area type="monotone" dataKey="traditional" fill="rgba(37, 99, 235, 0.25)" stroke="#2563eb" strokeWidth={2} name="Traditional" />
          <Area type="monotone" dataKey="integrated" fill="rgba(220, 38, 38, 0.25)" stroke="#dc2626" strokeWidth={2} name="Integrated" />
          <Area type="monotone" dataKey="mitigated" fill="rgba(22, 163, 74, 0.25)" stroke="#16a34a" strokeWidth={2} name="Mitigated" />
          <ReferenceLine x={stdMean} stroke="#2563eb" strokeDasharray="5 5" strokeWidth={1.5} label={{ value: "Trad. mean", position: "top", fontSize: 10, fill: "#2563eb" }} />
          <ReferenceLine x={intMean} stroke="#dc2626" strokeDasharray="5 5" strokeWidth={1.5} label={{ value: "Int. mean", position: "top", fontSize: 10, fill: "#dc2626" }} />
          <ReferenceLine x={mitMean} stroke="#16a34a" strokeDasharray="5 5" strokeWidth={1.5} label={{ value: "Mit. mean", position: "top", fontSize: 10, fill: "#16a34a" }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
