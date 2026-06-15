import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, RefreshCw } from "lucide-react";
import type { ScenarioConfig } from "@shared/schema";

interface AnalysisBannerProps {
  scenario: ScenarioConfig | null;
  mcIterations: number;
  mcDays: number;
  mcRunning: boolean;
  onIterationsChange: (v: number) => void;
  onDaysChange: (v: number) => void;
  onRunFullAnalysis: () => void;
}

export function AnalysisBanner({
  scenario, mcIterations, mcDays, mcRunning,
  onIterationsChange, onDaysChange, onRunFullAnalysis,
}: AnalysisBannerProps) {
  return (
    <div className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 border-l-4 border-l-blue-600 rounded-lg p-5 mb-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">Run Full Analysis</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Execute Monte Carlo simulation ({mcIterations.toLocaleString()} iterations, {mcDays} days)
            and generate a comprehensive SCOR assessment report.
          </p>
        </div>
        <Button
          onClick={onRunFullAnalysis}
          disabled={mcRunning}
          size="lg"
          className="shrink-0"
          data-testid="button-run-full-analysis"
        >
          {mcRunning ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Running Analysis...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Run Full Analysis
            </>
          )}
        </Button>
      </div>

      <details className="mt-4">
        <summary className="text-xs text-slate-500 dark:text-slate-400 cursor-pointer">
          Adjust MC Parameters
        </summary>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Iterations</label>
            <div className="flex items-center gap-3">
              <Slider
                value={[mcIterations]}
                min={100}
                max={10000}
                step={100}
                onValueChange={([v]) => onIterationsChange(v)}
                className="flex-1"
                data-testid="slider-mc-iterations"
              />
              <span className="min-w-[60px] text-right font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                {mcIterations.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Days</label>
            <div className="flex items-center gap-3">
              <Slider
                value={[mcDays]}
                min={7}
                max={365}
                step={7}
                onValueChange={([v]) => onDaysChange(v)}
                className="flex-1"
                data-testid="slider-mc-days"
              />
              <span className="min-w-[60px] text-right font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                {mcDays} days
              </span>
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}
