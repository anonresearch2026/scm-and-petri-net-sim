import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X, CheckCircle, AlertCircle, Download } from "lucide-react";
import { ScenarioConfigSchema } from "@shared/schema";
import type { ScenarioConfig } from "@shared/schema";
import * as XLSX from "xlsx";

interface ScenarioUploaderProps {
  onScenarioLoaded: (scenario: ScenarioConfig) => void;
  currentScenario: ScenarioConfig | null;
  onClearScenario: () => void;
}

function parseExcelToScenario(workbook: XLSX.WorkBook): ScenarioConfig {
  const metaSheet = workbook.Sheets["Scenario"];
  const tiersSheet = workbook.Sheets["Tiers"];
  const risksSheet = workbook.Sheets["Risks"];
  const mitigationsSheet = workbook.Sheets["Mitigations"];

  if (!metaSheet || !tiersSheet || !risksSheet || !mitigationsSheet) {
    throw new Error("Excel file must contain sheets: Scenario, Tiers, Risks, Mitigations");
  }

  const meta = XLSX.utils.sheet_to_json<Record<string, string | number>>(metaSheet);
  const tiersData = XLSX.utils.sheet_to_json<Record<string, string | number>>(tiersSheet);
  const risksData = XLSX.utils.sheet_to_json<Record<string, string | number>>(risksSheet);
  const mitigationsData = XLSX.utils.sheet_to_json<Record<string, string | number>>(mitigationsSheet);

  const scenarioMeta = meta[0] || {};

  const tiers = tiersData.map(row => ({
    id: String(row.id || ""),
    name: String(row.name || ""),
    type: String(row.type || "source") as "source" | "transform" | "distribute" | "customer",
    position: Number(row.position || 0),
    cyberDependency: Number(row.cyberDependency || 0.5),
  }));

  const risks = risksData.map(row => ({
    id: String(row.id || ""),
    name: String(row.name || ""),
    category: String(row.category || "physical") as "cyber" | "physical" | "external" | "operational",
    probability: Number(row.probability || 0),
    baseCost: Number(row.baseCost || 0),
    cascadeMultiplier: Number(row.cascadeMultiplier || 1.5),
    affectedTiers: String(row.affectedTiers || "").split(",").map(s => s.trim()).filter(Boolean),
    propagates: String(row.propagates).toLowerCase() !== "false" && row.propagates !== 0,
  }));

  const mitigationMap: Record<string, { id: string; name: string; monthlyCost: number; bufferDays?: number; mitigates: { riskId: string; reductionFactor: number }[] }> = {};
  mitigationsData.forEach(row => {
    const id = String(row.id || "");
    if (!mitigationMap[id]) {
      mitigationMap[id] = {
        id,
        name: String(row.name || ""),
        monthlyCost: Number(row.monthlyCost || 0),
        bufferDays: row.bufferDays ? Number(row.bufferDays) : undefined,
        mitigates: [],
      };
    }
    if (row.riskId) {
      mitigationMap[id].mitigates.push({
        riskId: String(row.riskId),
        reductionFactor: Number(row.reductionFactor || 0),
      });
    }
  });

  const scenario: ScenarioConfig = {
    name: String(scenarioMeta.name || "Imported Scenario"),
    description: scenarioMeta.description ? String(scenarioMeta.description) : undefined,
    industry: scenarioMeta.industry ? String(scenarioMeta.industry) : undefined,
    tiers,
    risks,
    mitigations: Object.values(mitigationMap),
    settings: {
      simulationDays: Number(scenarioMeta.simulationDays || 30),
      monteCarloIterations: Number(scenarioMeta.monteCarloIterations || 1000),
      costMultiplier: Number(scenarioMeta.costMultiplier || 1.0),
      recoveryFactor: Number(scenarioMeta.recoveryFactor || 3),
    },
  };

  return scenario;
}

function generateExcelTemplate(): void {
  const wb = XLSX.utils.book_new();

  const scenarioData = [
    { name: "My Supply Chain Scenario", description: "Description here", industry: "Manufacturing", simulationDays: 30, monteCarloIterations: 1000, costMultiplier: 1.0, recoveryFactor: 3 },
  ];
  const scenarioSheet = XLSX.utils.json_to_sheet(scenarioData);
  XLSX.utils.book_append_sheet(wb, scenarioSheet, "Scenario");

  const tiersData = [
    { id: "supplier", name: "Raw Material Supplier", type: "source", position: 0, cyberDependency: 0.3 },
    { id: "factory", name: "Manufacturing Plant", type: "transform", position: 1, cyberDependency: 0.7 },
    { id: "warehouse", name: "Distribution Center", type: "distribute", position: 2, cyberDependency: 0.5 },
    { id: "retail", name: "Retail Outlet", type: "customer", position: 3, cyberDependency: 0.4 },
  ];
  const tiersSheet = XLSX.utils.json_to_sheet(tiersData);
  XLSX.utils.book_append_sheet(wb, tiersSheet, "Tiers");

  const risksData = [
    { id: "ransomware", name: "Ransomware Attack", category: "cyber", probability: 0.02, baseCost: 75000, cascadeMultiplier: 2.5, affectedTiers: "factory,warehouse", propagates: true },
    { id: "equipment_fail", name: "Equipment Failure", category: "physical", probability: 0.05, baseCost: 40000, cascadeMultiplier: 1.8, affectedTiers: "factory", propagates: true },
    { id: "supplier_delay", name: "Supplier Delay", category: "external", probability: 0.03, baseCost: 15000, cascadeMultiplier: 1.5, affectedTiers: "supplier", propagates: true },
  ];
  const risksSheet = XLSX.utils.json_to_sheet(risksData);
  XLSX.utils.book_append_sheet(wb, risksSheet, "Risks");

  const mitigationsData = [
    { id: "backup", name: "Automated Backups", monthlyCost: 5000, riskId: "ransomware", reductionFactor: 0.45, bufferDays: "" },
    { id: "generator", name: "Backup Generators", monthlyCost: 8000, riskId: "equipment_fail", reductionFactor: 0.6, bufferDays: "" },
    { id: "safety_stock", name: "Safety Stock", monthlyCost: 20000, riskId: "supplier_delay", reductionFactor: 0.7, bufferDays: 14 },
  ];
  const mitigationsSheet = XLSX.utils.json_to_sheet(mitigationsData);
  XLSX.utils.book_append_sheet(wb, mitigationsSheet, "Mitigations");

  XLSX.writeFile(wb, "scenario-template.xlsx");
}

export function ScenarioUploader({ onScenarioLoaded, currentScenario, onClearScenario }: ScenarioUploaderProps) {
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleJsonFile = useCallback((file: File) => {
    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const validated = ScenarioConfigSchema.parse(json);
        onScenarioLoaded(validated);
      } catch (err: unknown) {
        if (err instanceof SyntaxError) {
          setError("Invalid JSON format. Please check your file.");
        } else if (err instanceof Error) {
          const zodMsg = err.message.length > 200 ? err.message.slice(0, 200) + "..." : err.message;
          setError(`Validation error: ${zodMsg}`);
        } else {
          setError("Unknown error processing file.");
        }
      }
    };
    reader.readAsText(file);
  }, [onScenarioLoaded]);

  const handleExcelFile = useCallback((file: File) => {
    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const scenario = parseExcelToScenario(workbook);
        const validated = ScenarioConfigSchema.parse(scenario);
        onScenarioLoaded(validated);
      } catch (err: unknown) {
        if (err instanceof Error) {
          const msg = err.message.length > 200 ? err.message.slice(0, 200) + "..." : err.message;
          setError(`Excel parsing error: ${msg}`);
        } else {
          setError("Unknown error processing Excel file.");
        }
      }
    };
    reader.readAsArrayBuffer(file);
  }, [onScenarioLoaded]);

  const handleFile = useCallback((file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "json") {
      handleJsonFile(file);
    } else if (ext === "xlsx" || ext === "xls") {
      handleExcelFile(file);
    } else {
      setError("Unsupported file type. Please upload a .json or .xlsx file.");
    }
  }, [handleJsonFile, handleExcelFile]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext === "json" || ext === "xlsx" || ext === "xls") {
        handleFile(file);
      } else {
        setError("Please drop a .json or .xlsx file");
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => setDragActive(false);

  const foodExample: ScenarioConfig = {
    name: "Food Distribution Network",
    description: "Regional food distribution with cold chain requirements",
    industry: "Food & Beverage",
    tiers: [
      { id: "supplier", name: "Supplier", type: "source", position: 0, cyberDependency: 0.3 },
      { id: "warehouse", name: "Cold Storage DC", type: "distribute", position: 1, cyberDependency: 0.7 },
      { id: "retail", name: "Retail Stores", type: "customer", position: 2, cyberDependency: 0.5 },
    ],
    risks: [
      { id: "ransomware", name: "Ransomware Attack", category: "cyber", probability: 0.02, baseCost: 75000, cascadeMultiplier: 2.5, affectedTiers: ["warehouse"], propagates: true },
      { id: "refrigeration", name: "Refrigeration Failure", category: "physical", probability: 0.03, baseCost: 40000, cascadeMultiplier: 1.8, affectedTiers: ["warehouse"], propagates: true },
      { id: "supplier_delay", name: "Supplier Delay", category: "external", probability: 0.05, baseCost: 15000, cascadeMultiplier: 1.5, affectedTiers: ["supplier"], propagates: true },
    ],
    mitigations: [
      { id: "backup", name: "Automated Backups", monthlyCost: 5000, mitigates: [{ riskId: "ransomware", reductionFactor: 0.45 }] },
      { id: "generator", name: "Backup Generators", monthlyCost: 8000, mitigates: [{ riskId: "refrigeration", reductionFactor: 0.6 }] },
      { id: "safety_stock", name: "Safety Stock", monthlyCost: 20000, bufferDays: 14, mitigates: [{ riskId: "supplier_delay", reductionFactor: 0.7 }] },
    ],
    settings: { simulationDays: 30, monteCarloIterations: 1000, costMultiplier: 1.0, recoveryFactor: 3 },
  };

  const manufacturingExample: ScenarioConfig = {
    name: "Electronics Manufacturing Network",
    description: "Multi-tier electronics supply chain with high cyber dependency",
    industry: "Electronics Manufacturing",
    tiers: [
      { id: "components", name: "Component Supplier", type: "source", position: 0, cyberDependency: 0.4 },
      { id: "assembly", name: "Assembly Plant", type: "transform", position: 1, cyberDependency: 0.85 },
      { id: "testing", name: "Testing & QA", type: "transform", position: 2, cyberDependency: 0.9 },
      { id: "distribution", name: "Distribution Hub", type: "distribute", position: 3, cyberDependency: 0.6 },
    ],
    risks: [
      { id: "ransomware", name: "Ransomware Attack", category: "cyber", probability: 0.03, baseCost: 120000, cascadeMultiplier: 3.0, affectedTiers: ["assembly", "testing"], propagates: true },
      { id: "chip_shortage", name: "Component Shortage", category: "external", probability: 0.04, baseCost: 80000, cascadeMultiplier: 2.0, affectedTiers: ["components"], propagates: true },
      { id: "equipment_failure", name: "Assembly Line Failure", category: "physical", probability: 0.06, baseCost: 55000, cascadeMultiplier: 1.8, affectedTiers: ["assembly"], propagates: true },
      { id: "quality_breach", name: "Quality System Breach", category: "operational", probability: 0.02, baseCost: 45000, cascadeMultiplier: 2.2, affectedTiers: ["testing"], propagates: true },
    ],
    mitigations: [
      { id: "backup_systems", name: "Automated Backup & Recovery", monthlyCost: 8000, mitigates: [{ riskId: "ransomware", reductionFactor: 0.5 }] },
      { id: "dual_source", name: "Dual Component Sourcing", monthlyCost: 25000, mitigates: [{ riskId: "chip_shortage", reductionFactor: 0.6 }] },
      { id: "predictive_maint", name: "Predictive Maintenance", monthlyCost: 12000, mitigates: [{ riskId: "equipment_failure", reductionFactor: 0.55 }] },
    ],
    settings: { simulationDays: 60, monteCarloIterations: 2000, costMultiplier: 1.0, recoveryFactor: 3 },
  };

  const handleLoadExample = (scenario: ScenarioConfig) => {
    onScenarioLoaded(scenario);
    setError(null);
  };

  if (currentScenario) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4" data-testid="scenario-loaded">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
            <div>
              <div className="font-semibold text-green-800">{currentScenario.name}</div>
              <div className="text-xs text-green-600">
                {currentScenario.tiers.length} tiers, {currentScenario.risks.length} risks, {currentScenario.mitigations.length} mitigations
                {currentScenario.industry && ` | ${currentScenario.industry}`}
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onClearScenario} data-testid="button-clear-scenario">
            <X className="w-3 h-3 mr-1" />
            Clear
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        data-testid="scenario-dropzone"
      >
        <Upload className="w-10 h-10 mx-auto mb-4 text-gray-400" />
        <p className="text-sm text-gray-600 mb-1">
          Drop a scenario file here, or click to upload
        </p>
        <p className="text-xs text-gray-400 mb-4">
          Supports .json and .xlsx formats
        </p>
        <div className="flex justify-center gap-3 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            data-testid="button-upload-scenario"
          >
            <FileText className="w-4 h-4 mr-2" />
            Upload Scenario (.json / .xlsx)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleLoadExample(foodExample)}
            data-testid="button-load-food-example"
          >
            Food Distribution
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleLoadExample(manufacturingExample)}
            data-testid="button-load-manufacturing-example"
          >
            Manufacturing
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.xlsx,.xls"
          onChange={handleFileUpload}
          className="hidden"
          data-testid="input-file-scenario"
        />
      </div>

      <div className="mt-3 flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={generateExcelTemplate}
          className="text-xs text-gray-500"
          data-testid="button-download-template"
        >
          <Download className="w-3 h-3 mr-1" />
          Download Excel Template
        </Button>
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2" data-testid="scenario-error">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
