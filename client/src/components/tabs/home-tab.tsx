import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Network, BarChart2, BookOpen } from "lucide-react";
import type { TabType, ScenarioConfig } from "@shared/schema";
import { ScenarioUploader } from "@/components/scenario/ScenarioUploader";

interface HomeTabProps {
  onNavigate: (tab: TabType) => void;
  scenario: ScenarioConfig | null;
  onLoadScenario: (scenario: ScenarioConfig) => void;
  onClearScenario: () => void;
}

export function HomeTab({ onNavigate, scenario, onLoadScenario, onClearScenario }: HomeTabProps) {
  return (
    <div className="p-8">
      <div className="bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 text-white p-10 rounded-xl mb-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
        <div className="relative z-10">
          <div className="inline-block px-3 py-1 bg-blue-500/20 rounded-full text-xs font-medium text-blue-300 mb-4">
            Academic Research Tool
          </div>
          <h2 className="text-3xl font-bold mb-4 text-white">FTA-Petri Net Supply Chain Risk Simulator</h2>
          <p className="text-lg opacity-90 mb-6 max-w-3xl leading-relaxed">
            This advanced simulation platform integrates <strong>Fault Tree Analysis (FTA)</strong> with <strong>Petri Net modeling</strong> 
            to assess cyber-physical supply chain risks. Upload a scenario, run the integrated analysis, 
            and receive a comprehensive SCOR-graded assessment report.
          </p>
          <div className="flex gap-4 flex-wrap">
            <Button 
              onClick={() => onNavigate("simulation")}
              className="bg-white text-gray-800 font-semibold"
              data-testid="button-start-simulation"
            >
              Go to Simulation
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Upload Supply Chain Scenario</h3>
        <p className="text-sm text-gray-600 mb-4">
          Upload a custom supply chain scenario (JSON or Excel) to automatically configure simulation parameters, 
          risk probabilities, and mitigation strategies. After uploading, navigate to the Simulation tab to run the full analysis.
        </p>
        <ScenarioUploader
          onScenarioLoaded={onLoadScenario}
          currentScenario={scenario}
          onClearScenario={onClearScenario}
        />
        {scenario && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <Button
              onClick={() => onNavigate("simulation")}
              className="w-full"
              data-testid="button-proceed-to-simulation"
            >
              Proceed to Simulation
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      <div id="instructions-section" className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden mb-8">
        <div className="bg-slate-800 px-6 py-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            How to Use Supply Chain Risk Simulator
          </h2>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-3">Overview</h3>
            <p className="text-gray-600 leading-relaxed">
              Supply Chain Risk Simulator is a Monte Carlo simulation tool that models cyber-physical supply chain disruptions.
              It combines Fault Tree Analysis (FTA) with Petri Net modeling to reveal "hidden risks" -- the additional
              costs that traditional risk models miss when they ignore how cyber attacks cascade into physical operations.
            </p>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-3">Getting Started</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">1</div>
                <div>
                  <h4 className="font-semibold text-slate-700">Load a Scenario</h4>
                  <p className="text-gray-600 text-sm">Upload a JSON or Excel file with your supply chain configuration, or use the built-in example scenario. The scenario defines your supply chain tiers, risks, and mitigation strategies.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">2</div>
                <div>
                  <h4 className="font-semibold text-slate-700">Configure Parameters</h4>
                  <p className="text-gray-600 text-sm">Go to the Simulation tab. Adjust disruption probabilities (ransomware, equipment failure, supplier disruption) and toggle mitigation controls on/off.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">3</div>
                <div>
                  <h4 className="font-semibold text-slate-700">Run the Analysis</h4>
                  <p className="text-gray-600 text-sm">Click "Run Full Analysis" to execute the Monte Carlo simulation. This runs thousands of iterations to statistically model disruption costs across three models: Traditional, Integrated, and Mitigated.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">4</div>
                <div>
                  <h4 className="font-semibold text-slate-700">Review the Report</h4>
                  <p className="text-gray-600 text-sm">The Assessment Report tab shows Monte Carlo results, hidden risk analysis, and a SCOR-based assessment with grades, metrics, and prioritized recommendations.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-3">Key Concepts</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h4 className="font-semibold text-slate-700 mb-2">Traditional Model</h4>
                <p className="text-gray-600 text-sm">Models disruptions as isolated physical events. This is how most organizations currently assess supply chain risk -- and it significantly underestimates true costs.</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h4 className="font-semibold text-slate-700 mb-2">Integrated Model</h4>
                <p className="text-gray-600 text-sm">Adds cyber-physical cascades: a ransomware attack doesn't just cost money directly -- it can halt production lines, delay shipments, and impact customers downstream.</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h4 className="font-semibold text-slate-700 mb-2">Mitigated Model</h4>
                <p className="text-gray-600 text-sm">Shows the integrated model with active mitigations (backups, firewalls, redundant suppliers, etc.) applied, demonstrating the ROI of risk controls.</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h4 className="font-semibold text-slate-700 mb-2">Hidden Risk</h4>
                <p className="text-gray-600 text-sm">The percentage difference between Traditional and Integrated costs. This gap reveals how much organizations underestimate disruption costs when they ignore cyber-physical cascade effects.</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-3">Scenario File Format</h3>
            <p className="text-gray-600 text-sm mb-3">
              You can upload scenarios as JSON or Excel files. Excel files should have four sheets: Scenario, Tiers, Risks, and Mitigations.
              Download the template from the scenario uploader for the exact format.
            </p>
            <div className="bg-slate-900 text-slate-300 p-4 rounded-lg text-sm font-mono overflow-x-auto">
              <pre>{`{
  "name": "My Supply Chain",
  "description": "...",
  "settings": {
    "simulationDays": 30,
    "monteCarloIterations": 1000
  },
  "tiers": [...],
  "risks": [...],
  "mitigations": [...]
}`}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
