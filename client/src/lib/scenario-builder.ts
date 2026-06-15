import type {
  ScenarioConfig,
  Parameters,
  MitigationConfigs,
  MitigationConfig,
  MitigationType,
  RiskEvent,
  MitigationStrategy,
} from "@shared/schema";

function aggregateProbability(risks: { probability: number }[]): number {
  if (risks.length === 0) return 0;
  return 1 - risks.reduce((acc, r) => acc * (1 - r.probability), 1);
}

export function buildParametersFromScenario(scenario: ScenarioConfig): Parameters {
  const cyberRisks = scenario.risks.filter(r => r.category === "cyber");
  const physicalRisks = scenario.risks.filter(r => r.category === "physical" || r.category === "operational");
  const externalRisks = scenario.risks.filter(r => r.category === "external");

  return {
    ransomwareProb: aggregateProbability(cyberRisks),
    equipmentProb: aggregateProbability(physicalRisks),
    supplierProb: aggregateProbability(externalRisks),
    cascadeDelay: 800,
    recoveryFactor: scenario.settings?.recoveryFactor ?? 3,
    costMultiplier: scenario.settings?.costMultiplier ?? 1.0,
  };
}

function mapToBuiltInMitigation(
  mit: MitigationStrategy,
  risks: RiskEvent[]
): { type: MitigationType; config: MitigationConfig } | null {
  const cyberMit = mit.mitigates.some(m => {
    const risk = risks.find(r => r.id === m.riskId);
    return risk?.category === "cyber";
  });

  const physicalMit = mit.mitigates.some(m => {
    const risk = risks.find(r => r.id === m.riskId);
    return risk?.category === "physical" || risk?.category === "operational";
  });

  if (mit.bufferDays) {
    return {
      type: "buffer",
      config: {
        cost: mit.monthlyCost,
        supplierReduction: mit.mitigates[0]?.reductionFactor ?? 0.5,
        bufferDays: mit.bufferDays,
      },
    };
  }

  if (cyberMit && mit.name.toLowerCase().includes("backup")) {
    return {
      type: "backup",
      config: {
        cost: mit.monthlyCost,
        ransomwareReduction: mit.mitigates[0]?.reductionFactor ?? 0.4,
      },
    };
  }

  if (cyberMit) {
    return {
      type: "firewall",
      config: {
        cost: mit.monthlyCost,
        ransomwareReduction: mit.mitigates[0]?.reductionFactor ?? 0.35,
      },
    };
  }

  if (physicalMit && mit.name.toLowerCase().includes("maintenance")) {
    return {
      type: "maintenance",
      config: {
        cost: mit.monthlyCost,
        equipmentReduction: mit.mitigates[0]?.reductionFactor ?? 0.7,
      },
    };
  }

  if (physicalMit) {
    return {
      type: "redundancy",
      config: {
        cost: mit.monthlyCost,
        equipmentReduction: mit.mitigates[0]?.reductionFactor ?? 0.8,
      },
    };
  }

  return {
    type: "dual",
    config: {
      cost: mit.monthlyCost,
      supplierReduction: mit.mitigates[0]?.reductionFactor ?? 0.5,
    },
  };
}

export function buildMitigationConfigsFromScenario(
  scenario: ScenarioConfig
): MitigationConfigs {
  const configs: MitigationConfigs = {
    backup: { cost: 0 },
    firewall: { cost: 0 },
    buffer: { cost: 0 },
    dual: { cost: 0 },
    maintenance: { cost: 0 },
    redundancy: { cost: 0 },
  };

  for (const mit of scenario.mitigations) {
    const mapped = mapToBuiltInMitigation(mit, scenario.risks);
    if (mapped) {
      configs[mapped.type] = mapped.config;
    }
  }

  return configs;
}
