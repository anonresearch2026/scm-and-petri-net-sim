/**
 * Sensitivity Analysis Engine
 *
 * Sweeps key simulation parameters across plausible ranges and records
 * how the cost underestimation percentage responds. Each sweep holds
 * all other parameters at baseline while varying the target.
 *
 * Uses the same runMonteCarloSimulation engine as the main analysis,
 * with reduced iterations per point for speed during parameter sweeps.
 */

import { runMonteCarloSimulation } from "./monte-carlo";
import type { MonteCarloConfig } from "./monte-carlo";
import type { Parameters, MitigationType, MitigationConfigs, ScenarioConfig } from "@shared/schema";

export interface SensitivityRange {
  parameter: keyof Parameters;
  label: string;
  min: number;
  max: number;
  steps: number;
  unit: string;
}

export interface SensitivityDataPoint {
  parameterValue: number;
  standardMean: number;
  integratedMean: number;
  mitigatedMean: number;
  underestimationPercent: number;
  var95Standard: number;
  var95Integrated: number;
  mitigationEffectPercent: number;
}

export interface SensitivityResult {
  parameter: keyof Parameters;
  label: string;
  unit: string;
  baselineValue: number;
  dataPoints: SensitivityDataPoint[];
  finding: string;
}

export interface SensitivitySummary {
  results: SensitivityResult[];
  overallFinding: string;
  minUnderestimation: number;
  maxUnderestimation: number;
  robustnessScore: number;
}

export const DEFAULT_SENSITIVITY_RANGES: SensitivityRange[] = [
  {
    parameter: "ransomwareProb",
    label: "Ransomware Probability",
    min: 0.005,
    max: 0.04,
    steps: 8,
    unit: "daily prob",
  },
  {
    parameter: "equipmentProb",
    label: "Equipment Failure Probability",
    min: 0.02,
    max: 0.08,
    steps: 7,
    unit: "daily prob",
  },
  {
    parameter: "supplierProb",
    label: "Supplier Disruption Probability",
    min: 0.005,
    max: 0.03,
    steps: 6,
    unit: "daily prob",
  },
  {
    parameter: "costMultiplier",
    label: "Cost Multiplier",
    min: 0.5,
    max: 2.5,
    steps: 9,
    unit: "x",
  },
];

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * (p / 100));
  return sorted[Math.min(idx, sorted.length - 1)];
}

/**
 * Run sensitivity analysis across parameter ranges.
 * For each parameter, holds all others at baseline while sweeping
 * the target across its range. Uses the full MC engine at each point.
 */
export function runSensitivityAnalysis(
  baseParams: Parameters,
  activeMitigations: Set<MitigationType>,
  mitigationConfigs: MitigationConfigs,
  scenario: ScenarioConfig | null,
  ranges: SensitivityRange[] = DEFAULT_SENSITIVITY_RANGES,
  iterationsPerPoint: number = 500,
  days: number = 30
): SensitivitySummary {
  const results: SensitivityResult[] = [];
  let globalMinUnderest = Infinity;
  let globalMaxUnderest = -Infinity;

  for (const range of ranges) {
    const stepSize = (range.max - range.min) / (range.steps - 1);
    const dataPoints: SensitivityDataPoint[] = [];
    const baselineValue = baseParams[range.parameter] as number;

    for (let step = 0; step < range.steps; step++) {
      const value = range.min + step * stepSize;
      const testParams: Parameters = { ...baseParams, [range.parameter]: value };

      const config: MonteCarloConfig = {
        iterations: iterationsPerPoint,
        days,
        parameters: testParams,
        activeMitigations,
        mitigationConfigs,
        scenario,
      };

      const mc = runMonteCarloSimulation(config);

      const stdMean = mc.standard.mean;
      const intMean = mc.integrated.mean;
      const mitMean = mc.mitigated.mean;
      const underest = stdMean > 0 ? ((intMean - stdMean) / stdMean) * 100 : 0;
      const mitEffect = intMean > 0 ? ((intMean - mitMean) / intMean) * 100 : 0;

      dataPoints.push({
        parameterValue: value,
        standardMean: stdMean,
        integratedMean: intMean,
        mitigatedMean: mitMean,
        underestimationPercent: underest,
        var95Standard: percentile(mc.standardCosts, 95),
        var95Integrated: percentile(mc.integratedCosts, 95),
        mitigationEffectPercent: mitEffect,
      });

      if (underest < globalMinUnderest) globalMinUnderest = underest;
      if (underest > globalMaxUnderest) globalMaxUnderest = underest;
    }

    const minU = Math.min(...dataPoints.map(d => d.underestimationPercent));
    const maxU = Math.max(...dataPoints.map(d => d.underestimationPercent));

    let finding = "";
    if (minU > 20) {
      finding = `${minU.toFixed(1)}% to ${maxU.toFixed(1)}% across the full range.`;
    } else if (minU > 0) {
      finding = `${minU.toFixed(1)}% to ${maxU.toFixed(1)}%. Narrows at lower values but stays positive.`;
    } else {
      finding = `Approaches zero at extreme low values. Parameter-dependent.`;
    }

    results.push({
      parameter: range.parameter,
      label: range.label,
      unit: range.unit,
      baselineValue,
      dataPoints,
      finding,
    });
  }

  const allPoints = results.flatMap(r => r.dataPoints);
  const robustCount = allPoints.filter(p => p.underestimationPercent > 20).length;
  const robustnessScore = allPoints.length > 0 ? (robustCount / allPoints.length) * 100 : 0;

  let overallFinding = "";
  if (globalMinUnderest > 30) {
    overallFinding = `Traditional models underestimate costs by ${globalMinUnderest.toFixed(0)}% to ${globalMaxUnderest.toFixed(0)}% across all tested configurations.`;
  } else if (globalMinUnderest > 10) {
    overallFinding = `Underestimation ranges from ${globalMinUnderest.toFixed(0)}% to ${globalMaxUnderest.toFixed(0)}%. Holds across most plausible scenarios.`;
  } else {
    overallFinding = `Underestimation ranges from ${globalMinUnderest.toFixed(0)}% to ${globalMaxUnderest.toFixed(0)}%. Some configurations produce minimal differentials.`;
  }

  return {
    results,
    overallFinding,
    minUnderestimation: globalMinUnderest,
    maxUnderestimation: globalMaxUnderest,
    robustnessScore,
  };
}

/**
 * Export results as CSV for thesis appendix tables.
 */
export function exportSensitivityCSV(summary: SensitivitySummary): string {
  const lines: string[] = [
    "Parameter,Value,Unit,Standard Mean ($),Integrated Mean ($),Mitigated Mean ($),Underestimation (%),VaR95 Standard ($),VaR95 Integrated ($),Mitigation Effect (%)",
  ];

  for (const result of summary.results) {
    for (const dp of result.dataPoints) {
      lines.push([
        result.label,
        dp.parameterValue.toFixed(4),
        result.unit,
        dp.standardMean.toFixed(0),
        dp.integratedMean.toFixed(0),
        dp.mitigatedMean.toFixed(0),
        dp.underestimationPercent.toFixed(2),
        dp.var95Standard.toFixed(0),
        dp.var95Integrated.toFixed(0),
        dp.mitigationEffectPercent.toFixed(2),
      ].join(","));
    }
  }

  return lines.join("\n");
}
