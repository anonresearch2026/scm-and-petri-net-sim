import { useState, useCallback, useRef, useEffect } from "react";
import type {
  Parameters,
  MitigationType,
  MitigationConfigs,
  PetriNetModel,
  SimulationResults,
  ScenarioConfig,
} from "@shared/schema";
import { DEFAULT_PARAMETERS, DEFAULT_MITIGATION_CONFIGS } from "@shared/schema";
import { buildParametersFromScenario, buildMitigationConfigsFromScenario } from "@/lib/scenario-builder";
import { DEFAULT_DISRUPTION_COSTS } from "@/lib/constants";

const MITIGATION_PLACE_MAP: Record<MitigationType, string> = {
  backup: 'M1',
  firewall: 'M2',
  buffer: 'M3',
  dual: 'M4',
  maintenance: 'M5',
  redundancy: 'M6',
};

type DisruptionType = "ransomware" | "equipment" | "supplier";

interface DisruptionConfig {
  transitionId: string;
  normalPlaceId: string;
  disruptedPlaceId: string;
  cyberPlaceId: string;
  baseCost: number;
  cascadeMultiplier: number;
  probability: (p: Parameters) => number;
  mitigationKeys: Array<{ type: MitigationType; key: string }>;
  cascadeSteps?: Array<{
    transitionId: string;
    normalPlaceId: string;
    disruptedPlaceId: string;
  }>;
}

const DISRUPTION_CONFIGS: Record<DisruptionType, DisruptionConfig> = {
  ransomware: {
    transitionId: 'T1',
    normalPlaceId: 'P1',
    disruptedPlaceId: 'P2',
    cyberPlaceId: 'P10',
    baseCost: DEFAULT_DISRUPTION_COSTS.cyber.base,
    cascadeMultiplier: DEFAULT_DISRUPTION_COSTS.cyber.cascadeMultiplier,
    probability: (p) => p.ransomwareProb,
    mitigationKeys: [
      { type: 'backup', key: 'ransomwareReduction' },
      { type: 'firewall', key: 'ransomwareReduction' },
    ],
    cascadeSteps: [
      { transitionId: 'T4', normalPlaceId: 'P4', disruptedPlaceId: 'P5' },
      { transitionId: 'T5', normalPlaceId: 'P7', disruptedPlaceId: 'P8' },
    ],
  },
  equipment: {
    transitionId: 'T2',
    normalPlaceId: 'P4',
    disruptedPlaceId: 'P5',
    cyberPlaceId: 'P11',
    baseCost: DEFAULT_DISRUPTION_COSTS.physical.base,
    cascadeMultiplier: DEFAULT_DISRUPTION_COSTS.physical.cascadeMultiplier,
    probability: (p) => p.equipmentProb,
    mitigationKeys: [
      { type: 'maintenance', key: 'equipmentReduction' },
      { type: 'redundancy', key: 'equipmentReduction' },
    ],
  },
  supplier: {
    transitionId: 'T3',
    normalPlaceId: 'P7',
    disruptedPlaceId: 'P8',
    cyberPlaceId: 'P12',
    baseCost: DEFAULT_DISRUPTION_COSTS.external.base,
    cascadeMultiplier: DEFAULT_DISRUPTION_COSTS.external.cascadeMultiplier,
    probability: (p) => p.supplierProb,
    mitigationKeys: [
      { type: 'dual', key: 'supplierReduction' },
      { type: 'buffer', key: 'supplierReduction' },
    ],
  },
};

function createStandardModel(): PetriNetModel {
  return {
    places: [
      { id: 'P1', x: 150, y: 200, tokens: 1, label: 'P\u2081', name: 'Mfg Normal', type: 'normal' },
      { id: 'P2', x: 150, y: 350, tokens: 0, label: 'P\u2082', name: 'Mfg Disrupted', type: 'disrupted' },
      { id: 'P3', x: 150, y: 500, tokens: 0, label: 'P\u2083', name: 'Mfg Recovery', type: 'recovery' },
      { id: 'P4', x: 300, y: 200, tokens: 1, label: 'P\u2084', name: 'Dist Normal', type: 'normal' },
      { id: 'P5', x: 300, y: 350, tokens: 0, label: 'P\u2085', name: 'Dist Disrupted', type: 'disrupted' },
      { id: 'P6', x: 300, y: 500, tokens: 0, label: 'P\u2086', name: 'Dist Recovery', type: 'recovery' },
      { id: 'P7', x: 450, y: 200, tokens: 1, label: 'P\u2087', name: 'Cust Normal', type: 'normal' },
      { id: 'P8', x: 450, y: 350, tokens: 0, label: 'P\u2088', name: 'Cust Impacted', type: 'disrupted' },
      { id: 'P9', x: 450, y: 500, tokens: 0, label: 'P\u2089', name: 'Cust Recovery', type: 'recovery' },
    ],
    transitions: [
      { id: 'T1', x: 150, y: 275, label: 'T\u2081', name: 'Physical Fail', enabled: false },
      { id: 'T2', x: 300, y: 275, label: 'T\u2082', name: 'Physical Fail', enabled: false },
      { id: 'T3', x: 450, y: 275, label: 'T\u2083', name: 'Impact', enabled: false },
      { id: 'T6', x: 150, y: 425, label: 'T\u2086', name: 'Begin Recovery', enabled: false },
      { id: 'T7', x: 300, y: 425, label: 'T\u2087', name: 'Begin Recovery', enabled: false },
      { id: 'T8', x: 450, y: 425, label: 'T\u2088', name: 'Begin Recovery', enabled: false },
      { id: 'T9', x: 150, y: 575, label: 'T\u2089', name: 'Restore', enabled: false },
      { id: 'T10', x: 300, y: 575, label: 'T\u2081\u2080', name: 'Restore', enabled: false },
      { id: 'T11', x: 450, y: 575, label: 'T\u2081\u2081', name: 'Restore', enabled: false },
    ],
  };
}

function createIntegratedModel(): PetriNetModel {
  return {
    places: [
      { id: 'P1', x: 150, y: 200, tokens: 1, label: 'P\u2081', name: 'Mfg Normal', type: 'normal' },
      { id: 'P2', x: 150, y: 350, tokens: 0, label: 'P\u2082', name: 'Mfg Disrupted', type: 'disrupted' },
      { id: 'P3', x: 150, y: 500, tokens: 0, label: 'P\u2083', name: 'Mfg Recovery', type: 'recovery' },
      { id: 'P4', x: 300, y: 200, tokens: 1, label: 'P\u2084', name: 'Dist Normal', type: 'normal' },
      { id: 'P5', x: 300, y: 350, tokens: 0, label: 'P\u2085', name: 'Dist Disrupted', type: 'disrupted' },
      { id: 'P6', x: 300, y: 500, tokens: 0, label: 'P\u2086', name: 'Dist Recovery', type: 'recovery' },
      { id: 'P7', x: 450, y: 200, tokens: 1, label: 'P\u2087', name: 'Cust Normal', type: 'normal' },
      { id: 'P8', x: 450, y: 350, tokens: 0, label: 'P\u2088', name: 'Cust Impacted', type: 'disrupted' },
      { id: 'P9', x: 450, y: 500, tokens: 0, label: 'P\u2089', name: 'Cust Recovery', type: 'recovery' },
      { id: 'P10', x: 150, y: 80, tokens: 1, label: 'P\u2081\u2080', name: 'IT Systems', type: 'cyber' },
      { id: 'P11', x: 300, y: 80, tokens: 1, label: 'P\u2081\u2081', name: 'Production Sys', type: 'cyber' },
      { id: 'P12', x: 450, y: 80, tokens: 1, label: 'P\u2081\u2082', name: 'Logistics Sys', type: 'cyber' },
    ],
    transitions: [
      { id: 'T1', x: 150, y: 275, label: 'T\u2081', name: 'FTA: Ransomware', fta: true, enabled: false },
      { id: 'T2', x: 300, y: 275, label: 'T\u2082', name: 'FTA: Equipment', fta: true, enabled: false },
      { id: 'T3', x: 450, y: 275, label: 'T\u2083', name: 'FTA: Supplier', fta: true, enabled: false },
      { id: 'T4', x: 225, y: 350, label: 'T\u2084', name: 'Cyber Cascade', enabled: false },
      { id: 'T5', x: 375, y: 350, label: 'T\u2085', name: 'Cascade Spread', enabled: false },
      { id: 'T6', x: 150, y: 425, label: 'T\u2086', name: 'Begin Recovery', enabled: false },
      { id: 'T7', x: 300, y: 425, label: 'T\u2087', name: 'Begin Recovery', enabled: false },
      { id: 'T8', x: 450, y: 425, label: 'T\u2088', name: 'Begin Recovery', enabled: false },
      { id: 'T9', x: 150, y: 575, label: 'T\u2089', name: 'Restore', enabled: false },
      { id: 'T10', x: 300, y: 575, label: 'T\u2081\u2080', name: 'Restore', enabled: false },
      { id: 'T11', x: 450, y: 575, label: 'T\u2081\u2081', name: 'Restore', enabled: false },
      { id: 'T12', x: 225, y: 140, label: 'T\u2081\u2082', name: 'Cyber Attack', cyber: true, enabled: false },
      { id: 'T13', x: 375, y: 140, label: 'T\u2081\u2083', name: 'Lateral Move', cyber: true, enabled: false },
    ],
  };
}

function createMitigatedModel(): PetriNetModel {
  const integrated = createIntegratedModel();
  return {
    ...integrated,
    places: [
      ...integrated.places,
      { id: 'M1', x: 75, y: 80, tokens: 0, label: 'M\u2081', name: 'Backup', type: 'mitigation' },
      { id: 'M2', x: 525, y: 80, tokens: 0, label: 'M\u2082', name: 'Firewall', type: 'mitigation' },
      { id: 'M3', x: 75, y: 350, tokens: 0, label: 'M\u2083', name: 'Buffer', type: 'mitigation' },
      { id: 'M4', x: 525, y: 350, tokens: 0, label: 'M\u2084', name: 'Dual Src', type: 'mitigation' },
      { id: 'M5', x: 225, y: 600, tokens: 0, label: 'M\u2085', name: 'Maint.', type: 'mitigation' },
      { id: 'M6', x: 375, y: 600, tokens: 0, label: 'M\u2086', name: 'Redund.', type: 'mitigation' },
    ],
  };
}

export interface TokenAnimation {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  progress: number;
  modelType: 'standard' | 'integrated' | 'mitigated';
}

export type UseSimulationReturn = ReturnType<typeof useSimulation>;

export function useSimulation() {
  const [parameters, setParameters] = useState<Parameters>(DEFAULT_PARAMETERS);
  const [activeMitigations, setActiveMitigations] = useState<Set<MitigationType>>(new Set());
  const [mitigationConfigs, setMitigationConfigs] = useState<MitigationConfigs>(DEFAULT_MITIGATION_CONFIGS);
  const [scenario, setScenario] = useState<ScenarioConfig | null>(null);

  const [standardModel, setStandardModel] = useState<PetriNetModel>(createStandardModel());
  const [integratedModel, setIntegratedModel] = useState<PetriNetModel>(createIntegratedModel());
  const [mitigatedModel, setMitigatedModel] = useState<PetriNetModel>(createMitigatedModel());

  const [results, setResults] = useState<SimulationResults>({
    day: 0,
    ftaProbability: 0,
    cascadeCount: 0,
    standardCost: 0,
    integratedCost: 0,
    mitigatedCost: 0,
    hiddenRisk: 0,
    activeMitigations: 0,
    mitigationCost: 0,
    mitigationSavings: 0,
  });

  const [isSimulating, setIsSimulating] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [tokenAnimations, setTokenAnimations] = useState<TokenAnimation[]>([]);

  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateParameter = useCallback((key: keyof Parameters, value: number) => {
    setParameters(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleMitigation = useCallback((type: MitigationType) => {
    setActiveMitigations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  }, []);

  useEffect(() => {
    setMitigatedModel(prev => ({
      ...prev,
      places: prev.places.map(p => {
        if (p.id.startsWith('M')) {
          const mitigationType = Object.entries(MITIGATION_PLACE_MAP)
            .find(([_, placeId]) => placeId === p.id)?.[0] as MitigationType | undefined;
          if (mitigationType) {
            return { ...p, tokens: activeMitigations.has(mitigationType) ? 1 : 0 };
          }
        }
        return p;
      }),
    }));
  }, [activeMitigations]);

  const loadScenario = useCallback((config: ScenarioConfig) => {
    setScenario(config);
    const newParams = buildParametersFromScenario(config);
    setParameters(newParams);
    const newMitConfigs = buildMitigationConfigsFromScenario(config);
    setMitigationConfigs(newMitConfigs);
    const activeMits = new Set<MitigationType>();
    (Object.keys(newMitConfigs) as MitigationType[]).forEach(key => {
      if (newMitConfigs[key].cost > 0) {
        activeMits.add(key);
      }
    });
    setActiveMitigations(activeMits);
  }, []);

  const clearScenario = useCallback(() => {
    setScenario(null);
    setParameters(DEFAULT_PARAMETERS);
    setMitigationConfigs(DEFAULT_MITIGATION_CONFIGS);
    setActiveMitigations(new Set());
  }, []);

  const getMitigationTotalCost = useCallback(() => {
    let total = 0;
    activeMitigations.forEach(type => {
      total += mitigationConfigs[type].cost;
    });
    return total;
  }, [activeMitigations, mitigationConfigs]);

  const updatePlaceTokens = useCallback((
    modelSetter: React.Dispatch<React.SetStateAction<PetriNetModel>>,
    placeId: string,
    tokens: number
  ) => {
    modelSetter(prev => ({
      ...prev,
      places: prev.places.map(p => p.id === placeId ? { ...p, tokens } : p),
    }));
  }, []);

  const updateTransitionEnabled = useCallback((
    modelSetter: React.Dispatch<React.SetStateAction<PetriNetModel>>,
    transitionId: string,
    enabled: boolean
  ) => {
    modelSetter(prev => ({
      ...prev,
      transitions: prev.transitions.map(t => t.id === transitionId ? { ...t, enabled } : t),
    }));
  }, []);

  /**
   * Unified disruption trigger. Fires the specified disruption type
   * across all three models and updates cost results accordingly.
   */
  const triggerDisruption = useCallback((type: DisruptionType) => {
    const config = DISRUPTION_CONFIGS[type];
    const { baseCost, cascadeMultiplier } = config;

    let mitigatedCostValue = baseCost;
    for (const { type: mitType, key } of config.mitigationKeys) {
      if (activeMitigations.has(mitType)) {
        const reduction = (mitigationConfigs[mitType] as Record<string, number>)[key] || 0;
        mitigatedCostValue *= (1 - reduction);
      }
    }

    updateTransitionEnabled(setStandardModel, config.transitionId, true);
    updateTransitionEnabled(setIntegratedModel, config.transitionId, true);
    updateTransitionEnabled(setMitigatedModel, config.transitionId, true);

    updatePlaceTokens(setStandardModel, config.normalPlaceId, 0);
    updatePlaceTokens(setStandardModel, config.disruptedPlaceId, 1);

    updatePlaceTokens(setIntegratedModel, config.normalPlaceId, 0);
    updatePlaceTokens(setIntegratedModel, config.disruptedPlaceId, 1);
    updatePlaceTokens(setIntegratedModel, config.cyberPlaceId, 0);

    updatePlaceTokens(setMitigatedModel, config.normalPlaceId, 0);
    updatePlaceTokens(setMitigatedModel, config.disruptedPlaceId, 1);
    updatePlaceTokens(setMitigatedModel, config.cyberPlaceId, 0);

    if (config.cascadeSteps) {
      const steps = config.cascadeSteps;
      let delay = parameters.cascadeDelay / animationSpeed;

      steps.forEach((step, idx) => {
        setTimeout(() => {
          updateTransitionEnabled(setIntegratedModel, step.transitionId, true);
          updateTransitionEnabled(setMitigatedModel, step.transitionId, true);
          updatePlaceTokens(setIntegratedModel, step.normalPlaceId, 0);
          updatePlaceTokens(setIntegratedModel, step.disruptedPlaceId, 1);
          updatePlaceTokens(setMitigatedModel, step.normalPlaceId, 0);
          updatePlaceTokens(setMitigatedModel, step.disruptedPlaceId, 1);
        }, delay * (idx + 1));
      });
    }

    const intCost = baseCost * cascadeMultiplier;
    const mitCost = mitigatedCostValue * cascadeMultiplier;
    const cascadeCount = config.cascadeSteps ? config.cascadeSteps.length : 0;

    setResults(prev => ({
      ...prev,
      ftaProbability: config.probability(parameters),
      cascadeCount: prev.cascadeCount + cascadeCount,
      standardCost: prev.standardCost + baseCost * parameters.costMultiplier,
      integratedCost: prev.integratedCost + intCost * parameters.costMultiplier,
      mitigatedCost: prev.mitigatedCost + mitCost * parameters.costMultiplier,
      hiddenRisk: ((intCost - baseCost) / baseCost) * 100,
      mitigationSavings: prev.mitigationSavings + (intCost - mitCost) * parameters.costMultiplier,
    }));
  }, [parameters, activeMitigations, mitigationConfigs, animationSpeed, updatePlaceTokens, updateTransitionEnabled]);

  const triggerRansomware = useCallback(() => triggerDisruption("ransomware"), [triggerDisruption]);
  const triggerEquipment = useCallback(() => triggerDisruption("equipment"), [triggerDisruption]);
  const triggerSupplier = useCallback(() => triggerDisruption("supplier"), [triggerDisruption]);

  const stepSimulation = useCallback(() => {
    if (Math.random() < parameters.ransomwareProb) triggerRansomware();
    if (Math.random() < parameters.equipmentProb) triggerEquipment();
    if (Math.random() < parameters.supplierProb) triggerSupplier();

    setResults(prev => ({
      ...prev,
      day: prev.day + 1,
      activeMitigations: activeMitigations.size,
      mitigationCost: getMitigationTotalCost(),
    }));
  }, [parameters, triggerRansomware, triggerEquipment, triggerSupplier, activeMitigations, getMitigationTotalCost]);

  const runSimulation = useCallback((days: number = 30) => {
    if (isSimulating) return;
    setIsSimulating(true);
    let currentDay = 0;

    simulationIntervalRef.current = setInterval(() => {
      if (currentDay >= days) {
        if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
        setIsSimulating(false);
        return;
      }
      stepSimulation();
      currentDay++;
    }, 1000 / animationSpeed);
  }, [isSimulating, stepSimulation, animationSpeed]);

  const stopSimulation = useCallback(() => {
    if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
    setIsSimulating(false);
  }, []);

  const resetAll = useCallback(() => {
    stopSimulation();
    setStandardModel(createStandardModel());
    setIntegratedModel(createIntegratedModel());
    const freshMitigatedModel = createMitigatedModel();
    freshMitigatedModel.places = freshMitigatedModel.places.map(p => {
      if (p.id.startsWith('M')) {
        const mitigationType = Object.entries(MITIGATION_PLACE_MAP)
          .find(([_, placeId]) => placeId === p.id)?.[0] as MitigationType | undefined;
        if (mitigationType) {
          return { ...p, tokens: activeMitigations.has(mitigationType) ? 1 : 0 };
        }
      }
      return p;
    });
    setMitigatedModel(freshMitigatedModel);
    setResults({
      day: 0,
      ftaProbability: 0,
      cascadeCount: 0,
      standardCost: 0,
      integratedCost: 0,
      mitigatedCost: 0,
      hiddenRisk: 0,
      activeMitigations: activeMitigations.size,
      mitigationCost: getMitigationTotalCost(),
      mitigationSavings: 0,
    });
    setTokenAnimations([]);
  }, [stopSimulation, activeMitigations, getMitigationTotalCost]);

  const compareModels = useCallback(() => {
    const diff = results.integratedCost - results.standardCost;
    const percent = results.standardCost > 0 ? (diff / results.standardCost) * 100 : 0;
    return {
      difference: diff,
      percentDifference: percent,
      mitigationSavings: results.mitigationSavings,
    };
  }, [results]);

  return {
    parameters,
    updateParameter,
    activeMitigations,
    toggleMitigation,
    mitigationConfigs,
    standardModel,
    integratedModel,
    mitigatedModel,
    results,
    isSimulating,
    animationSpeed,
    setAnimationSpeed,
    tokenAnimations,
    getMitigationTotalCost,
    triggerRansomware,
    triggerEquipment,
    triggerSupplier,
    stepSimulation,
    runSimulation,
    stopSimulation,
    resetAll,
    compareModels,
    scenario,
    loadScenario,
    clearScenario,
  };
}
