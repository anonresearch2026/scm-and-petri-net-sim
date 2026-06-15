import { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import { mean as calcMean, confidenceInterval } from "@/lib/math";

interface HiddenRiskDistributionChartProps {
  hiddenRiskPercents: number[];
}

export function HiddenRiskDistributionChart({ hiddenRiskPercents }: HiddenRiskDistributionChartProps) {
  const { data, riskMean, ci95 } = useMemo(() => {
    const bins = 30;
    const min = Math.min(...hiddenRiskPercents);
    const max = Math.max(...hiddenRiskPercents);
    const binWidth = (max - min) / bins || 1;

    const histogram = new Array(bins).fill(0);
    hiddenRiskPercents.forEach(val => {
      const idx = Math.min(Math.floor((val - min) / binWidth), bins - 1);
      if (idx >= 0) histogram[idx]++;
    });

    const data = histogram.map((count, i) => ({
      binCenter: min + (i + 0.5) * binWidth,
      frequency: count,
    }));

    return {
      data,
      riskMean: calcMean(hiddenRiskPercents),
      ci95: confidenceInterval(hiddenRiskPercents, 0.95) as [number, number],
    };
  }, [hiddenRiskPercents]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6" data-testid="chart-hidden-risk">
      <h4 className="text-lg font-semibold text-gray-800 mb-1">Hidden Risk Distribution</h4>
      <p className="text-sm text-gray-500 mb-4">Distribution of hidden risk percentages across iterations</p>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="binCenter"
            tickFormatter={(v: number) => `${v.toFixed(0)}%`}
            tick={{ fontSize: 11, fill: "#6b7280" }}
            label={{ value: "Hidden Risk (%)", position: "insideBottom", offset: -10, fontSize: 12, fill: "#6b7280" }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#6b7280" }}
            label={{ value: "Frequency", angle: -90, position: "insideLeft", offset: -5, fontSize: 12, fill: "#6b7280" }}
          />
          <Tooltip
            formatter={(value: number) => [value, "Frequency"]}
            labelFormatter={(label: number) => `${label.toFixed(1)}%`}
            contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
          />
          <ReferenceArea x1={ci95[0]} x2={ci95[1]} fill="rgba(245, 158, 11, 0.12)" strokeOpacity={0} label={{ value: "95% CI", position: "insideTop", fontSize: 10, fill: "#d97706" }} />
          <Area type="monotone" dataKey="frequency" fill="rgba(245, 158, 11, 0.3)" stroke="#d97706" strokeWidth={2} name="Frequency" />
          <ReferenceLine x={riskMean} stroke="#b45309" strokeDasharray="5 5" strokeWidth={2} label={{ value: `Mean: ${riskMean.toFixed(1)}%`, position: "top", fontSize: 11, fill: "#b45309" }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
