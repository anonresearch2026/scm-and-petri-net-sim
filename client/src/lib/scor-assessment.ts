/**
 * SCOR-based supply chain risk assessment engine.
 *
 * Maps scenario risks and tiers to SCOR Level 1 processes (Plan, Source, Make,
 * Deliver, Return, Enable) and produces graded assessments, KPI metrics,
 * key findings, cost analysis, and prioritised recommendations.
 */

import {
  SCOR,
  BASELINE_METRICS,
  RISK_TO_SCOR_PROCESS,
  TIER_TO_SCOR_PROCESS,
} from "./constants";
import type {
  ScenarioConfig,
  SimulationResults,
  SCORAssessmentReport,
  SCORProcessAssessment,
  SCORMetric,
  SCORGrade,
} from "@shared/schema";

interface MCResultsForAssessment {
  standardMean: number;
  standardStd: number;
  integratedMean: number;
  integratedStd: number;
  mitigatedMean: number;
  mitigatedStd: number;
  hiddenRiskMean: number;
  iterations: number;
  days: number;
}

/**
 * Convert a numeric score (0-100) to a letter grade using SCOR thresholds.
 */
function scoreToGrade(score: number): SCORGrade {
  if (score >= SCOR.GRADE_THRESHOLDS.A) return "A";
  if (score >= SCOR.GRADE_THRESHOLDS.B) return "B";
  if (score >= SCOR.GRADE_THRESHOLDS.C) return "C";
  if (score >= SCOR.GRADE_THRESHOLDS.D) return "D";
  return "F";
}

/**
 * Map a letter grade back to a representative numeric score for averaging.
 */
function gradeToScore(grade: SCORGrade): number {
  switch (grade) {
    case "A": return 95;
    case "B": return 82;
    case "C": return 70;
    case "D": return 55;
    case "F": return 30;
  }
}

/**
 * Generates a comprehensive SCOR-based assessment report from simulation results.
 *
 * The assessment maps scenario risks to SCOR Level 1 processes and evaluates:
 * - Risk exposure per process (weighted by probability x cost x cascade)
 * - Mitigation coverage (% of mapped risks with active mitigations)
 * - Cyber-physical integration risk (based on tier cyber dependencies)
 *
 * @param scenario - The supply chain scenario configuration
 * @param simResults - Real-time simulation results (for live metrics)
 * @param mcResults - Monte Carlo simulation statistics
 * @returns Complete SCOR assessment report with grades, metrics, and recommendations
 */
export function generateSCORAssessment(
  scenario: ScenarioConfig,
  simResults: SimulationResults,
  mcResults: MCResultsForAssessment
): SCORAssessmentReport {
  const processAssessments = assessSCORProcesses(scenario);
  const metrics = calculateSCORMetrics(scenario, mcResults);
  const keyFindings = generateKeyFindings(scenario, processAssessments, mcResults);
  const costAnalysis = analyzeCosts(scenario, mcResults);
  const recommendations = generateRecommendations(processAssessments, costAnalysis);

  const processScores = processAssessments.map(p => gradeToScore(p.overallGrade));
  const overallScore = processScores.reduce((a, b) => a + b, 0) / processScores.length;

  return {
    generatedAt: new Date().toISOString(),
    scenarioName: scenario.name,
    simulationDays: scenario.settings?.simulationDays ?? 30,
    monteCarloIterations: mcResults.iterations,
    overallGrade: scoreToGrade(overallScore),
    overallScore: Math.round(overallScore),
    processAssessments,
    metrics,
    keyFindings,
    costAnalysis,
    recommendations,
  };
}

/**
 * Evaluate each SCOR process by mapping risks, mitigations, and cyber dependencies.
 *
 * Overall score = risk (40%) + mitigation coverage (35%) + cyber-physical (25%)
 */
function assessSCORProcesses(scenario: ScenarioConfig): SCORProcessAssessment[] {
  const processes: Array<"plan" | "source" | "make" | "deliver" | "return" | "enable"> =
    ["plan", "source", "make", "deliver", "return", "enable"];

  return processes.map(processId => {
    const mappedRisks = scenario.risks
      .filter(r => RISK_TO_SCOR_PROCESS[r.category]?.includes(processId))
      .map(r => r.id);

    const mappedMitigations = scenario.mitigations
      .filter(m => m.mitigates.some(mit => mappedRisks.includes(mit.riskId)))
      .map(m => m.id);

    const processRisks = scenario.risks.filter(r => mappedRisks.includes(r.id));
    const totalRiskExposure = processRisks.reduce(
      (sum, r) => sum + r.probability * r.baseCost * r.cascadeMultiplier,
      0
    );

    const riskScore = Math.max(
      0,
      100 - (totalRiskExposure / SCOR.MAX_RISK_EXPOSURE_ANNUAL) * 100
    );

    const mitigatedRisks = mappedMitigations.length;
    const totalRisks = mappedRisks.length;
    const mitigationCoverage = totalRisks > 0 ? (mitigatedRisks / totalRisks) * 100 : 100;

    const relevantTiers = scenario.tiers.filter(t => {
      const scorProcess = TIER_TO_SCOR_PROCESS[t.type] || TIER_TO_SCOR_PROCESS[t.id];
      return scorProcess === processId;
    });
    const avgCyberDep = relevantTiers.length > 0
      ? relevantTiers.reduce((sum, t) => sum + t.cyberDependency, 0) / relevantTiers.length
      : 0.5;
    const cyberPhysicalRisk = avgCyberDep * 100;
    const cyberPhysicalScore = 100 - cyberPhysicalRisk;

    /**
     * Calculate overall process score using weighted components.
     * Weights based on SCOR 12.0 performance attribute priorities.
     */
    const overallScore =
      riskScore * SCOR.WEIGHTS.RISK_SCORE +
      mitigationCoverage * SCOR.WEIGHTS.MITIGATION_COVERAGE +
      cyberPhysicalScore * SCOR.WEIGHTS.CYBER_PHYSICAL;

    const recommendations: string[] = [];
    if (riskScore < 60) {
      recommendations.push(`High risk exposure in ${processId.toUpperCase()} process - consider additional controls`);
    }
    if (mitigationCoverage < 50) {
      recommendations.push(`Only ${Math.round(mitigationCoverage)}% of ${processId.toUpperCase()} risks have mitigations`);
    }
    if (processId === "enable" && cyberPhysicalRisk > 70) {
      recommendations.push("High cyber dependency increases cascade risk - implement IT/OT segmentation");
    }

    return {
      processId,
      processName: processId.charAt(0).toUpperCase() + processId.slice(1),
      riskExposure: Math.round(100 - riskScore),
      riskGrade: scoreToGrade(riskScore),
      mitigationCoverage: Math.round(mitigationCoverage),
      mitigationGrade: scoreToGrade(mitigationCoverage),
      cyberPhysicalRisk: Math.round(cyberPhysicalRisk),
      cyberPhysicalGrade: scoreToGrade(cyberPhysicalScore),
      overallGrade: scoreToGrade(overallScore),
      mappedRisks,
      mappedMitigations,
      recommendations,
    };
  });
}

/**
 * Compute SCOR Level 1 KPI metrics by comparing baseline values against
 * Monte Carlo simulation outputs.
 */
function calculateSCORMetrics(
  scenario: ScenarioConfig,
  mcResults: MCResultsForAssessment
): SCORMetric[] {
  const metrics: SCORMetric[] = [];
  const simDays = scenario.settings?.simulationDays ?? 30;

  const underestimationPercent = mcResults.standardMean > 0
    ? ((mcResults.integratedMean - mcResults.standardMean) / mcResults.standardMean) * 100
    : 0;

  // RL.1.1 Perfect Order Fulfillment
  const disruptionImpact = (mcResults.integratedMean / (simDays * 10000)) * 10;
  const perfectOrderSimulated = Math.max(
    0,
    BASELINE_METRICS.PERFECT_ORDER_FULFILLMENT - disruptionImpact
  );
  metrics.push({
    id: "rl_1_1",
    name: "Perfect Order Fulfillment",
    category: "reliability",
    baseline: BASELINE_METRICS.PERFECT_ORDER_FULFILLMENT,
    simulated: Math.round(perfectOrderSimulated * 10) / 10,
    unit: "%",
    impactPercent: Math.round(
      ((perfectOrderSimulated - BASELINE_METRICS.PERFECT_ORDER_FULFILLMENT) /
        BASELINE_METRICS.PERFECT_ORDER_FULFILLMENT) * 100
    ),
    impactDirection: perfectOrderSimulated >= BASELINE_METRICS.PERFECT_ORDER_FULFILLMENT ? "positive" : "negative",
    grade: scoreToGrade(perfectOrderSimulated),
  });

  // RS.1.1 Order Fulfillment Cycle Time
  const cycleTimeImpact = (mcResults.integratedMean / (simDays * 50000)) * 2;
  const cycleTimeSimulated = BASELINE_METRICS.ORDER_CYCLE_TIME_DAYS + cycleTimeImpact;
  metrics.push({
    id: "rs_1_1",
    name: "Order Fulfillment Cycle Time",
    category: "responsiveness",
    baseline: BASELINE_METRICS.ORDER_CYCLE_TIME_DAYS,
    simulated: Math.round(cycleTimeSimulated * 10) / 10,
    unit: "days",
    impactPercent: Math.round(
      ((cycleTimeSimulated - BASELINE_METRICS.ORDER_CYCLE_TIME_DAYS) /
        BASELINE_METRICS.ORDER_CYCLE_TIME_DAYS) * 100
    ),
    impactDirection: cycleTimeSimulated <= BASELINE_METRICS.ORDER_CYCLE_TIME_DAYS ? "positive" : "negative",
    grade: scoreToGrade(
      Math.max(0, 100 - (cycleTimeImpact / BASELINE_METRICS.ORDER_CYCLE_TIME_DAYS) * 100)
    ),
  });

  // AG.1.1 Supply Chain Flexibility
  const mitigationCount = scenario.mitigations.length;
  const flexibilityBonus = Math.min(20, mitigationCount * 5);
  const flexibilitySimulated =
    BASELINE_METRICS.SUPPLY_CHAIN_FLEXIBILITY + flexibilityBonus - disruptionImpact;
  metrics.push({
    id: "ag_1_1",
    name: "Supply Chain Flexibility",
    category: "agility",
    baseline: BASELINE_METRICS.SUPPLY_CHAIN_FLEXIBILITY,
    simulated: Math.round(Math.max(0, Math.min(100, flexibilitySimulated))),
    unit: "score",
    impactPercent: Math.round(
      ((flexibilitySimulated - BASELINE_METRICS.SUPPLY_CHAIN_FLEXIBILITY) /
        BASELINE_METRICS.SUPPLY_CHAIN_FLEXIBILITY) * 100
    ),
    impactDirection: flexibilitySimulated >= BASELINE_METRICS.SUPPLY_CHAIN_FLEXIBILITY ? "positive" : "negative",
    grade: scoreToGrade(Math.max(0, Math.min(100, flexibilitySimulated))),
  });

  // CO.1.1 Total Disruption Cost
  metrics.push({
    id: "co_1_1",
    name: "Total Disruption Cost",
    category: "cost",
    baseline: Math.round(mcResults.standardMean),
    simulated: Math.round(mcResults.integratedMean),
    unit: "$",
    impactPercent: Math.round(underestimationPercent),
    impactDirection: "negative",
    grade: scoreToGrade(Math.max(0, 100 - Math.abs(underestimationPercent))),
  });

  // AM.1.1 Mitigation ROI
  const totalMitigationCost = scenario.mitigations.reduce((sum, m) => sum + m.monthlyCost, 0);
  const savingsFromMitigation = mcResults.integratedMean - mcResults.mitigatedMean;
  const mitigationROI = totalMitigationCost > 0
    ? (savingsFromMitigation / totalMitigationCost) * 100
    : 0;
  metrics.push({
    id: "am_1_1",
    name: "Mitigation ROI",
    category: "assets",
    baseline: 100,
    simulated: Math.round(mitigationROI),
    unit: "%",
    impactPercent: Math.round(mitigationROI - 100),
    impactDirection: mitigationROI >= 100 ? "positive" : "negative",
    grade: scoreToGrade(Math.min(100, Math.max(0, mitigationROI))),
  });

  return metrics;
}

/**
 * Surface actionable key findings by analysing process grades,
 * hidden-risk levels, and cyber-physical dependencies.
 */
function generateKeyFindings(
  scenario: ScenarioConfig,
  processAssessments: SCORProcessAssessment[],
  mcResults: MCResultsForAssessment
): SCORAssessmentReport["keyFindings"] {
  const findings: SCORAssessmentReport["keyFindings"] = [];

  const strongProcesses = processAssessments.filter(p => p.overallGrade === "A" || p.overallGrade === "B");
  strongProcesses.forEach(p => {
    findings.push({
      type: "strength",
      title: `Strong ${p.processName} Process`,
      description: `${p.processName} shows good risk coverage (${p.mitigationCoverage}%) and manageable exposure`,
      priority: "low",
      relatedProcess: p.processId,
    });
  });

  const weakProcesses = processAssessments.filter(p => p.overallGrade === "D" || p.overallGrade === "F");
  weakProcesses.forEach(p => {
    findings.push({
      type: "weakness",
      title: `${p.processName} Process Vulnerability`,
      description: `${p.processName} has ${p.riskExposure}% risk exposure with only ${p.mitigationCoverage}% mitigation coverage`,
      priority: "high",
      relatedProcess: p.processId,
    });
  });

  const underestimationPercent = mcResults.standardMean > 0
    ? ((mcResults.integratedMean - mcResults.standardMean) / mcResults.standardMean) * 100
    : 0;

  if (underestimationPercent > 30) {
    findings.push({
      type: "opportunity",
      title: "Cost Model Improvement Opportunity",
      description: `Traditional models underestimate costs by ${Math.round(underestimationPercent)}% - integrated assessment reveals true exposure`,
      priority: "high",
    });
  }

  const sorted = [...processAssessments].sort((a, b) => b.cyberPhysicalRisk - a.cyberPhysicalRisk);
  if (sorted[0] && sorted[0].cyberPhysicalRisk > 60) {
    findings.push({
      type: "threat",
      title: "High Cyber-Physical Integration Risk",
      description: "Elevated dependency on IT systems creates cascade vulnerability across physical operations",
      priority: "high",
      relatedProcess: "enable",
    });
  }

  if (mcResults.hiddenRiskMean > 50) {
    findings.push({
      type: "threat",
      title: "Significant Hidden Risk",
      description: `Mean hidden risk of ${Math.round(mcResults.hiddenRiskMean)}% indicates traditional models substantially underestimate true exposure`,
      priority: "high",
    });
  }

  return findings;
}

/**
 * Annualise Monte Carlo results into financial impact metrics.
 * Scales simulation-period costs to yearly estimates using a linear projection.
 */
function analyzeCosts(
  scenario: ScenarioConfig,
  mcResults: MCResultsForAssessment
): SCORAssessmentReport["costAnalysis"] {
  const simDays = mcResults.days || scenario.settings?.simulationDays || 30;

  const dailyLoss = mcResults.integratedMean / simDays;
  const expectedAnnualLoss = dailyLoss * BASELINE_METRICS.DAYS_PER_YEAR;

  // 95th percentile VaR using parametric approximation (z = 1.645)
  const valueAtRisk95 =
    (mcResults.integratedMean + 1.645 * mcResults.integratedStd) *
    (BASELINE_METRICS.DAYS_PER_YEAR / simDays);

  const totalMitigationCost = scenario.mitigations.reduce((sum, m) => sum + m.monthlyCost, 0) * 12;
  const annualSavings =
    (mcResults.integratedMean - mcResults.mitigatedMean) *
    (BASELINE_METRICS.DAYS_PER_YEAR / simDays);
  const mitigationROI = totalMitigationCost > 0
    ? ((annualSavings - totalMitigationCost) / totalMitigationCost) * 100
    : 0;

  const underestimationGap = mcResults.standardMean > 0
    ? ((mcResults.integratedMean - mcResults.standardMean) / mcResults.standardMean) * 100
    : 0;

  return {
    expectedAnnualLoss: Math.round(expectedAnnualLoss),
    valueAtRisk95: Math.round(valueAtRisk95),
    mitigationROI: Math.round(mitigationROI),
    underestimationGap: Math.round(underestimationGap),
  };
}

/**
 * Generate prioritised, actionable recommendations based on process
 * grades, cyber risk levels, and cost analysis outcomes.
 */
function generateRecommendations(
  processAssessments: SCORProcessAssessment[],
  costAnalysis: SCORAssessmentReport["costAnalysis"]
): SCORAssessmentReport["recommendations"] {
  const recommendations: SCORAssessmentReport["recommendations"] = [];
  let priority = 1;

  processAssessments
    .filter(p => p.overallGrade === "F")
    .forEach(p => {
      recommendations.push({
        priority: priority++,
        category: "immediate",
        action: `Implement emergency controls for ${p.processName} process`,
        expectedImpact: `Reduce ${p.processName} risk exposure from ${p.riskExposure}% to <50%`,
        estimatedCost: "$10K-$50K",
        targetProcess: p.processId,
      });
    });

  const highCyberRisk = processAssessments.filter(p => p.cyberPhysicalRisk > 70);
  if (highCyberRisk.length > 0) {
    recommendations.push({
      priority: priority++,
      category: "short_term",
      action: "Implement IT/OT network segmentation and backup systems",
      expectedImpact: "Reduce cascade propagation risk through IT/OT isolation",
      estimatedCost: "$25K-$100K",
      targetProcess: "enable",
    });
  }

  processAssessments
    .filter(p => p.mitigationCoverage < 50 && p.mappedRisks.length > 0)
    .forEach(p => {
      recommendations.push({
        priority: priority++,
        category: "short_term",
        action: `Add mitigation controls for unprotected ${p.processName} risks`,
        expectedImpact: `Increase ${p.processName} coverage from ${p.mitigationCoverage}% to >75%`,
        estimatedCost: "$5K-$25K/month",
        targetProcess: p.processId,
      });
    });

  if (costAnalysis.mitigationROI < 100) {
    recommendations.push({
      priority: priority++,
      category: "long_term",
      action: "Optimize mitigation portfolio - current ROI below breakeven",
      expectedImpact: "Achieve positive ROI on risk mitigation spend",
      estimatedCost: "Reallocation of existing budget",
      targetProcess: "plan",
    });
  } else if (costAnalysis.mitigationROI > 200) {
    recommendations.push({
      priority: priority++,
      category: "long_term",
      action: "Consider additional mitigation investments given strong ROI",
      expectedImpact: `Current ${costAnalysis.mitigationROI}% ROI suggests room for more controls`,
      estimatedCost: "Variable based on risk appetite",
      targetProcess: "plan",
    });
  }

  if (costAnalysis.underestimationGap > 40) {
    recommendations.push({
      priority: priority++,
      category: "long_term",
      action: "Update enterprise risk models to include cyber-physical cascades",
      expectedImpact: `Close ${costAnalysis.underestimationGap}% gap between traditional and integrated risk estimates`,
      estimatedCost: "Internal process change",
      targetProcess: "plan",
    });
  }

  return recommendations;
}
