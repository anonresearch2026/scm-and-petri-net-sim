import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Zap, Wrench, Truck, ChevronRight, Download } from "lucide-react";

interface ControlsPanelProps {
  isSimulating: boolean;
  onRunSimulation: () => void;
  onStopSimulation: () => void;
  onTriggerRansomware: () => void;
  onTriggerEquipment: () => void;
  onTriggerSupplier: () => void;
  onStepSimulation: () => void;
  onExportData: () => void;
  onResetAll: () => void;
}

export function ControlsPanel({
  isSimulating,
  onRunSimulation,
  onStopSimulation,
  onTriggerRansomware,
  onTriggerEquipment,
  onTriggerSupplier,
  onStepSimulation,
  onExportData,
  onResetAll,
}: ControlsPanelProps) {
  return (
    <div className="bg-gradient-to-b from-gray-50 to-gray-100 border border-gray-300 rounded-lg p-6 mb-6 shadow-sm">
      <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Play className="w-4 h-4" />
        Simulation Controls
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Button
          onClick={isSimulating ? onStopSimulation : onRunSimulation}
          variant={isSimulating ? "destructive" : "default"}
          className="flex items-center gap-2"
          data-testid="button-run-simulation"
        >
          {isSimulating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {isSimulating ? 'Stop' : 'Animate Demo'}
        </Button>

        <Button
          onClick={onTriggerRansomware}
          variant="outline"
          className="flex items-center gap-2"
          disabled={isSimulating}
          data-testid="button-trigger-ransomware"
        >
          <Zap className="w-4 h-4" />
          Ransomware
        </Button>

        <Button
          onClick={onTriggerEquipment}
          variant="outline"
          className="flex items-center gap-2"
          disabled={isSimulating}
          data-testid="button-trigger-equipment"
        >
          <Wrench className="w-4 h-4" />
          Equipment
        </Button>

        <Button
          onClick={onTriggerSupplier}
          variant="outline"
          className="flex items-center gap-2"
          disabled={isSimulating}
          data-testid="button-trigger-supplier"
        >
          <Truck className="w-4 h-4" />
          Supplier
        </Button>

        <Button
          onClick={onStepSimulation}
          variant="outline"
          className="flex items-center gap-2"
          disabled={isSimulating}
          data-testid="button-step"
        >
          <ChevronRight className="w-4 h-4" />
          Step
        </Button>

        <Button
          onClick={onExportData}
          variant="outline"
          className="flex items-center gap-2"
          data-testid="button-export"
        >
          <Download className="w-4 h-4" />
          Export
        </Button>

        <Button
          onClick={onResetAll}
          variant="outline"
          className="flex items-center gap-2"
          data-testid="button-reset"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </Button>
      </div>
    </div>
  );
}
