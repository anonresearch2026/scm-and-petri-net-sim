/**
 * Application-wide constants for Supply Chain Risk Simulator
 * Values derived from SCOR model benchmarks and industry research
 */

// SCOR Assessment Thresholds (based on SCOR 12.0 framework)
export const SCOR = {
  GRADE_THRESHOLDS: { A: 90, B: 75, C: 60, D: 40 },
  MAX_RISK_EXPOSURE_ANNUAL: 500000,
  WEIGHTS: {
    RISK_SCORE: 0.4,
    MITIGATION_COVERAGE: 0.35,
    CYBER_PHYSICAL: 0.25,
  },
} as const;

// Baseline metrics for SCOR Level 1 KPIs
export const BASELINE_METRICS = {
  PERFECT_ORDER_FULFILLMENT: 95,      // Industry avg: 90-96%
  ORDER_CYCLE_TIME_DAYS: 5,           // Benchmark for distribution
  SUPPLY_CHAIN_FLEXIBILITY: 80,       // Composite score
  DAYS_PER_YEAR: 365,
} as const;

// Default disruption costs when no scenario is loaded
// Based on Ponemon Institute and supply chain research
export const DEFAULT_DISRUPTION_COSTS = {
  cyber: { base: 50000, cascadeMultiplier: 2.0 },
  physical: { base: 30000, cascadeMultiplier: 1.5 },
  external: { base: 20000, cascadeMultiplier: 1.75 },
  operational: { base: 30000, cascadeMultiplier: 1.5 },
} as const;

// Mitigation effectiveness defaults
export const DEFAULT_MITIGATION_EFFECTIVENESS = {
  backup: { ransomwareReduction: 0.45 },
  firewall: { ransomwareReduction: 0.30 },
  maintenance: { equipmentReduction: 0.40 },
  redundancy: { equipmentReduction: 0.35 },
  dual: { supplierReduction: 0.50 },
  buffer: { supplierReduction: 0.30 },
} as const;

// Risk category to SCOR process mapping
export const RISK_TO_SCOR_PROCESS: Record<string, readonly string[]> = {
  cyber: ["enable", "plan"],
  physical: ["make", "source"],
  external: ["source", "deliver"],
  operational: ["make", "deliver"],
} as const;

// Supply chain tier type to SCOR process mapping
export const TIER_TO_SCOR_PROCESS: Record<string, string> = {
  source: "source",
  supplier: "source",
  transform: "make",
  manufacturing: "make",
  plant: "make",
  distribute: "deliver",
  warehouse: "deliver",
  dc: "deliver",
  customer: "deliver",
  retail: "deliver",
} as const;

export type DisruptionType = "cyber" | "physical" | "external" | "operational";
export type SCORProcess = "plan" | "source" | "make" | "deliver" | "return" | "enable";
