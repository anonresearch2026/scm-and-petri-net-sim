/**
 * Monte Carlo simulation engine for supply chain disruption modeling.
 *
 * Uses forward-only Monte Carlo-driven token simulation where tokens traverse
 * a Petri net according to probabilistic firing rules. Each iteration initializes
 * a state vector of place→token counts, then steps day-by-day checking transition
 * firing conditions (input place has token AND Math.random() < probability).
 *
 * Three model variants are simulated per iteration:
 * - Standard: Physical disruptions only (P1–P9), no cyber places, no cascade
 * - Integrated: Adds cyber places (P10–P12) and cascade transitions (T4, T5)
 * - Mitigated: Adds mitigation places (M1–M6) that reduce cost when active
 *
 * Computational complexity: O(iterations × days × transitions) — linear with
 * respect to simulation parameters, not exponential with system states, because
 * no reachability graph is constructed. The engine evaluates each transition's
 * firing condition independently per day per iteration.
 *
 * @module monte-carlo
 */

import { mean, standardDeviation, confidenceInterval } from "./math";
import { DEFAULT_DISRUPTION_COSTS } from "./constants";
import type { DisruptionType } from "./constants";
import type { Parameters, MitigationType, MitigationConfigs, ScenarioConfig } from "@shared/schema";

export interface MonteCarloConfig {
  iterations: number;
  days: number;
  parameters: Parameters;
  activeMitigations: Set<MitigationType>;
  mitigationConfigs: MitigationConfigs;
  scenario: ScenarioConfig | null;
}

export interface ModelStats {
  mean: number;
  std: number;
  min: number;
  max: number;
}

export interface MonteCarloResults {
  iterations: number;
  days: number;
  standardCosts: number[];
  integratedCosts: number[];
  mitigatedCosts: number[];
  standard: ModelStats;
  integrated: ModelStats;
  mitigated: ModelStats;
  hiddenRisk: {
    mean: number;
    ci95: [number, number];
  };
  hiddenRiskPercents: number[];
}

interface DisruptionCosts {
  base: number;
  cascade: number;
}

/**
 * Extract disruption costs from scenario config, falling back to research-based defaults.
 * When a scenario is loaded, costs are weighted by each risk's probability
 * so higher-likelihood events contribute more to the average.
 */
function getDisruptionCosts(
  scenario: ScenarioConfig | null,
  category: DisruptionType
): DisruptionCosts {
  if (!scenario) {
    const defaults = DEFAULT_DISRUPTION_COSTS[category];
    return { base: defaults.base, cascade: defaults.cascadeMultiplier };
  }

  const categoryRisks = scenario.risks.filter(r => {
    if (category === "physical") {
      return r.category === "physical" || r.category === "operational";
    }
    return r.category === category;
  });

  if (categoryRisks.length === 0) {
    const defaults = DEFAULT_DISRUPTION_COSTS[category];
    return { base: defaults.base, cascade: defaults.cascadeMultiplier };
  }

  const totalProb = categoryRisks.reduce((sum, r) => sum + r.probability, 0);
  const weightedBase = categoryRisks.reduce(
    (sum, r) => sum + r.baseCost * (r.probability / totalProb),
    0
  );
  const weightedCascade = categoryRisks.reduce(
    (sum, r) => sum + r.cascadeMultiplier * (r.probability / totalProb),
    0
  );

  return { base: weightedBase, cascade: weightedCascade };
}

// ---------------------------------------------------------------------------
// Petri Net State Representation
// ---------------------------------------------------------------------------

type PlaceId = string;

interface PetriNetState {
  tokens: Map<PlaceId, number>;
}

/**
 * Transition firing rule within the Petri net.
 *
 * @property id            - Transition identifier (T1–T13)
 * @property inputs        - Places that must hold a token for the transition to be enabled
 * @property outputs       - Places that receive a token when the transition fires
 * @property probability   - Daily firing probability (from Parameters)
 * @property costEffect    - Financial impact when the transition fires (full cost without mitigation)
 * @property phase         - Evaluation phase: disruption → cascade → recovery → restore
 * @property cyber         - Whether this is a cyber-layer transition
 * @property cascade       - Whether this transition propagates disruption downstream
 * @property inhibitors    - Mitigation places that reduce cost when they hold a token
 * @property costReduction - Factor multiplied into costEffect when inhibitors are active (0–1)
 */
interface TransitionRule {
  id: string;
  inputs: PlaceId[];
  outputs: PlaceId[];
  probability: number;
  costEffect: number;
  phase: "disruption" | "cascade" | "recovery" | "restore";
  cyber?: boolean;
  cascade?: boolean;
  inhibitors?: PlaceId[];
  costReduction?: number;
}

function createState(placeIds: PlaceId[], initialTokens: Record<PlaceId, number>): PetriNetState {
  const tokens = new Map<PlaceId, number>();
  for (const id of placeIds) {
    tokens.set(id, initialTokens[id] ?? 0);
  }
  return { tokens };
}

function hasToken(state: PetriNetState, place: PlaceId): boolean {
  return (state.tokens.get(place) ?? 0) > 0;
}

function removeToken(state: PetriNetState, place: PlaceId): void {
  const current = state.tokens.get(place) ?? 0;
  state.tokens.set(place, Math.max(0, current - 1));
}

function addToken(state: PetriNetState, place: PlaceId): void {
  const current = state.tokens.get(place) ?? 0;
  state.tokens.set(place, current + 1);
}

// ---------------------------------------------------------------------------
// Mitigation place mapping
// ---------------------------------------------------------------------------

const MITIGATION_PLACE_MAP: Record<MitigationType, PlaceId> = {
  backup: "M1",
  firewall: "M2",
  buffer: "M3",
  dual: "M4",
  maintenance: "M5",
  redundancy: "M6",
};

const MITIGATION_REDUCTION_KEYS: Record<MitigationType, string> = {
  backup: "ransomwareReduction",
  firewall: "ransomwareReduction",
  maintenance: "equipmentReduction",
  redundancy: "equipmentReduction",
  dual: "supplierReduction",
  buffer: "supplierReduction",
};

function getMitigationReduction(
  mitType: MitigationType,
  configs: MitigationConfigs
): number {
  const key = MITIGATION_REDUCTION_KEYS[mitType];
  return (configs[mitType] as Record<string, number>)[key] || 0;
}

// ---------------------------------------------------------------------------
// Standard model: P1–P9 physical tiers only
// ---------------------------------------------------------------------------

const STANDARD_PLACES: PlaceId[] = [
  "P1", "P2", "P3",
  "P4", "P5", "P6",
  "P7", "P8", "P9",
];

const STANDARD_INITIAL: Record<PlaceId, number> = {
  P1: 1, P4: 1, P7: 1,
};

function buildStandardTransitions(
  params: Parameters,
  costs: { cyber: DisruptionCosts; physical: DisruptionCosts; external: DisruptionCosts }
): TransitionRule[] {
  return [
    {
      id: "T1", phase: "disruption",
      inputs: ["P1"], outputs: ["P2"],
      probability: params.ransomwareProb,
      costEffect: costs.cyber.base * params.costMultiplier,
    },
    {
      id: "T2", phase: "disruption",
      inputs: ["P4"], outputs: ["P5"],
      probability: params.equipmentProb,
      costEffect: costs.physical.base * params.costMultiplier,
    },
    {
      id: "T3", phase: "disruption",
      inputs: ["P7"], outputs: ["P8"],
      probability: params.supplierProb,
      costEffect: costs.external.base * params.costMultiplier,
    },
    {
      id: "T6", phase: "recovery",
      inputs: ["P2"], outputs: ["P3"],
      probability: 1 / params.recoveryFactor,
      costEffect: 0,
    },
    {
      id: "T7", phase: "recovery",
      inputs: ["P5"], outputs: ["P6"],
      probability: 1 / params.recoveryFactor,
      costEffect: 0,
    },
    {
      id: "T8", phase: "recovery",
      inputs: ["P8"], outputs: ["P9"],
      probability: 1 / params.recoveryFactor,
      costEffect: 0,
    },
    {
      id: "T9", phase: "restore",
      inputs: ["P3"], outputs: ["P1"],
      probability: 1.0,
      costEffect: 0,
    },
    {
      id: "T10", phase: "restore",
      inputs: ["P6"], outputs: ["P4"],
      probability: 1.0,
      costEffect: 0,
    },
    {
      id: "T11", phase: "restore",
      inputs: ["P9"], outputs: ["P7"],
      probability: 1.0,
      costEffect: 0,
    },
  ];
}

// ---------------------------------------------------------------------------
// Integrated model: P1–P12 with cyber places and cascade transitions
// ---------------------------------------------------------------------------

const INTEGRATED_PLACES: PlaceId[] = [
  ...STANDARD_PLACES,
  "P10", "P11", "P12",
];

const INTEGRATED_INITIAL: Record<PlaceId, number> = {
  ...STANDARD_INITIAL,
  P10: 1, P11: 1, P12: 1,
};

function buildIntegratedTransitions(
  params: Parameters,
  costs: { cyber: DisruptionCosts; physical: DisruptionCosts; external: DisruptionCosts }
): TransitionRule[] {
  return [
    {
      id: "T1", phase: "disruption",
      inputs: ["P1", "P10"], outputs: ["P2"],
      probability: params.ransomwareProb,
      costEffect: costs.cyber.base * costs.cyber.cascade * params.costMultiplier,
      cyber: true,
    },
    {
      id: "T2", phase: "disruption",
      inputs: ["P4"], outputs: ["P5"],
      probability: params.equipmentProb,
      costEffect: costs.physical.base * costs.physical.cascade * params.costMultiplier,
    },
    {
      id: "T3", phase: "disruption",
      inputs: ["P7"], outputs: ["P8"],
      probability: params.supplierProb,
      costEffect: costs.external.base * costs.external.cascade * params.costMultiplier,
    },
    {
      id: "T12", phase: "disruption",
      inputs: ["P10"], outputs: ["P11"],
      probability: params.ransomwareProb,
      costEffect: 0,
      cyber: true,
    },
    {
      id: "T13", phase: "disruption",
      inputs: ["P11"], outputs: ["P12"],
      probability: params.ransomwareProb * 0.5,
      costEffect: 0,
      cyber: true,
    },
    {
      id: "T4", phase: "cascade",
      inputs: ["P2", "P4"], outputs: ["P2", "P5"],
      probability: 1.0,
      costEffect: costs.cyber.base * costs.cyber.cascade * params.costMultiplier * 0.5,
      cascade: true,
    },
    {
      id: "T5", phase: "cascade",
      inputs: ["P5", "P7"], outputs: ["P5", "P8"],
      probability: 1.0,
      costEffect: costs.cyber.base * costs.cyber.cascade * params.costMultiplier * 0.25,
      cascade: true,
    },
    {
      id: "T6", phase: "recovery",
      inputs: ["P2"], outputs: ["P3"],
      probability: 1 / params.recoveryFactor,
      costEffect: 0,
    },
    {
      id: "T7", phase: "recovery",
      inputs: ["P5"], outputs: ["P6"],
      probability: 1 / params.recoveryFactor,
      costEffect: 0,
    },
    {
      id: "T8", phase: "recovery",
      inputs: ["P8"], outputs: ["P9"],
      probability: 1 / params.recoveryFactor,
      costEffect: 0,
    },
    {
      id: "T9", phase: "restore",
      inputs: ["P3"], outputs: ["P1", "P10"],
      probability: 1.0,
      costEffect: 0,
    },
    {
      id: "T10", phase: "restore",
      inputs: ["P6"], outputs: ["P4"],
      probability: 1.0,
      costEffect: 0,
    },
    {
      id: "T11", phase: "restore",
      inputs: ["P9"], outputs: ["P7"],
      probability: 1.0,
      costEffect: 0,
    },
  ];
}

// ---------------------------------------------------------------------------
// Mitigated model: Integrated + M1–M6 mitigation places
// ---------------------------------------------------------------------------

const MITIGATED_PLACES: PlaceId[] = [
  ...INTEGRATED_PLACES,
  "M1", "M2", "M3", "M4", "M5", "M6",
];

function buildMitigatedInitial(activeMitigations: Set<MitigationType>): Record<PlaceId, number> {
  const initial: Record<PlaceId, number> = { ...INTEGRATED_INITIAL };
  for (const [mitType, placeId] of Object.entries(MITIGATION_PLACE_MAP)) {
    initial[placeId] = activeMitigations.has(mitType as MitigationType) ? 1 : 0;
  }
  return initial;
}

function buildMitigatedTransitions(
  params: Parameters,
  costs: { cyber: DisruptionCosts; physical: DisruptionCosts; external: DisruptionCosts },
  activeMitigations: Set<MitigationType>,
  configs: MitigationConfigs
): TransitionRule[] {
  let cyberMitFactor = 1.0;
  for (const mitType of ["backup", "firewall"] as MitigationType[]) {
    if (activeMitigations.has(mitType)) {
      cyberMitFactor *= 1 - getMitigationReduction(mitType, configs);
    }
  }

  let physicalMitFactor = 1.0;
  for (const mitType of ["maintenance", "redundancy"] as MitigationType[]) {
    if (activeMitigations.has(mitType)) {
      physicalMitFactor *= 1 - getMitigationReduction(mitType, configs);
    }
  }

  let externalMitFactor = 1.0;
  for (const mitType of ["dual", "buffer"] as MitigationType[]) {
    if (activeMitigations.has(mitType)) {
      externalMitFactor *= 1 - getMitigationReduction(mitType, configs);
    }
  }

  const cyberInhibitors: PlaceId[] = [];
  if (activeMitigations.has("backup")) cyberInhibitors.push("M1");
  if (activeMitigations.has("firewall")) cyberInhibitors.push("M2");

  const physicalInhibitors: PlaceId[] = [];
  if (activeMitigations.has("maintenance")) physicalInhibitors.push("M5");
  if (activeMitigations.has("redundancy")) physicalInhibitors.push("M6");

  const externalInhibitors: PlaceId[] = [];
  if (activeMitigations.has("dual")) externalInhibitors.push("M4");
  if (activeMitigations.has("buffer")) externalInhibitors.push("M3");

  return [
    {
      id: "T1", phase: "disruption",
      inputs: ["P1", "P10"], outputs: ["P2"],
      probability: params.ransomwareProb,
      costEffect: costs.cyber.base * costs.cyber.cascade * params.costMultiplier,
      cyber: true,
      inhibitors: cyberInhibitors,
      costReduction: cyberMitFactor,
    },
    {
      id: "T2", phase: "disruption",
      inputs: ["P4"], outputs: ["P5"],
      probability: params.equipmentProb,
      costEffect: costs.physical.base * costs.physical.cascade * params.costMultiplier,
      inhibitors: physicalInhibitors,
      costReduction: physicalMitFactor,
    },
    {
      id: "T3", phase: "disruption",
      inputs: ["P7"], outputs: ["P8"],
      probability: params.supplierProb,
      costEffect: costs.external.base * costs.external.cascade * params.costMultiplier,
      inhibitors: externalInhibitors,
      costReduction: externalMitFactor,
    },
    {
      id: "T12", phase: "disruption",
      inputs: ["P10"], outputs: ["P11"],
      probability: params.ransomwareProb,
      costEffect: 0,
      cyber: true,
      inhibitors: cyberInhibitors,
    },
    {
      id: "T13", phase: "disruption",
      inputs: ["P11"], outputs: ["P12"],
      probability: params.ransomwareProb * 0.5,
      costEffect: 0,
      cyber: true,
    },
    {
      id: "T4", phase: "cascade",
      inputs: ["P2", "P4"], outputs: ["P2", "P5"],
      probability: 1.0,
      costEffect: costs.cyber.base * costs.cyber.cascade * params.costMultiplier * 0.5,
      cascade: true,
      costReduction: cyberMitFactor,
    },
    {
      id: "T5", phase: "cascade",
      inputs: ["P5", "P7"], outputs: ["P5", "P8"],
      probability: 1.0,
      costEffect: costs.cyber.base * costs.cyber.cascade * params.costMultiplier * 0.25,
      cascade: true,
      costReduction: cyberMitFactor,
    },
    {
      id: "T6", phase: "recovery",
      inputs: ["P2"], outputs: ["P3"],
      probability: 1 / params.recoveryFactor,
      costEffect: 0,
    },
    {
      id: "T7", phase: "recovery",
      inputs: ["P5"], outputs: ["P6"],
      probability: 1 / params.recoveryFactor,
      costEffect: 0,
    },
    {
      id: "T8", phase: "recovery",
      inputs: ["P8"], outputs: ["P9"],
      probability: 1 / params.recoveryFactor,
      costEffect: 0,
    },
    {
      id: "T9", phase: "restore",
      inputs: ["P3"], outputs: ["P1", "P10"],
      probability: 1.0,
      costEffect: 0,
    },
    {
      id: "T10", phase: "restore",
      inputs: ["P6"], outputs: ["P4"],
      probability: 1.0,
      costEffect: 0,
    },
    {
      id: "T11", phase: "restore",
      inputs: ["P9"], outputs: ["P7"],
      probability: 1.0,
      costEffect: 0,
    },
  ];
}

// ---------------------------------------------------------------------------
// Iteration runner: day-by-day token simulation
// ---------------------------------------------------------------------------

/**
 * Check if a transition is enabled: all input places must hold a token.
 */
function isEnabled(state: PetriNetState, rule: TransitionRule): boolean {
  return rule.inputs.every(place => hasToken(state, place));
}

/**
 * Fire a transition: remove tokens from inputs, add tokens to outputs.
 */
function fireTransition(state: PetriNetState, rule: TransitionRule): void {
  for (const place of rule.inputs) {
    removeToken(state, place);
  }
  for (const place of rule.outputs) {
    addToken(state, place);
  }
}

/**
 * Compute the actual cost when a transition fires.
 * If the transition has inhibitors and any inhibitor place holds a token,
 * the costReduction factor is applied (reducing cost). Otherwise full cost.
 */
function computeTransitionCost(state: PetriNetState, rule: TransitionRule): number {
  if (rule.costEffect === 0) return 0;

  if (rule.inhibitors && rule.inhibitors.length > 0 && rule.costReduction !== undefined) {
    const anyInhibitorActive = rule.inhibitors.some(place => hasToken(state, place));
    if (anyInhibitorActive) {
      return rule.costEffect * rule.costReduction;
    }
  }

  return rule.costEffect;
}

const PHASE_ORDER: Array<"disruption" | "cascade" | "recovery" | "restore"> = [
  "disruption", "cascade", "recovery", "restore",
];

/**
 * Step the Petri net state forward by one day using phase-based evaluation.
 *
 * Each phase collects enabled transitions from a state snapshot, then applies
 * all firing decisions atomically before moving to the next phase. This prevents
 * recovery from occurring on the same day as disruption and ensures multi-input
 * transitions are checked against a consistent state.
 *
 * Phase order: disruption → cascade → recovery → restore
 *
 * @returns Total cost incurred this day
 */
function stepDay(state: PetriNetState, transitions: TransitionRule[]): number {
  let dayCost = 0;

  for (const phase of PHASE_ORDER) {
    const phaseRules = transitions.filter(r => r.phase === phase);
    if (phaseRules.length === 0) continue;

    const toFire: TransitionRule[] = [];

    for (const rule of phaseRules) {
      if (!isEnabled(state, rule)) continue;

      if (rule.probability >= 1.0) {
        toFire.push(rule);
      } else if (Math.random() < rule.probability) {
        toFire.push(rule);
      }
    }

    for (const rule of toFire) {
      if (!isEnabled(state, rule)) continue;
      dayCost += computeTransitionCost(state, rule);
      fireTransition(state, rule);
    }
  }

  return dayCost;
}

/**
 * Simulate a single Monte Carlo iteration using Petri net token traversal.
 *
 * For each day the state vector is advanced through four phases:
 *   1. Disruption: probabilistic firing of physical/cyber attack transitions
 *   2. Cascade: deterministic propagation to downstream tiers (requires upstream disrupted + downstream normal)
 *   3. Recovery: probabilistic transition from Disrupted → Recovery (rate = 1/recoveryFactor)
 *   4. Restore: deterministic transition from Recovery → Normal
 *
 * Costs accumulate based on which transitions fire and whether mitigation
 * inhibitors are active (reducing cost via costReduction factor).
 *
 * @param days - Number of simulation days
 * @param params - Simulation parameters (probabilities, cost multiplier, recovery factor)
 * @param activeMitigations - Set of active mitigation types
 * @param configs - Mitigation configuration with reduction factors
 * @param costs - Per-category disruption costs (base + cascade multiplier)
 * @returns Total accumulated cost for each model variant
 */
function runIteration(
  days: number,
  params: Parameters,
  activeMitigations: Set<MitigationType>,
  configs: MitigationConfigs,
  costs: { cyber: DisruptionCosts; physical: DisruptionCosts; external: DisruptionCosts }
): { standard: number; integrated: number; mitigated: number } {
  const stdState = createState(STANDARD_PLACES, STANDARD_INITIAL);
  const intState = createState(INTEGRATED_PLACES, INTEGRATED_INITIAL);
  const mitState = createState(MITIGATED_PLACES, buildMitigatedInitial(activeMitigations));

  const stdTransitions = buildStandardTransitions(params, costs);
  const intTransitions = buildIntegratedTransitions(params, costs);
  const mitTransitions = buildMitigatedTransitions(params, costs, activeMitigations, configs);

  let standardCost = 0;
  let integratedCost = 0;
  let mitigatedCost = 0;

  for (let day = 0; day < days; day++) {
    standardCost += stepDay(stdState, stdTransitions);
    integratedCost += stepDay(intState, intTransitions);
    mitigatedCost += stepDay(mitState, mitTransitions);
  }

  return { standard: standardCost, integrated: integratedCost, mitigated: mitigatedCost };
}

// ---------------------------------------------------------------------------
// Public API — signature unchanged
// ---------------------------------------------------------------------------

/**
 * Execute the full Monte Carlo simulation using Petri net state traversal.
 *
 * Each iteration initializes token state vectors for three model variants
 * (standard, integrated, mitigated), then simulates day-by-day token movement
 * through probabilistic transition firing. Costs accumulate based on which
 * disruption transitions fire during the simulation period.
 *
 * Complexity: O(iterations × days × transitions) — linear, no state explosion.
 *
 * @param config - Simulation configuration (iterations, days, parameters, mitigations, scenario)
 * @returns Aggregated statistics across all iterations for each model variant
 */
export function runMonteCarloSimulation(config: MonteCarloConfig): MonteCarloResults {
  const { iterations, days, parameters, activeMitigations, mitigationConfigs, scenario } = config;

  const costs = {
    cyber: getDisruptionCosts(scenario, "cyber"),
    physical: getDisruptionCosts(scenario, "physical"),
    external: getDisruptionCosts(scenario, "external"),
  };

  const standardCosts: number[] = [];
  const integratedCosts: number[] = [];
  const mitigatedCosts: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const result = runIteration(days, parameters, activeMitigations, mitigationConfigs, costs);
    standardCosts.push(result.standard);
    integratedCosts.push(result.integrated);
    mitigatedCosts.push(result.mitigated);
  }

  const hiddenRiskPercents = standardCosts.map((std, i) =>
    std > 0 ? ((integratedCosts[i] - std) / std) * 100 : 0
  );

  const computeStats = (values: number[]): ModelStats => ({
    mean: mean(values),
    std: standardDeviation(values),
    min: Math.min(...values),
    max: Math.max(...values),
  });

  return {
    iterations,
    days,
    standardCosts,
    integratedCosts,
    mitigatedCosts,
    standard: computeStats(standardCosts),
    integrated: computeStats(integratedCosts),
    mitigated: computeStats(mitigatedCosts),
    hiddenRisk: {
      mean: mean(hiddenRiskPercents),
      ci95: confidenceInterval(hiddenRiskPercents, 0.95),
    },
    hiddenRiskPercents,
  };
}