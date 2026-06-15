import { z } from "zod";

export const PlaceTypeSchema = z.enum(["normal", "disrupted", "recovery", "cyber", "mitigation"]);
export type PlaceType = z.infer<typeof PlaceTypeSchema>;

export const PlaceSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  tokens: z.number().default(0),
  label: z.string(),
  name: z.string(),
  type: PlaceTypeSchema,
});
export type Place = z.infer<typeof PlaceSchema>;

export const TransitionSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  label: z.string(),
  name: z.string(),
  enabled: z.boolean().default(false),
  fta: z.boolean().optional(),
  cyber: z.boolean().optional(),
});
export type Transition = z.infer<typeof TransitionSchema>;

export const ArcSchema = z.object({
  from: z.string(),
  to: z.string(),
  cascade: z.boolean().optional(),
  cyber: z.boolean().optional(),
  direct: z.boolean().optional(),
  mitigation: z.boolean().optional(),
  inhibitor: z.boolean().optional(),
});
export type Arc = z.infer<typeof ArcSchema>;

export const PetriNetModelSchema = z.object({
  places: z.array(PlaceSchema),
  transitions: z.array(TransitionSchema),
});
export type PetriNetModel = z.infer<typeof PetriNetModelSchema>;

export const ParametersSchema = z.object({
  ransomwareProb: z.number().default(0.02),
  equipmentProb: z.number().default(0.05),
  supplierProb: z.number().default(0.01),
  cascadeDelay: z.number().default(800),
  recoveryFactor: z.number().default(3),
  costMultiplier: z.number().default(1.0),
});
export type Parameters = z.infer<typeof ParametersSchema>;

export const MitigationConfigSchema = z.object({
  cost: z.number(),
  ransomwareReduction: z.number().optional(),
  equipmentReduction: z.number().optional(),
  supplierReduction: z.number().optional(),
  bufferDays: z.number().optional(),
});
export type MitigationConfig = z.infer<typeof MitigationConfigSchema>;

export const MitigationTypeSchema = z.enum(["backup", "firewall", "buffer", "dual", "maintenance", "redundancy"]);
export type MitigationType = z.infer<typeof MitigationTypeSchema>;

export interface MitigationConfigs {
  backup: MitigationConfig;
  firewall: MitigationConfig;
  buffer: MitigationConfig;
  dual: MitigationConfig;
  maintenance: MitigationConfig;
  redundancy: MitigationConfig;
}

export const SimulationResultsSchema = z.object({
  day: z.number(),
  ftaProbability: z.number(),
  cascadeCount: z.number(),
  standardCost: z.number(),
  integratedCost: z.number(),
  mitigatedCost: z.number(),
  hiddenRisk: z.number(),
  activeMitigations: z.number(),
  mitigationCost: z.number(),
  mitigationSavings: z.number(),
});
export type SimulationResults = z.infer<typeof SimulationResultsSchema>;

export interface MonteCarloStats {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  median: number;
  p5: number;
  p10: number;
  p25: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  ci95Lower: number;
  ci95Upper: number;
  n: number;
}

export interface MonteCarloResults {
  iterations: number;
  standard: MonteCarloStats;
  integrated: MonteCarloStats;
  mitigated: MonteCarloStats;
  cascades: MonteCarloStats;
  eventCounts: MonteCarloStats;
  underestimationPercent: number;
  mitigationEffectPercent: number;
  valueAtRisk: {
    standard95: number;
    integrated95: number;
    mitigated95: number;
  };
}

export interface FTANode {
  id: string;
  name: string;
  type: "event" | "intermediate" | "basic";
  description: string;
  probability?: number;
  effectiveProbability?: number;
  baseCost?: number;
  mitigations?: string[];
  category?: string;
  gate?: {
    id: string;
    type: "AND" | "OR";
    description: string;
  };
  children?: FTANode[];
}

export interface FTAImportanceMetric {
  id: string;
  name: string;
  category: string;
  baseProbability: number;
  effectiveProbability: number;
  mitigations: string[];
  baseCost: number;
  fussellVesely: number;
  birnbaum: number;
  raw: number;
  rrw: number;
  criticality: number;
}

export interface MinimalCutSet {
  id: string;
  name: string;
  events: string[];
  eventNames: string[];
  probability: number;
  order: number;
  category: string;
}

export interface SCORProcess {
  id: string;
  name: string;
  color: string;
  description: string;
  level2: Array<{
    id: string;
    name: string;
    description: string;
  }>;
  petriNetMapping: string[];
  riskEvents: string[];
  impactedBy: {
    ransomware: number;
    equipment: number;
    supplier: number;
  };
  effectiveRisk: number;
  metrics: Record<string, {
    name: string;
    baseline: number;
    unit: string;
  }>;
}

export type TabType = "home" | "fta" | "simulation" | "sensitivity" | "report";

export const COLORS = {
  primary: '#2c3e50',
  secondary: '#34495e',
  standard: '#4a90e2',
  risk: '#e74c3c',
  mitigated: '#16a34a',
  warning: '#f39c12',
  cyber: '#9b59b6',
  cascade: '#9b59b6',
  text: '#2c3e50',
  textLight: '#666',
  textMuted: '#999',
  border: '#e0e0e0',
  background: '#fafafa',
  white: '#ffffff',
  success: '#16a34a',
  danger: '#e74c3c',
  plan: '#3498db',
  source: '#9b59b6',
  make: '#e67e22',
  deliver: '#1abc9c',
  return: '#e74c3c',
  enable: '#34495e',
};

export const DEFAULT_PARAMETERS: Parameters = {
  ransomwareProb: 0.02,
  equipmentProb: 0.05,
  supplierProb: 0.01,
  cascadeDelay: 800,
  recoveryFactor: 3,
  costMultiplier: 1.0,
};

export const DEFAULT_MITIGATION_CONFIGS: MitigationConfigs = {
  backup: { cost: 5000, ransomwareReduction: 0.4 },
  firewall: { cost: 3000, ransomwareReduction: 0.35 },
  buffer: { cost: 15000, supplierReduction: 0.8, bufferDays: 30 },
  dual: { cost: 4000, supplierReduction: 0.5 },
  maintenance: { cost: 6000, equipmentReduction: 0.7 },
  redundancy: { cost: 25000, equipmentReduction: 0.8 },
};

export const SupplyChainTierSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["source", "transform", "distribute", "customer"]),
  position: z.number(),
  cyberDependency: z.number().min(0).max(1).default(0.5),
});
export type SupplyChainTier = z.infer<typeof SupplyChainTierSchema>;

export const RiskEventSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(["cyber", "physical", "external", "operational"]),
  probability: z.number().min(0).max(1),
  baseCost: z.number().min(0),
  cascadeMultiplier: z.number().min(1).default(1.5),
  affectedTiers: z.array(z.string()),
  propagates: z.boolean().default(true),
});
export type RiskEvent = z.infer<typeof RiskEventSchema>;

export const MitigationStrategySchema = z.object({
  id: z.string(),
  name: z.string(),
  monthlyCost: z.number().min(0),
  mitigates: z.array(z.object({
    riskId: z.string(),
    reductionFactor: z.number().min(0).max(1),
  })),
  bufferDays: z.number().optional(),
});
export type MitigationStrategy = z.infer<typeof MitigationStrategySchema>;

export const ScenarioConfigSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  industry: z.string().optional(),
  tiers: z.array(SupplyChainTierSchema).min(2),
  risks: z.array(RiskEventSchema).min(1),
  mitigations: z.array(MitigationStrategySchema),
  settings: z.object({
    simulationDays: z.number().default(30),
    monteCarloIterations: z.number().default(1000),
    costMultiplier: z.number().default(1.0),
    recoveryFactor: z.number().default(3),
  }).optional(),
});
export type ScenarioConfig = z.infer<typeof ScenarioConfigSchema>;

export const SCORGradeSchema = z.enum(["A", "B", "C", "D", "F"]);
export type SCORGrade = z.infer<typeof SCORGradeSchema>;

export const SCORProcessAssessmentSchema = z.object({
  processId: z.enum(["plan", "source", "make", "deliver", "return", "enable"]),
  processName: z.string(),
  riskExposure: z.number(),
  riskGrade: SCORGradeSchema,
  mitigationCoverage: z.number(),
  mitigationGrade: SCORGradeSchema,
  cyberPhysicalRisk: z.number(),
  cyberPhysicalGrade: SCORGradeSchema,
  overallGrade: SCORGradeSchema,
  mappedRisks: z.array(z.string()),
  mappedMitigations: z.array(z.string()),
  recommendations: z.array(z.string()),
});
export type SCORProcessAssessment = z.infer<typeof SCORProcessAssessmentSchema>;

export const SCORMetricSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(["reliability", "responsiveness", "agility", "cost", "assets"]),
  baseline: z.number(),
  simulated: z.number(),
  unit: z.string(),
  impactPercent: z.number(),
  impactDirection: z.enum(["positive", "negative", "neutral"]),
  grade: SCORGradeSchema,
});
export type SCORMetric = z.infer<typeof SCORMetricSchema>;

export const SCORAssessmentReportSchema = z.object({
  generatedAt: z.string(),
  scenarioName: z.string(),
  simulationDays: z.number(),
  monteCarloIterations: z.number(),
  overallGrade: SCORGradeSchema,
  overallScore: z.number(),
  processAssessments: z.array(SCORProcessAssessmentSchema),
  metrics: z.array(SCORMetricSchema),
  keyFindings: z.array(z.object({
    type: z.enum(["strength", "weakness", "opportunity", "threat"]),
    title: z.string(),
    description: z.string(),
    priority: z.enum(["high", "medium", "low"]),
    relatedProcess: z.string().optional(),
  })),
  costAnalysis: z.object({
    expectedAnnualLoss: z.number(),
    valueAtRisk95: z.number(),
    mitigationROI: z.number(),
    underestimationGap: z.number(),
  }),
  recommendations: z.array(z.object({
    priority: z.number(),
    category: z.enum(["immediate", "short_term", "long_term"]),
    action: z.string(),
    expectedImpact: z.string(),
    estimatedCost: z.string(),
    targetProcess: z.string(),
  })),
});
export type SCORAssessmentReport = z.infer<typeof SCORAssessmentReportSchema>;
