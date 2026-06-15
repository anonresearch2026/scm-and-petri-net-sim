import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine, Area, AreaChart
} from "recharts";
import type { Parameters, MitigationType, MitigationConfigs, ScenarioConfig } from "@shared/schema";
import { formatCurrency } from "@/lib/math";
import {
  runSensitivityAnalysis,
  exportSensitivityCSV,
  DEFAULT_SENSITIVITY_RANGES,
  type SensitivitySummary,
} from "@/lib/sensitivity-analysis";

interface SensitivityTabProps {
  parameters: Parameters;
  activeMitigations: Set<MitigationType>;
  mitigationConfigs: MitigationConfigs;
  scenario: ScenarioConfig | null;
}

export function SensitivityTab({
  parameters,
  activeMitigations,
  mitigationConfigs,
  scenario,
}: SensitivityTabProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<SensitivitySummary | null>(null);
  const [iterationsPerPoint, setIterationsPerPoint] = useState(500);
  const [days, setDays] = useState(30);
  const [selectedParam, setSelectedParam] = useState(0);

  const handleRun = useCallback(() => {
    setIsRunning(true);
    setTimeout(() => {
      const summary = runSensitivityAnalysis(
        parameters,
        activeMitigations,
        mitigationConfigs,
        scenario,
        DEFAULT_SENSITIVITY_RANGES,
        iterationsPerPoint,
        days
      );
      setResults(summary);
      setIsRunning(false);
    }, 50);
  }, [parameters, activeMitigations, mitigationConfigs, scenario, iterationsPerPoint, days]);

  const handleExportCSV = useCallback(() => {
    if (!results) return;
    const csv = exportSensitivityCSV(results);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sensitivity_analysis_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [results]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-900 rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-1">Sensitivity Analysis</h3>
        <p className="text-sm text-gray-500 mb-4">
          Sweeps each parameter across its range while holding others constant.
        </p>
        <div className="grid grid-cols-2 gap-6 mb-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              MC iterations per data point: {iterationsPerPoint.toLocaleString()}
            </label>
            <Slider
              value={[iterationsPerPoint]}
              onValueChange={([v]) => setIterationsPerPoint(v)}
              min={200}
              max={3000}
              step={100}
              className="mt-2"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Simulation period: {days} days
            </label>
            <Slider
              value={[days]}
              onValueChange={([v]) => setDays(v)}
              min={7}
              max={365}
              step={7}
              className="mt-2"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleRun} disabled={isRunning} data-testid="button-run-sensitivity">
            {isRunning ? "Running..." : "Run Sensitivity Analysis"}
          </Button>
          {results && (
            <Button variant="outline" onClick={handleExportCSV} data-testid="button-export-sensitivity">
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {results && (
        <>
          <div className="bg-white dark:bg-gray-900 rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-2">Summary</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">{results.overallFinding}</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded p-4">
                <div className="text-sm text-gray-500">Min Underestimation</div>
                <div className="text-2xl font-bold mt-1">
                  {results.minUnderestimation.toFixed(1)}%
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded p-4">
                <div className="text-sm text-gray-500">Max Underestimation</div>
                <div className="text-2xl font-bold mt-1">
                  {results.maxUnderestimation.toFixed(1)}%
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded p-4">
                <div className="text-sm text-gray-500">Robustness</div>
                <div className="text-2xl font-bold mt-1">
                  {results.robustnessScore.toFixed(0)}%
                </div>
                <div className="text-xs text-gray-500">
                  of tested configs &gt;20%
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg border p-6">
            <div className="flex gap-2 mb-6 flex-wrap">
              {results.results.map((r, i) => (
                <Button
                  key={r.parameter}
                  variant={selectedParam === i ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedParam(i)}
                >
                  {r.label}
                </Button>
              ))}
            </div>

            {(() => {
              const result = results.results[selectedParam];
              if (!result) return null;

              const chartData = result.dataPoints.map(dp => ({
                value: dp.parameterValue,
                label: dp.parameterValue.toFixed(3),
                "Traditional": dp.standardMean,
                "Integrated": dp.integratedMean,
                "Mitigated": dp.mitigatedMean,
                "Underestimation %": dp.underestimationPercent,
                "VaR95 Traditional": dp.var95Standard,
                "VaR95 Integrated": dp.var95Integrated,
              }));

              return (
                <div className="space-y-8">
                  <div>
                    <h4 className="text-sm font-semibold mb-3">
                      Mean Cost by Model ({result.label})
                    </h4>
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="label"
                          label={{ value: result.unit, position: "insideBottom", offset: -5 }}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis tickFormatter={(v: number) => formatCurrency(v)} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        <Legend />
                        <ReferenceLine
                          x={result.baselineValue.toFixed(3)}
                          stroke="#666"
                          strokeDasharray="5 5"
                          label={{ value: "Baseline", position: "top", fontSize: 10 }}
                        />
                        <Line type="monotone" dataKey="Traditional" stroke="#6b7280" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="Integrated" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="Mitigated" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-3">
                      Cost Underestimation % ({result.label})
                    </h4>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="label"
                          label={{ value: result.unit, position: "insideBottom", offset: -5 }}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis tickFormatter={(v: number) => `${v.toFixed(0)}%`} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                        <ReferenceLine
                          x={result.baselineValue.toFixed(3)}
                          stroke="#666"
                          strokeDasharray="5 5"
                        />
                        <Area type="monotone" dataKey="Underestimation %" stroke="#dc2626" fill="#fecaca" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-3">
                      Value at Risk, 95th Percentile ({result.label})
                    </h4>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="label"
                          label={{ value: result.unit, position: "insideBottom", offset: -5 }}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis tickFormatter={(v: number) => formatCurrency(v)} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        <Legend />
                        <Line type="monotone" dataKey="VaR95 Traditional" stroke="#6b7280" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="VaR95 Integrated" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 rounded p-4">
                    <h4 className="text-sm font-semibold mb-1">Finding</h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{result.finding}</p>
                  </div>
                </div>
              );
            })()}
          </div>
        </>
      )}
    </div>
  );
}
