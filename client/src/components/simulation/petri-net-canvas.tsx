import { useRef, useEffect, useCallback, useState } from "react";
import { ZoomOut, ZoomIn, RotateCcw } from "lucide-react";
import type { PetriNetModel, Arc, MitigationType } from "@shared/schema";
import { COLORS } from "@shared/schema";

interface PetriNetCanvasProps {
  model: PetriNetModel;
  modelType: "standard" | "integrated" | "mitigated";
  activeMitigations: Set<MitigationType>;
  ftaProbability: number;
  width?: number;
  height?: number;
}

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 650;

const ZOOM_MIN = 0.8;
const ZOOM_MAX = 2.0;
const ZOOM_STEP = 0.1;

export function PetriNetCanvas({
  model,
  modelType,
  activeMitigations,
  ftaProbability,
  width = CANVAS_WIDTH,
  height = CANVAS_HEIGHT,
}: PetriNetCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1.0);

  const getArcs = useCallback((): Arc[] => {
    const isIntegrated = modelType === "integrated" || modelType === "mitigated";
    const isMitigated = modelType === "mitigated";

    if (isIntegrated) {
      const arcs: Arc[] = [
        { from: 'P1', to: 'T1' }, { from: 'T1', to: 'P2' },
        { from: 'P2', to: 'T6' }, { from: 'T6', to: 'P3' },
        { from: 'P3', to: 'T9' }, { from: 'T9', to: 'P1' },
        { from: 'P4', to: 'T2' }, { from: 'T2', to: 'P5' },
        { from: 'P5', to: 'T7' }, { from: 'T7', to: 'P6' },
        { from: 'P6', to: 'T10' }, { from: 'T10', to: 'P4' },
        { from: 'P7', to: 'T3' }, { from: 'T3', to: 'P8' },
        { from: 'P8', to: 'T8' }, { from: 'T8', to: 'P9' },
        { from: 'P9', to: 'T11' }, { from: 'T11', to: 'P7' },
        { from: 'P10', to: 'T12', cyber: true },
        { from: 'P1', to: 'T12', cyber: true },
        { from: 'T12', to: 'P2', cascade: true },
        { from: 'P2', to: 'T4', cascade: true },
        { from: 'T4', to: 'P5', cascade: true },
        { from: 'P5', to: 'T5', cascade: true },
        { from: 'T5', to: 'P8', cascade: true },
        { from: 'P10', to: 'T13', cyber: true },
        { from: 'T13', to: 'P11', cyber: true },
        { from: 'P11', to: 'P12', cyber: true },
      ];

      if (isMitigated) {
        if (activeMitigations.has('backup')) {
          arcs.push({ from: 'M1', to: 'T1', mitigation: true, inhibitor: true });
          arcs.push({ from: 'M1', to: 'T12', mitigation: true, inhibitor: true });
        }
        if (activeMitigations.has('firewall')) {
          arcs.push({ from: 'M2', to: 'T12', mitigation: true, inhibitor: true });
          arcs.push({ from: 'M2', to: 'T13', mitigation: true, inhibitor: true });
        }
        if (activeMitigations.has('buffer')) {
          arcs.push({ from: 'M3', to: 'P3', mitigation: true });
          arcs.push({ from: 'M3', to: 'T3', mitigation: true, inhibitor: true });
        }
        if (activeMitigations.has('dual')) {
          arcs.push({ from: 'M4', to: 'P1', mitigation: true });
          arcs.push({ from: 'M4', to: 'T1', mitigation: true, inhibitor: true });
        }
        if (activeMitigations.has('maintenance')) {
          arcs.push({ from: 'M5', to: 'T2', mitigation: true, inhibitor: true });
          arcs.push({ from: 'M5', to: 'P4', mitigation: true });
        }
        if (activeMitigations.has('redundancy')) {
          arcs.push({ from: 'M6', to: 'P4', mitigation: true });
          arcs.push({ from: 'M6', to: 'T2', mitigation: true, inhibitor: true });
        }
      }

      return arcs;
    }

    return [
      { from: 'P1', to: 'T1' }, { from: 'T1', to: 'P2' },
      { from: 'P2', to: 'T6' }, { from: 'T6', to: 'P3' },
      { from: 'P3', to: 'T9' }, { from: 'T9', to: 'P1' },
      { from: 'P4', to: 'T2' }, { from: 'T2', to: 'P5' },
      { from: 'P5', to: 'T7' }, { from: 'T7', to: 'P6' },
      { from: 'P6', to: 'T10' }, { from: 'T10', to: 'P4' },
      { from: 'P7', to: 'T3' }, { from: 'T3', to: 'P8' },
      { from: 'P8', to: 'T8' }, { from: 'T8', to: 'P9' },
      { from: 'P9', to: 'T11' }, { from: 'T11', to: 'P7' },
    ];
  }, [modelType, activeMitigations]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scaledW = width / zoom;
    const scaledH = height / zoom;

    ctx.clearRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.save();
    ctx.scale(zoom, zoom);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, scaledW, scaledH);

    ctx.strokeStyle = '#f5f5f5';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < scaledW; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, scaledH);
      ctx.stroke();
    }
    for (let y = 0; y < scaledH; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(scaledW, y);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(44, 62, 80, 0.01)';
    ctx.fillRect(100, 140, 100, 480);
    ctx.fillRect(250, 140, 100, 480);
    ctx.fillRect(400, 140, 100, 480);

    const isIntegrated = modelType === "integrated" || modelType === "mitigated";

    if (isIntegrated) {
      ctx.fillStyle = 'rgba(155, 89, 182, 0.02)';
      ctx.fillRect(100, 40, 400, 80);
    }

    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 1;
    ctx.font = '700 16px Roboto, sans-serif';
    ctx.fillStyle = '#1a1a1a';
    ctx.textAlign = 'center';
    ctx.fillText('MANUFACTURER', 150, 160);
    ctx.fillText('DISTRIBUTOR', 300, 160);
    ctx.fillText('CUSTOMER', 450, 160);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    if (isIntegrated) {
      ctx.font = '700 15px Roboto, sans-serif';
      const gradient = ctx.createLinearGradient(200, 50, 400, 50);
      gradient.addColorStop(0, '#8e44ad');
      gradient.addColorStop(1, '#9b59b6');
      ctx.fillStyle = gradient;
      ctx.fillText('CYBER-PHYSICAL LAYER (FTA-TRIGGERED)', 300, 50);
    }

    const backboneGradient = ctx.createLinearGradient(150, 200, 450, 200);
    backboneGradient.addColorStop(0, '#cbd5e0');
    backboneGradient.addColorStop(0.5, '#94a3b8');
    backboneGradient.addColorStop(1, '#cbd5e0');
    ctx.strokeStyle = backboneGradient;
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 6]);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(150, 200);
    ctx.lineTo(300, 200);
    ctx.lineTo(450, 200);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineCap = 'butt';

    drawArcs(ctx);
    drawPlaces(ctx);
    drawTransitions(ctx);

    if (isIntegrated) {
      drawFTABox(ctx);
    }

    ctx.restore();
  }, [model, modelType, width, height, zoom, getArcs, ftaProbability]);

  const drawArcs = useCallback((ctx: CanvasRenderingContext2D) => {
    const arcs = getArcs();
    const allNodes = [...model.places, ...model.transitions];

    arcs.forEach(arc => {
      const from = allNodes.find(n => n.id === arc.from);
      const to = allNodes.find(n => n.id === arc.to);
      if (!from || !to) return;

      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const angle = Math.atan2(dy, dx);

      let startX: number, startY: number;
      if (from.id.startsWith('P') || from.id.startsWith('M')) {
        startX = from.x + 22 * Math.cos(angle);
        startY = from.y + 22 * Math.sin(angle);
      } else {
        if (Math.abs(dx) > Math.abs(dy)) {
          startX = from.x + (dx > 0 ? 30 : -30);
          startY = from.y;
        } else {
          startX = from.x;
          startY = from.y + (dy > 0 ? 12 : -12);
        }
      }

      let endX: number, endY: number;
      if (to.id.startsWith('P') || to.id.startsWith('M')) {
        endX = to.x - 22 * Math.cos(angle);
        endY = to.y - 22 * Math.sin(angle);
      } else {
        if (Math.abs(dx) > Math.abs(dy)) {
          endX = to.x - (dx > 0 ? 30 : -30);
          endY = to.y;
        } else {
          endX = to.x;
          endY = to.y - (dy > 0 ? 12 : -12);
        }
      }

      ctx.save();

      if (arc.mitigation) {
        ctx.strokeStyle = '#16a34a';
        ctx.setLineDash([8, 4]);
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
      } else if (arc.cascade) {
        ctx.shadowColor = 'rgba(220, 38, 38, 0.6)';
        ctx.shadowBlur = 8;
        ctx.strokeStyle = '#dc2626';
        ctx.setLineDash([6, 3]);
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
      } else if (arc.cyber) {
        ctx.strokeStyle = '#7c3aed';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
      } else if (arc.direct) {
        ctx.strokeStyle = '#94a3b8';
        ctx.setLineDash([]);
        ctx.lineWidth = 1.5;
      } else {
        ctx.strokeStyle = '#475569';
        ctx.setLineDash([]);
        ctx.lineWidth = 1.5;
      }

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      const arrowLength = 10;
      const arrowAngle = Math.PI / 6;

      if (arc.inhibitor) {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = arc.mitigation ? '#16a34a' : ctx.strokeStyle;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(endX, endY, 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - arrowLength * Math.cos(angle - arrowAngle), endY - arrowLength * Math.sin(angle - arrowAngle));
        ctx.lineTo(endX - arrowLength * Math.cos(angle + arrowAngle), endY - arrowLength * Math.sin(angle + arrowAngle));
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    });
  }, [model, getArcs]);

  const drawPlaces = useCallback((ctx: CanvasRenderingContext2D) => {
    const borderColors: Record<string, string> = {
      cyber: '#9b59b6',
      normal: '#4a90e2',
      disrupted: '#e74c3c',
      recovery: '#f39c12',
      mitigation: '#16a34a',
    };

    model.places.forEach(place => {
      if (place.tokens > 0) {
        const pulseIntensity = 0.6 + 0.4 * Math.sin(Date.now() / 400);

        const glowColors: Record<string, string> = {
          cyber: `rgba(155, 89, 182, ${0.25 * pulseIntensity})`,
          normal: `rgba(74, 144, 226, ${0.25 * pulseIntensity})`,
          disrupted: `rgba(231, 76, 60, ${0.3 * pulseIntensity})`,
          recovery: `rgba(243, 156, 18, ${0.25 * pulseIntensity})`,
          mitigation: `rgba(22, 163, 74, ${0.25 * pulseIntensity})`,
        };

        const glowGradient = ctx.createRadialGradient(place.x, place.y, 15, place.x, place.y, 35);
        glowGradient.addColorStop(0, glowColors[place.type] || glowColors.normal);
        glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(place.x, place.y, 35, 0, 2 * Math.PI);
        ctx.fill();
      }

      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      ctx.beginPath();
      ctx.arc(place.x, place.y, 22, 0, 2 * Math.PI);

      const placeGradient = ctx.createRadialGradient(place.x - 5, place.y - 5, 0, place.x, place.y, 22);
      placeGradient.addColorStop(0, '#ffffff');
      placeGradient.addColorStop(0.9, '#f8f9fa');
      placeGradient.addColorStop(1, '#e9ecef');
      ctx.fillStyle = placeGradient;
      ctx.fill();

      const innerShadow = ctx.createRadialGradient(place.x, place.y, 15, place.x, place.y, 22);
      innerShadow.addColorStop(0, 'rgba(0, 0, 0, 0)');
      innerShadow.addColorStop(1, 'rgba(0, 0, 0, 0.08)');
      ctx.fillStyle = innerShadow;
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      ctx.strokeStyle = borderColors[place.type] || borderColors.normal;
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(place.x, place.y, 18, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      if (place.tokens > 0) {
        ctx.beginPath();
        ctx.arc(place.x, place.y, 7, 0, 2 * Math.PI);
        ctx.fillStyle = '#000000';
        ctx.fill();
      }

      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(place.x + 23, place.y - 7, 32, 16);
      ctx.fillStyle = '#1a1a1a';
      ctx.font = '700 13px Roboto, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(place.label, place.x + 27, place.y + 5);

      ctx.font = '600 12px Roboto, sans-serif';
      ctx.fillStyle = '#475569';
      ctx.textAlign = 'center';
      const nameWidth = ctx.measureText(place.name).width;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillRect(place.x - nameWidth / 2 - 3, place.y + 31, nameWidth + 6, 16);
      ctx.fillStyle = '#475569';
      ctx.fillText(place.name, place.x, place.y + 43);
    });
  }, [model]);

  const drawTransitions = useCallback((ctx: CanvasRenderingContext2D) => {
    model.transitions.forEach(trans => {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      const transGradient = ctx.createLinearGradient(trans.x - 30, trans.y - 12, trans.x - 30, trans.y + 12);
      if (trans.enabled) {
        transGradient.addColorStop(0, '#e0f2fe');
        transGradient.addColorStop(1, '#bae6fd');
      } else {
        transGradient.addColorStop(0, '#ffffff');
        transGradient.addColorStop(1, '#f1f5f9');
      }

      ctx.fillStyle = transGradient;
      ctx.fillRect(trans.x - 30, trans.y - 12, 60, 24);

      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      if (trans.fta) {
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = trans.enabled ? 3 : 2;
      } else if (trans.cyber) {
        ctx.strokeStyle = '#9333ea';
        ctx.lineWidth = trans.enabled ? 3 : 2;
      } else {
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = trans.enabled ? 2 : 1.5;
      }

      ctx.strokeRect(trans.x - 30, trans.y - 12, 60, 24);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(trans.x - 28, trans.y - 10, 56, 20);

      ctx.fillStyle = '#0f172a';
      ctx.font = '700 12px Roboto, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(trans.label, trans.x + 35, trans.y + 4);

      if (trans.enabled) {
        ctx.fillStyle = '#0369a1';
        ctx.font = '500 10px Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ACTIVE', trans.x, trans.y + 4);
      }

      ctx.font = '600 11px Roboto, sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'center';
      ctx.fillText(trans.name, trans.x, trans.y + 30);
    });
  }, [model]);

  const drawFTABox = useCallback((ctx: CanvasRenderingContext2D) => {
    const boxX = 10;
    const boxY = 10;
    const boxW = 140;
    const boxH = 55;

    ctx.shadowColor = 'rgba(220, 38, 38, 0.3)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;

    const ftaGradient = ctx.createLinearGradient(boxX, boxY, boxX + boxW, boxY + boxH);
    ftaGradient.addColorStop(0, '#fef2f2');
    ftaGradient.addColorStop(1, '#fee2e2');
    ctx.fillStyle = ftaGradient;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 6);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 6);
    ctx.stroke();

    const cx = boxX + boxW / 2;
    ctx.fillStyle = '#991b1b';
    ctx.font = '700 13px Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FTA ANALYSIS', cx, boxY + 18);
    ctx.font = '500 11px Roboto, sans-serif';
    ctx.fillStyle = '#7f1d1d';
    ctx.fillText('System Failure', cx, boxY + 33);
    ctx.font = '700 14px Roboto, monospace';
    ctx.fillStyle = '#dc2626';
    ctx.fillText(`P = ${(ftaProbability * 100).toFixed(1)}%`, cx, boxY + 49);
  }, [ftaProbability]);

  useEffect(() => {
    let animationId: number;
    let lastTime = 0;

    const animate = (time: number) => {
      if (time - lastTime > 50) {
        draw();
        lastTime = time;
      }
      animationId = requestAnimationFrame(animate);
    };

    animate(0);
    return () => cancelAnimationFrame(animationId);
  }, [draw]);

  const handleZoomOut = () => setZoom(z => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(1)));
  const handleZoomIn = () => setZoom(z => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(1)));
  const handleZoomReset = () => setZoom(1.0);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="block mx-auto bg-white border border-gray-200 rounded"
        data-testid={`canvas-${modelType}`}
      />
      <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-white/90 border border-gray-300 rounded-md shadow-sm px-1 py-0.5" data-testid={`zoom-controls-${modelType}`}>
        <button
          onClick={handleZoomOut}
          disabled={zoom <= ZOOM_MIN}
          className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          data-testid={`button-zoom-out-${modelType}`}
          title="Zoom out"
        >
          <ZoomOut className="w-4 h-4 text-gray-600" />
        </button>
        <span className="text-xs font-medium text-gray-500 min-w-[36px] text-center" data-testid={`text-zoom-level-${modelType}`}>
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          disabled={zoom >= ZOOM_MAX}
          className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          data-testid={`button-zoom-in-${modelType}`}
          title="Zoom in"
        >
          <ZoomIn className="w-4 h-4 text-gray-600" />
        </button>
        <button
          onClick={handleZoomReset}
          disabled={zoom === 1.0}
          className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          data-testid={`button-zoom-reset-${modelType}`}
          title="Reset zoom"
        >
          <RotateCcw className="w-3.5 h-3.5 text-gray-600" />
        </button>
      </div>
    </div>
  );
}
