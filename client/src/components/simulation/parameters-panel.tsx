import { Slider } from "@/components/ui/slider";
import type { Parameters } from "@shared/schema";

interface ParametersPanelProps {
  parameters: Parameters;
  onUpdateParameter: (key: keyof Parameters, value: number) => void;
}

export function ParametersPanel({ parameters, onUpdateParameter }: ParametersPanelProps) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 mb-6">
      <h3 className="text-base font-semibold text-gray-800 mb-5">Adjustable Risk Parameters</h3>
      
      <div className="bg-white p-4 mb-5 rounded border border-gray-200">
        <p className="text-sm text-gray-600 leading-relaxed">
          <strong className="text-gray-800">Configure your risk model:</strong> Adjust these parameters to simulate different risk scenarios.
        </p>
        <ul className="mt-2 text-sm text-gray-600 space-y-1">
          <li><strong>Probabilities (%):</strong> Daily chance of each disruption occurring</li>
          <li><strong>Cascade Delay:</strong> How quickly disruptions spread between nodes</li>
          <li><strong>Recovery Factor:</strong> Multiplier for recovery time</li>
          <li><strong>Cost Multiplier:</strong> Scale all financial impacts</li>
        </ul>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-500 font-medium">Ransomware Probability (%)</label>
          <div className="flex items-center gap-3">
            <Slider
              value={[parameters.ransomwareProb * 100]}
              min={0}
              max={10}
              step={0.5}
              onValueChange={([v]) => onUpdateParameter('ransomwareProb', v / 100)}
              className="flex-1"
              data-testid="slider-ransomware"
            />
            <span className="min-w-[60px] text-right font-mono text-sm text-gray-700 font-semibold">
              {(parameters.ransomwareProb * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-500 font-medium">Equipment Failure Probability (%)</label>
          <div className="flex items-center gap-3">
            <Slider
              value={[parameters.equipmentProb * 100]}
              min={0}
              max={15}
              step={0.5}
              onValueChange={([v]) => onUpdateParameter('equipmentProb', v / 100)}
              className="flex-1"
              data-testid="slider-equipment"
            />
            <span className="min-w-[60px] text-right font-mono text-sm text-gray-700 font-semibold">
              {(parameters.equipmentProb * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-500 font-medium">Supplier Disruption Probability (%)</label>
          <div className="flex items-center gap-3">
            <Slider
              value={[parameters.supplierProb * 100]}
              min={0}
              max={5}
              step={0.1}
              onValueChange={([v]) => onUpdateParameter('supplierProb', v / 100)}
              className="flex-1"
              data-testid="slider-supplier"
            />
            <span className="min-w-[60px] text-right font-mono text-sm text-gray-700 font-semibold">
              {(parameters.supplierProb * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-500 font-medium">Cascade Delay (ms)</label>
          <div className="flex items-center gap-3">
            <Slider
              value={[parameters.cascadeDelay]}
              min={200}
              max={2000}
              step={100}
              onValueChange={([v]) => onUpdateParameter('cascadeDelay', v)}
              className="flex-1"
              data-testid="slider-cascade"
            />
            <span className="min-w-[60px] text-right font-mono text-sm text-gray-700 font-semibold">
              {parameters.cascadeDelay}ms
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-500 font-medium">Recovery Factor</label>
          <div className="flex items-center gap-3">
            <Slider
              value={[parameters.recoveryFactor]}
              min={1}
              max={5}
              step={0.5}
              onValueChange={([v]) => onUpdateParameter('recoveryFactor', v)}
              className="flex-1"
              data-testid="slider-recovery"
            />
            <span className="min-w-[60px] text-right font-mono text-sm text-gray-700 font-semibold">
              {parameters.recoveryFactor}x
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-500 font-medium">Cost Multiplier</label>
          <div className="flex items-center gap-3">
            <Slider
              value={[parameters.costMultiplier]}
              min={0.5}
              max={3}
              step={0.1}
              onValueChange={([v]) => onUpdateParameter('costMultiplier', v)}
              className="flex-1"
              data-testid="slider-cost"
            />
            <span className="min-w-[60px] text-right font-mono text-sm text-gray-700 font-semibold">
              {parameters.costMultiplier.toFixed(1)}x
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
