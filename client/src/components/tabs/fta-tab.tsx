import { useRef, useEffect, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";
import type { Parameters, MitigationType, MitigationConfigs } from "@shared/schema";

interface FTATabProps {
  parameters: Parameters;
  activeMitigations: Set<MitigationType>;
  mitigationConfigs: MitigationConfigs;
}

interface FTANode {
  id: string;
  type: 'event' | 'gate' | 'basic';
  gateType?: 'AND' | 'OR' | 'CYBER';
  label: string;
  probability?: number;
  x: number;
  y: number;
  children?: string[];
}

export function FTATab({ parameters, activeMitigations, mitigationConfigs }: FTATabProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ftaData, setFtaData] = useState<{ nodes: FTANode[]; probability: number }>({ nodes: [], probability: 0 });

  const calculateFTA = useCallback(() => {
    let ransomwareEff = parameters.ransomwareProb;
    let equipmentEff = parameters.equipmentProb;
    let supplierEff = parameters.supplierProb;

    if (activeMitigations.has('backup')) {
      ransomwareEff *= (1 - (mitigationConfigs.backup.ransomwareReduction || 0));
    }
    if (activeMitigations.has('firewall')) {
      ransomwareEff *= (1 - (mitigationConfigs.firewall.ransomwareReduction || 0));
    }
    if (activeMitigations.has('maintenance')) {
      equipmentEff *= (1 - (mitigationConfigs.maintenance.equipmentReduction || 0));
    }
    if (activeMitigations.has('redundancy')) {
      equipmentEff *= (1 - (mitigationConfigs.redundancy.equipmentReduction || 0));
    }
    if (activeMitigations.has('dual')) {
      supplierEff *= (1 - (mitigationConfigs.dual.supplierReduction || 0));
    }
    if (activeMitigations.has('buffer')) {
      supplierEff *= (1 - (mitigationConfigs.buffer.supplierReduction || 0));
    }

    const cyberPhysicalProb = ransomwareEff;
    const physicalProb = 1 - (1 - equipmentEff) * (1 - supplierEff);
    const cascadeProb = cyberPhysicalProb * 0.85;
    const totalProb = 1 - (1 - cyberPhysicalProb) * (1 - physicalProb) * (1 - cascadeProb);

    const nodes: FTANode[] = [
      { id: 'TOP', type: 'event', label: 'Supply Chain\nDisruption', probability: totalProb, x: 400, y: 50 },
      { id: 'G1', type: 'gate', gateType: 'OR', label: 'OR', x: 400, y: 140, children: ['G2', 'G3', 'G4'] },
      
      { id: 'G2', type: 'gate', gateType: 'CYBER', label: 'CYBER\nGATE', x: 200, y: 240, children: ['BE1', 'BE2'] },
      { id: 'G3', type: 'gate', gateType: 'OR', label: 'OR', x: 400, y: 240, children: ['BE3', 'BE4'] },
      { id: 'G4', type: 'gate', gateType: 'AND', label: 'AND', x: 600, y: 240, children: ['G2', 'BE5'] },
      
      { id: 'BE1', type: 'basic', label: 'Ransomware\nAttack', probability: ransomwareEff, x: 120, y: 380 },
      { id: 'BE2', type: 'basic', label: 'IT System\nVulnerability', probability: 0.15, x: 280, y: 380 },
      { id: 'BE3', type: 'basic', label: 'Equipment\nFailure', probability: equipmentEff, x: 360, y: 380 },
      { id: 'BE4', type: 'basic', label: 'Supplier\nDisruption', probability: supplierEff, x: 440, y: 380 },
      { id: 'BE5', type: 'basic', label: 'Cascade\nPropagation', probability: 0.85, x: 600, y: 380 },
    ];

    setFtaData({ nodes, probability: totalProb });
  }, [parameters, activeMitigations, mitigationConfigs]);

  const drawFTA = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ftaData.nodes.forEach(node => {
      if (node.children) {
        node.children.forEach(childId => {
          const child = ftaData.nodes.find(n => n.id === childId);
          if (child) {
            ctx.strokeStyle = node.gateType === 'CYBER' ? '#334155' : '#64748b';
            ctx.lineWidth = node.gateType === 'CYBER' ? 2.5 : 1.5;
            ctx.setLineDash(node.gateType === 'CYBER' ? [6, 4] : []);
            ctx.beginPath();
            ctx.moveTo(node.x, node.y + 30);
            ctx.lineTo(child.x, child.y - 30);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        });
      }
    });

    ftaData.nodes.forEach(node => {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      if (node.type === 'event') {
        ctx.fillStyle = '#fee2e2';
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(node.x, node.y, 80, 35, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#991b1b';
        ctx.font = '700 13px Roboto, sans-serif';
        ctx.textAlign = 'center';
        const lines = node.label.split('\n');
        lines.forEach((line, i) => {
          ctx.fillText(line, node.x, node.y - 5 + i * 16);
        });
      } else if (node.type === 'gate') {
        if (node.gateType === 'OR') {
          ctx.fillStyle = '#dbeafe';
          ctx.strokeStyle = '#2563eb';
        } else if (node.gateType === 'AND') {
          ctx.fillStyle = '#dcfce7';
          ctx.strokeStyle = '#16a34a';
        } else if (node.gateType === 'CYBER') {
          ctx.fillStyle = '#f1f5f9';
          ctx.strokeStyle = '#1e293b';
        }
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(node.x, node.y - 25);
        ctx.lineTo(node.x + 30, node.y + 10);
        ctx.lineTo(node.x, node.y + 25);
        ctx.lineTo(node.x - 30, node.y + 10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.fillStyle = node.gateType === 'CYBER' ? '#0f172a' : (node.gateType === 'OR' ? '#1d4ed8' : '#15803d');
        ctx.font = '700 11px Roboto, sans-serif';
        ctx.textAlign = 'center';
        const lines = node.label.split('\n');
        lines.forEach((line, i) => {
          ctx.fillText(line, node.x, node.y + 5 + (i - (lines.length - 1) / 2) * 12);
        });
      } else if (node.type === 'basic') {
        ctx.fillStyle = '#fef9c3';
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 35, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#854d0e';
        ctx.font = '600 10px Roboto, sans-serif';
        ctx.textAlign = 'center';
        const lines = node.label.split('\n');
        lines.forEach((line, i) => {
          ctx.fillText(line, node.x, node.y - 5 + i * 12);
        });

        if (node.probability !== undefined) {
          ctx.fillStyle = '#000';
          ctx.font = '700 11px Roboto, monospace';
          ctx.fillText(`P=${(node.probability * 100).toFixed(1)}%`, node.x, node.y + 50);
        }
      }
    });

    ctx.font = '700 16px Roboto, sans-serif';
    ctx.fillStyle = '#dc2626';
    ctx.textAlign = 'left';
    ctx.fillText(`System Failure Probability: ${(ftaData.probability * 100).toFixed(2)}%`, 20, 480);
  }, [ftaData]);

  useEffect(() => {
    calculateFTA();
  }, [calculateFTA]);

  useEffect(() => {
    drawFTA();
  }, [drawFTA]);

  const handleExport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `fta-diagram-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, []);

  return (
    <div>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Fault Tree Analysis (FTA)</h3>
        <p className="text-sm text-gray-600 mb-4">
          Shows how cyber and physical failures combine to cause supply chain disruptions.
          The CYBER GATE represents the cyber-physical cascade mechanism that traditional FTA does not model.
        </p>
        <div className="flex gap-3">
          <Button onClick={calculateFTA} variant="outline" data-testid="button-refresh-fta">
            <RefreshCw className="w-4 h-4 mr-2" />
            Recalculate
          </Button>
          <Button onClick={handleExport} variant="outline" data-testid="button-export-fta">
            <Download className="w-4 h-4 mr-2" />
            Export Diagram
          </Button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <canvas
          ref={canvasRef}
          width={800}
          height={500}
          className="mx-auto border border-gray-300 rounded"
          data-testid="canvas-fta"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <h4 className="font-semibold text-gray-800 mb-4">Gate Types</h4>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 border-2 border-blue-600 rounded transform rotate-45"></div>
              <div>
                <span className="font-semibold text-blue-600">OR Gate:</span>
                <span className="text-gray-600 ml-2">Output occurs if ANY input occurs</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 border-2 border-green-600 rounded transform rotate-45"></div>
              <div>
                <span className="font-semibold text-green-600">AND Gate:</span>
                <span className="text-gray-600 ml-2">Output occurs if ALL inputs occur</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-100 border-2 border-slate-700 rounded transform rotate-45"></div>
              <div>
                <span className="font-semibold text-slate-800">CYBER Gate:</span>
                <span className="text-gray-600 ml-2">Cyber-physical cascade gate (novel)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <h4 className="font-semibold text-gray-800 mb-4">Current Probabilities</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Ransomware Attack:</span>
              <span className="font-mono font-semibold">{(parameters.ransomwareProb * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Equipment Failure:</span>
              <span className="font-mono font-semibold">{(parameters.equipmentProb * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Supplier Disruption:</span>
              <span className="font-mono font-semibold">{(parameters.supplierProb * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span className="text-gray-800 font-semibold">System Failure:</span>
              <span className="font-mono font-bold text-red-600">{(ftaData.probability * 100).toFixed(2)}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-slate-50 p-6 rounded-lg border border-slate-200">
        <h4 className="font-semibold text-slate-800 mb-2">The Cyber Gate</h4>
        <p className="text-sm text-slate-600">
          Traditional FTA uses AND and OR gates. This model introduces the CYBER gate -- a
          specialized gate that captures how cyber failures propagate to physical systems through
          IT/OT integration points. This allows the simulation to quantify cascade costs that
          traditional supply chain risk models miss entirely.
        </p>
      </div>
    </div>
  );
}
