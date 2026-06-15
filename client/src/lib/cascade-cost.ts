/**
 * Time-dependent cascade cost model.
 *
 * Replaces the static cascade multiplier with a duration-based function
 * that escalates cost non-linearly. Three-phase piecewise model:
 *
 *   Phase 1 (0-4 hours):   Linear ramp, minimal spoilage
 *   Phase 2 (4-12 hours):  Accelerating costs, partial spoilage begins
 *   Phase 3 (12+ hours):   Asymptotic approach to ceiling, regulatory penalties
 *
 * The standard model does not use cascade costs (physical only).
 * The integrated model applies the full time-dependent function.
 * The mitigated model applies mitigation reductions to the cascade output.
 */

export interface CascadeConfig {
  baseMultiplier: number;
  maxMultiplier: number;
  phase1Hours: number;
  phase2Hours: number;
  spoilageRatePerHour: number;
  regulatoryPenalty: number;
}

export const DEFAULT_CASCADE_CONFIG: CascadeConfig = {
  baseMultiplier: 1.5,
  maxMultiplier: 4.0,
  phase1Hours: 4,
  phase2Hours: 12,
  spoilageRatePerHour: 0.08,
  regulatoryPenalty: 25000,
};

/**
 * Compute the effective cascade multiplier for a given disruption duration.
 *
 *   0 hours  -> 1.0
 *   4 hours  -> baseMultiplier (1.5)
 *   12 hours -> ~2.5
 *   24 hours -> approaching maxMultiplier (4.0)
 */
export function calculateCascadeMultiplier(
  durationHours: number,
  config: CascadeConfig = DEFAULT_CASCADE_CONFIG
): number {
  if (durationHours <= 0) return 1.0;

  const { baseMultiplier, maxMultiplier, phase1Hours, phase2Hours } = config;

  if (durationHours <= phase1Hours) {
    const t = durationHours / phase1Hours;
    return 1.0 + (baseMultiplier - 1.0) * t;
  }

  if (durationHours <= phase2Hours) {
    const t = (durationHours - phase1Hours) / (phase2Hours - phase1Hours);
    const phase2Target = baseMultiplier + (maxMultiplier - baseMultiplier) * 0.6;
    return baseMultiplier + (phase2Target - baseMultiplier) * t * t;
  }

  const overshoot = durationHours - phase2Hours;
  const phase2End = baseMultiplier + (maxMultiplier - baseMultiplier) * 0.6;
  const remaining = maxMultiplier - phase2End;
  return phase2End + remaining * (1 - Math.exp(-0.1 * overshoot));
}

/**
 * Full cascade cost calculation including spoilage and regulatory penalty.
 */
export function calculateCascadeCost(
  baseCost: number,
  durationHours: number,
  config: CascadeConfig = DEFAULT_CASCADE_CONFIG
): number {
  const multiplier = calculateCascadeMultiplier(durationHours, config);
  let cost = baseCost * multiplier;

  if (durationHours > config.phase2Hours) {
    const spoilageHours = durationHours - config.phase2Hours;
    const spoilageFraction = 1 - Math.exp(-config.spoilageRatePerHour * spoilageHours);
    cost += baseCost * spoilageFraction;
    cost += config.regulatoryPenalty;
  }

  return cost;
}

/**
 * Sample disruption duration in hours by event type.
 *
 * Ransomware: log-normal centered around 48 hours (heavy tail)
 * Equipment: exponential with mean 6 hours
 * Supplier: shifted exponential, minimum 8 hours, mean ~36 hours
 */
export function sampleDisruptionDuration(
  eventType: "ransomware" | "equipment" | "supplier"
): number {
  const u = Math.random();

  switch (eventType) {
    case "ransomware": {
      const mu = 3.87;
      const sigma = 0.8;
      const z = Math.sqrt(-2 * Math.log(Math.random())) * Math.cos(2 * Math.PI * Math.random());
      return Math.max(1, Math.exp(mu + sigma * z));
    }
    case "equipment": {
      const lambda = 1 / 6;
      return Math.max(0.5, -Math.log(1 - u) / lambda);
    }
    case "supplier": {
      const lambda = 1 / 28;
      return 8 + (-Math.log(1 - u) / lambda);
    }
  }
}
