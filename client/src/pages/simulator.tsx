import { useState, useCallback, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Lock, Download, FileText, BarChart2, HelpCircle } from "lucide-react";
import { useSimulation } from "@/hooks/use-simulation";
import type { UseSimulationReturn } from "@/hooks/use-simulation";
import { useToast } from "@/hooks/use-toast";
import { runMonteCarloSimulation } from "@/lib/monte-carlo";
import type { MonteCarloResults } from "@/lib/monte-carlo";
import { generateSCORAssessment } from "@/lib/scor-assessment";
import { PetriNetCanvas } from "@/components/simulation/petri-net-canvas";
import { ParametersPanel } from "@/components/simulation/parameters-panel";
import { MitigationPanel } from "@/components/simulation/mitigation-panel";
import { ResultsBar } from "@/components/simulation/results-bar";
import { ControlsPanel } from "@/components/simulation/controls-panel";
import { FTATab } from "@/components/tabs/fta-tab";
import { AnalysisBanner } from "@/components/simulation/SimulationControls";
import { MonteCarloResultsPanel } from "@/components/simulation/MonteCarloResults";
import { CostDistributionChart } from "@/components/simulation/CostDistributionChart";
import { ConvergencePlot } from "@/components/simulation/ConvergencePlot";
import { HiddenRiskDistributionChart } from "@/components/simulation/HiddenRiskDistributionChart";
import { HomeTab } from "@/components/tabs/home-tab";
import { SensitivityTab } from "@/components/tabs/sensitivity-tab";
import { SCORReportCard } from "@/components/scor/SCORReportCard";
import type { TabType, SCORAssessmentReport, PetriNetModel, MitigationType } from "@shared/schema";

export default function Simulator() {
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const { toast } = useToast();
  const simulation = useSimulation();

  const [mcIterations, setMcIterations] = useState(1000);
  const [mcDays, setMcDays] = useState(30);
  const [mcRunning, setMcRunning] = useState(false);
  const [mcResults, setMcResults] = useState<MonteCarloResults | null>(null);
  const [scorReport, setScorReport] = useState<SCORAssessmentReport | null>(null);

  useEffect(() => {
    if (simulation.scenario?.settings) {
      setMcIterations(simulation.scenario.settings.monteCarloIterations ?? 1000);
      setMcDays(simulation.scenario.settings.simulationDays ?? 30);
    }
  }, [simulation.scenario]);

  const handleRunFullAnalysis = useCallback(() => {
    setMcRunning(true);
    const iters = mcIterations;
    const days = mcDays;

    setTimeout(() => {
      const result = runMonteCarloSimulation({
        iterations: iters,
        days,
        parameters: simulation.parameters,
        activeMitigations: simulation.activeMitigations,
        mitigationConfigs: simulation.mitigationConfigs,
        scenario: simulation.scenario,
      });
      setMcResults(result);

      if (simulation.scenario) {
        const baseSettings = simulation.scenario.settings;
        const scenarioForReport = {
          ...simulation.scenario,
          settings: {
            simulationDays: days,
            monteCarloIterations: iters,
            recoveryFactor: baseSettings?.recoveryFactor ?? 1,
            costMultiplier: baseSettings?.costMultiplier ?? 1,
          },
        };
        const report = generateSCORAssessment(scenarioForReport, simulation.results, {
          standardMean: result.standard.mean,
          standardStd: result.standard.std,
          integratedMean: result.integrated.mean,
          integratedStd: result.integrated.std,
          mitigatedMean: result.mitigated.mean,
          mitigatedStd: result.mitigated.std,
          hiddenRiskMean: result.hiddenRisk.mean,
          iterations: result.iterations,
          days: result.days,
        });
        setScorReport(report);
      } else {
        setScorReport(null);
      }

      setMcRunning(false);
      setActiveTab("report");
      toast({ title: "Analysis complete", description: "Monte Carlo simulation finished. Assessment report is ready." });
    }, 100);
  }, [mcIterations, mcDays, simulation, toast]);

  const handleExportData = useCallback(() => {
    const data = {
      parameters: simulation.parameters,
      results: simulation.results,
      activeMitigations: Array.from(simulation.activeMitigations),
      monteCarloResults: mcResults ? { iterations: mcResults.iterations, days: mcResults.days, standard: mcResults.standard, integrated: mcResults.integrated, mitigated: mcResults.mitigated, hiddenRisk: mcResults.hiddenRisk } : null,
      timestamp: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simulation-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Data exported successfully" });
  }, [simulation, mcResults, toast]);

  const analysisAvailable = mcResults !== null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1900px] mx-auto bg-white rounded-xl shadow-2xl overflow-hidden">
        <AppHeader onNavigateHome={() => setActiveTab("home")} />

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="w-full">
          <TabsList className="w-full justify-start h-auto p-0 bg-white border-b-2 border-gray-200 rounded-none">
            <TabsTrigger value="home" className="px-7 py-3.5 rounded-none border-b-3 border-transparent data-[state=active]:border-gray-800 data-[state=active]:bg-transparent data-[state=active]:shadow-none" data-testid="tab-home">Home</TabsTrigger>
            <TabsTrigger value="fta" className="px-7 py-3.5 rounded-none border-b-3 border-transparent data-[state=active]:border-gray-800 data-[state=active]:bg-transparent data-[state=active]:shadow-none" data-testid="tab-fta">Fault Tree</TabsTrigger>
            <TabsTrigger value="simulation" className="px-7 py-3.5 rounded-none border-b-3 border-transparent data-[state=active]:border-gray-800 data-[state=active]:bg-transparent data-[state=active]:shadow-none" data-testid="tab-simulation">Simulation</TabsTrigger>
            <TabsTrigger value="sensitivity" className="px-7 py-3.5 rounded-none border-b-3 border-transparent data-[state=active]:border-gray-800 data-[state=active]:bg-transparent data-[state=active]:shadow-none" data-testid="tab-sensitivity">Sensitivity</TabsTrigger>
            <TabsTrigger value="report" className="px-7 py-3.5 rounded-none border-b-3 border-transparent data-[state=active]:border-gray-800 data-[state=active]:bg-transparent data-[state=active]:shadow-none flex items-center gap-2" data-testid="tab-report" disabled={!analysisAvailable}>
              {!analysisAvailable && <Lock className="w-3 h-3" />}
              Assessment Report
            </TabsTrigger>
          </TabsList>

          <TabsContent value="home" className="p-0 m-0">
            <HomeTab
              onNavigate={setActiveTab}
              scenario={simulation.scenario}
              onLoadScenario={(s) => { simulation.loadScenario(s); if (s.settings) { setMcIterations(s.settings.monteCarloIterations ?? 1000); setMcDays(s.settings.simulationDays ?? 30); } setMcResults(null); setScorReport(null); }}
              onClearScenario={() => { simulation.clearScenario(); setMcResults(null); setScorReport(null); }}
            />
          </TabsContent>

          <TabsContent value="fta" className="p-8 m-0">
            <FTATab
              parameters={simulation.parameters}
              activeMitigations={simulation.activeMitigations}
              mitigationConfigs={simulation.mitigationConfigs}
            />
          </TabsContent>

          <TabsContent value="simulation" className="p-8 m-0">
            <SimulationTab
              simulation={simulation}
              mcIterations={mcIterations}
              mcDays={mcDays}
              mcRunning={mcRunning}
              onIterationsChange={setMcIterations}
              onDaysChange={setMcDays}
              onRunFullAnalysis={handleRunFullAnalysis}
              onExportData={handleExportData}
            />
          </TabsContent>

          <TabsContent value="sensitivity" className="p-8 m-0">
            <SensitivityTab
              parameters={simulation.parameters}
              activeMitigations={simulation.activeMitigations}
              mitigationConfigs={simulation.mitigationConfigs}
              scenario={simulation.scenario}
            />
          </TabsContent>

          <TabsContent value="report" className="p-8 m-0">
            <ReportTab
              analysisAvailable={analysisAvailable}
              mcResults={mcResults}
              scorReport={scorReport}
              onGoToSimulation={() => setActiveTab("simulation")}
              onExportData={handleExportData}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function AppHeader({ onNavigateHome }: { onNavigateHome: () => void }) {
  return (
    <header className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 text-white p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
      <div className="relative z-10 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Supply Chain Risk Simulator</h1>
          <p className="text-slate-400 text-sm mt-1">Cyber-Physical Supply Chain Disruption Simulator</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="border-slate-600 text-slate-300"
            onClick={() => {
              onNavigateHome();
              setTimeout(() => {
                const el = document.getElementById('instructions-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }}
            data-testid="button-help"
          >
            <HelpCircle className="w-4 h-4 mr-2" />
            Help
          </Button>
        </div>
      </div>
    </header>
  );
}

interface SimulationTabProps {
  simulation: UseSimulationReturn;
  mcIterations: number;
  mcDays: number;
  mcRunning: boolean;
  onIterationsChange: (v: number) => void;
  onDaysChange: (v: number) => void;
  onRunFullAnalysis: () => void;
  onExportData: () => void;
}

function SimulationTab({ simulation, mcIterations, mcDays, mcRunning, onIterationsChange, onDaysChange, onRunFullAnalysis, onExportData }: SimulationTabProps) {
  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-1 uppercase tracking-wide">Statistical Analysis</h2>
        <p className="text-sm text-gray-500 mb-4">
          This runs the full Monte Carlo engine -- thousands of independent simulations using Petri net state traversal. Results appear on the Assessment Report tab.
        </p>
        <AnalysisBanner scenario={simulation.scenario} mcIterations={mcIterations} mcDays={mcDays} mcRunning={mcRunning} onIterationsChange={onIterationsChange} onDaysChange={onDaysChange} onRunFullAnalysis={onRunFullAnalysis} />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-1 uppercase tracking-wide">Interactive Demonstration</h2>
        <p className="text-sm text-gray-500 mb-4">
          Manually trigger disruption events and watch tokens traverse the Petri net in real time. This is a visual demonstration of the model mechanics.
        </p>

        <MitigationPanel activeMitigations={simulation.activeMitigations} mitigationConfigs={simulation.mitigationConfigs} onToggleMitigation={simulation.toggleMitigation} />

        <details className="mb-6" open>
          <summary className="cursor-pointer p-4 bg-gray-50 rounded-lg font-semibold text-gray-700 hover:bg-gray-100">Simulation Parameters & Quick Start Guide</summary>
          <div className="mt-3 space-y-4">
            <QuickStartGuide />
            <ParametersPanel parameters={simulation.parameters} onUpdateParameter={simulation.updateParameter} />
          </div>
        </details>

        <PetriNetLegend />
        <ResultsBar results={simulation.results} />

        <ControlsPanel isSimulating={simulation.isSimulating} onRunSimulation={simulation.runSimulation} onStopSimulation={simulation.stopSimulation} onTriggerRansomware={simulation.triggerRansomware} onTriggerEquipment={simulation.triggerEquipment} onTriggerSupplier={simulation.triggerSupplier} onStepSimulation={simulation.stepSimulation} onExportData={onExportData} onResetAll={simulation.resetAll} />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-6">
          <PetriNetModelPanel title="Traditional Supply Chain Model" borderClass="border-l-blue-600" model={simulation.standardModel} modelType="standard" activeMitigations={simulation.activeMitigations} ftaProbability={simulation.results.ftaProbability} />
          <PetriNetModelPanel title="Integrated Cyber-Physical Model" borderClass="border-l-red-600" model={simulation.integratedModel} modelType="integrated" activeMitigations={simulation.activeMitigations} ftaProbability={simulation.results.ftaProbability} />
          <PetriNetModelPanel title="Mitigated Cyber-Physical Model" borderClass="border-l-emerald-600" model={simulation.mitigatedModel} modelType="mitigated" activeMitigations={simulation.activeMitigations} ftaProbability={simulation.results.ftaProbability} />
        </div>

        <details className="mt-5">
          <summary className="cursor-pointer p-4 bg-gray-50 rounded-lg font-semibold text-gray-700 hover:bg-gray-100">View Detailed Results & Metrics</summary>
          <div className="mt-3 bg-gray-50 p-5 rounded-lg border border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <ResultCard label="System State" value={simulation.results.cascadeCount > 0 ? "Cascading" : "Normal"} description="Current operational status" />
              <ResultCard label="FTA Probability" value={`${(simulation.results.ftaProbability * 100).toFixed(1)}%`} description="Failure likelihood from fault tree" />
              <ResultCard label="Cascade Count" value={simulation.results.cascadeCount.toString()} description="Cyber to physical spreads" />
              <ResultCard label="Traditional Cost" value={`$${simulation.results.standardCost.toLocaleString()}`} description="Physical risks only" />
              <ResultCard label="Integrated Cost" value={`$${simulation.results.integratedCost.toLocaleString()}`} description="Cyber + physical risks" />
              <ResultCard label="Mitigated Cost" value={`$${simulation.results.mitigatedCost.toLocaleString()}`} description="With active mitigations" />
              <ResultCard label="Hidden Risk" value={`${simulation.results.hiddenRisk.toFixed(0)}%`} description="Integrated vs traditional" />
              <ResultCard label="Mitigation Savings" value={`$${simulation.results.mitigationSavings.toLocaleString()}`} description="Prevented losses" />
            </div>
          </div>
        </details>

        <details className="mt-5">
          <summary className="cursor-pointer p-4 bg-gray-50 rounded-lg font-semibold text-gray-700 hover:bg-gray-100">Petri Net Notation Reference</summary>
          <NotationReference />
        </details>
      </div>
    </>
  );
}

function ReportTab({ analysisAvailable, mcResults, scorReport, onGoToSimulation, onExportData }: { analysisAvailable: boolean; mcResults: MonteCarloResults | null; scorReport: SCORAssessmentReport | null; onGoToSimulation: () => void; onExportData: () => void }) {
  if (!analysisAvailable) {
    return (
      <div className="bg-gray-100 p-12 rounded-lg text-center text-gray-500">
        <Lock className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p className="text-lg">Run the full analysis first</p>
        <p className="text-sm mt-2">Go to the Simulation tab and click "Run Full Analysis" to generate the assessment report</p>
        <Button variant="outline" className="mt-4" onClick={onGoToSimulation} data-testid="button-go-to-simulation">Go to Simulation</Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <h2 className="text-xl font-bold text-gray-800" data-testid="text-report-title">Assessment Report</h2>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={() => { if (!mcResults) return; const blob = new Blob([JSON.stringify(mcResults, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `monte-carlo-${mcResults.iterations}iter-${Date.now()}.json`; a.click(); URL.revokeObjectURL(url); }} data-testid="button-export-mc">
            <Download className="w-4 h-4 mr-2" />Export MC Data
          </Button>
          <Button variant="outline" size="sm" onClick={onExportData} data-testid="button-export-all">
            <FileText className="w-4 h-4 mr-2" />Export All
          </Button>
        </div>
      </div>

      {mcResults && (
        <>
          <MonteCarloResultsPanel results={mcResults} />

          <CostDistributionChart
            standardCosts={mcResults.standardCosts}
            integratedCosts={mcResults.integratedCosts}
            mitigatedCosts={mcResults.mitigatedCosts}
            iterations={mcResults.iterations}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 mb-6">
            <HiddenRiskDistributionChart hiddenRiskPercents={mcResults.hiddenRiskPercents} />
            <ConvergencePlot
              standardCosts={mcResults.standardCosts}
              integratedCosts={mcResults.integratedCosts}
              mitigatedCosts={mcResults.mitigatedCosts}
            />
          </div>
        </>
      )}

      {scorReport && (
        <div className="pt-6 border-t border-gray-200">
          <h3 className="text-xl font-bold text-gray-800 mb-4" data-testid="text-scor-report-title">SCOR Assessment Report</h3>
          <SCORReportCard report={scorReport} />
        </div>
      )}
      {!scorReport && mcResults && (
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 text-center">
          <BarChart2 className="w-10 h-10 mx-auto mb-3 text-gray-400" />
          <p className="text-gray-600">SCOR assessment requires a loaded scenario.</p>
          <p className="text-sm text-gray-400 mt-1">Upload a scenario on the Home tab and re-run the analysis.</p>
        </div>
      )}
    </>
  );
}

function PetriNetModelPanel({ title, borderClass, model, modelType, activeMitigations, ftaProbability }: {
  title: string;
  borderClass: string;
  model: PetriNetModel;
  modelType: "standard" | "integrated" | "mitigated";
  activeMitigations: Set<MitigationType>;
  ftaProbability: number;
}) {
  return (
    <div className="rounded-xl overflow-hidden bg-white shadow-lg border border-gray-200 transition-shadow hover:shadow-xl">
      <div className={`px-5 py-3 border-l-4 ${borderClass} bg-gradient-to-r from-slate-100 to-white`}>
        <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">{title}</h3>
      </div>
      <div className="p-3 bg-gradient-to-b from-slate-50/80 to-white min-h-[680px]">
        <PetriNetCanvas model={model} modelType={modelType} activeMitigations={activeMitigations} ftaProbability={ftaProbability} />
      </div>
    </div>
  );
}

function ResultCard({ label, value, description }: { label: string; value: string; description: string }) {
  return (
    <div className="bg-white p-4 rounded border border-gray-200 text-center">
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">{label}</div>
      <div className="text-2xl font-semibold text-gray-700 mb-2">{value}</div>
      <div className="text-xs text-gray-400">{description}</div>
    </div>
  );
}

function QuickStartGuide() {
  return (
    <div className="bg-gray-50 p-4 rounded border border-gray-200">
      <h4 className="font-semibold text-gray-800 mb-3">Quick Start Guide</h4>
      <div className="text-sm text-gray-600 leading-7">
        <p><strong>Step 1:</strong> Click <span className="bg-gray-200 px-1.5 py-0.5 rounded font-medium">Reset All</span> to ensure all models start fresh</p>
        <p><strong>Step 2:</strong> Click <span className="bg-gray-200 px-1.5 py-0.5 rounded font-medium">Trigger Ransomware</span> to simulate a cyber attack</p>
        <p><strong>Step 3:</strong> Watch the <strong>left model</strong> (traditional) - only the manufacturer gets disrupted</p>
        <p><strong>Step 4:</strong> Watch the <strong>middle model</strong> (integrated) - see how the disruption cascades</p>
        <p><strong>Step 5:</strong> Click <span className="bg-gray-200 px-1.5 py-0.5 rounded font-medium">Run Full Analysis</span> to generate the assessment report</p>
      </div>
    </div>
  );
}

function PetriNetLegend() {
  return (
    <div className="flex justify-center gap-8 p-4 bg-white rounded-xl border border-gray-200 mb-6 flex-wrap shadow-sm">
      <LegendItem color="bg-blue-100 border-blue-600" label="Normal State" />
      <LegendItem color="bg-red-100 border-red-600" label="Disrupted State" />
      <LegendItem color="bg-amber-100 border-amber-500" label="Recovery State" />
      <LegendItem color="bg-purple-100 border-purple-600" label="Cyber System" />
      <LegendItem color="bg-emerald-100 border-emerald-600" label="Mitigation" />
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <div className="w-10 h-0.5 bg-red-500 rounded" style={{ boxShadow: '0 0 6px rgba(220, 38, 38, 0.6)' }} />
        <span>Cascade Path</span>
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-700">
      <div className={`w-6 h-6 ${color} border-2 rounded-full shadow-sm`} />
      <span className="font-medium">{label}</span>
    </div>
  );
}

function NotationReference() {
  return (
    <div className="mt-3 bg-gray-50 p-5 rounded-lg border border-gray-200">
      <div className="grid grid-cols-2 gap-5">
        <div className="bg-white rounded border border-gray-200">
          <h4 className="bg-gray-800 text-white px-3 py-2 text-sm font-medium">Place Legend (P)</h4>
          <div className="p-3 text-sm">
            <NotationRow code="P1-P3" desc="Manufacturer Normal/Disrupted/Recovery" />
            <NotationRow code="P4-P6" desc="Distributor Normal/Disrupted/Recovery" />
            <NotationRow code="P7-P9" desc="Customer Normal/Impacted/Recovery" />
            <NotationRow code="P10-P12" desc="IT/Production/Logistics Systems (Cyber)" border={false} />
          </div>
        </div>
        <div className="bg-white rounded border border-gray-200">
          <h4 className="bg-gray-800 text-white px-3 py-2 text-sm font-medium">Transition Legend (T)</h4>
          <div className="p-3 text-sm">
            <NotationRow code="T1-T3" desc="FTA-triggered disruptions" />
            <NotationRow code="T4-T5" desc="Cascade propagation (Cyber to Physical)" />
            <NotationRow code="T6-T11" desc="Recovery transitions" border={false} />
          </div>
        </div>
      </div>
    </div>
  );
}

function NotationRow({ code, desc, border = true }: { code: string; desc: string; border?: boolean }) {
  return (
    <div className={`flex justify-between py-1 ${border ? "border-b border-gray-100" : ""}`}>
      <span className="font-mono font-semibold text-gray-700">{code}</span>
      <span className="text-gray-600">{desc}</span>
    </div>
  );
}
