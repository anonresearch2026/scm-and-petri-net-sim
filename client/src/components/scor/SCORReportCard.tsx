import { Button } from "@/components/ui/button";
import { Download, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Target, Shield, Info } from "lucide-react";
import type { SCORAssessmentReport, SCORGrade, SCORProcessAssessment } from "@shared/schema";

interface SCORReportCardProps {
  report: SCORAssessmentReport;
}

const GRADE_COLORS: Record<SCORGrade, { bg: string; text: string; border: string }> = {
  A: { bg: "bg-emerald-700", text: "text-white", border: "border-emerald-600" },
  B: { bg: "bg-blue-700", text: "text-white", border: "border-blue-600" },
  C: { bg: "bg-amber-600", text: "text-white", border: "border-amber-500" },
  D: { bg: "bg-orange-700", text: "text-white", border: "border-orange-600" },
  F: { bg: "bg-red-700", text: "text-white", border: "border-red-600" },
};

const GRADE_BG_LARGE: Record<SCORGrade, string> = {
  A: "from-emerald-700 to-emerald-900",
  B: "from-blue-700 to-blue-900",
  C: "from-amber-600 to-amber-800",
  D: "from-orange-700 to-orange-900",
  F: "from-red-700 to-red-900",
};

const FINDING_ICONS: Record<string, typeof TrendingUp> = {
  strength: CheckCircle,
  weakness: AlertTriangle,
  opportunity: TrendingUp,
  threat: TrendingDown,
};

const FINDING_COLORS: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  strength: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", badge: "text-emerald-800" },
  weakness: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", badge: "text-red-800" },
  opportunity: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", badge: "text-blue-800" },
  threat: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", badge: "text-amber-800" },
};

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  immediate: { label: "Immediate", color: "bg-red-100 text-red-700" },
  short_term: { label: "Short Term", color: "bg-amber-100 text-amber-700" },
  long_term: { label: "Long Term", color: "bg-gray-100 text-gray-700" },
};

const METRIC_TOOLTIPS: Record<string, string> = {
  "rl_1_1": "Percentage of orders delivered complete, on time, undamaged, with correct documentation",
  "rs_1_1": "Average time from order placement to delivery, measured in business days",
  "ag_1_1": "Number of days needed to achieve an unplanned 20% increase in deliveries",
  "co_1_1": "Total disruption cost comparing traditional vs integrated cyber-physical models",
  "am_1_1": "Return on investment from active mitigation controls relative to their cost",
};

export function SCORReportCard({ report }: SCORReportCardProps) {
  const handleExportCSV = () => {
    const rows = [
      ["SCOR Assessment Report", report.scenarioName],
      ["Generated", report.generatedAt],
      ["Overall Grade", report.overallGrade],
      ["Overall Score", report.overallScore.toString()],
      [],
      ["Process", "Grade", "Risk Exposure", "Mitigation Coverage", "Cyber Risk"],
      ...report.processAssessments.map(p => [
        p.processName, p.overallGrade, `${p.riskExposure}%`, `${p.mitigationCoverage}%`, `${p.cyberPhysicalRisk}%`
      ]),
      [],
      ["Cost Metric", "Value"],
      ["Expected Annual Loss", `$${report.costAnalysis.expectedAnnualLoss.toLocaleString()}`],
      ["95% Value at Risk", `$${report.costAnalysis.valueAtRisk95.toLocaleString()}`],
      ["Mitigation ROI", `${report.costAnalysis.mitigationROI}%`],
      ["Traditional Model Gap", `${report.costAnalysis.underestimationGap}%`],
      [],
      ["Priority", "Category", "Action", "Expected Impact", "Target Process"],
      ...report.recommendations.map(r => [
        r.priority.toString(), r.category, r.action, r.expectedImpact, r.targetProcess
      ]),
    ];

    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scor-report-${report.scenarioName.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6" data-testid="scor-report-card">
      <div className={`bg-gradient-to-r ${GRADE_BG_LARGE[report.overallGrade]} text-white p-8 rounded-xl`}>
        <div className="flex items-center gap-6 flex-wrap">
          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center" data-testid="text-overall-grade">
            <span className="text-5xl font-bold">{report.overallGrade}</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-1">Supply Chain Resilience Score</h2>
            <p className="text-3xl font-semibold opacity-90" data-testid="text-overall-score">{report.overallScore}/100</p>
            <p className="text-sm opacity-75 mt-1">{report.scenarioName} | {report.simulationDays}-day simulation | {report.monteCarloIterations.toLocaleString()} iterations</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3">SCOR Process Grades</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {report.processAssessments.map(p => (
            <ProcessGradeCard key={p.processId} assessment={p} />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3">SCOR Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {report.metrics.map(m => {
            const tooltipKey = m.id || "";
            const tooltip = METRIC_TOOLTIPS[tooltipKey];
            return (
              <div key={m.id} className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm" data-testid={`metric-${m.id}`}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-medium text-gray-500 uppercase">{m.category}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${GRADE_COLORS[m.grade].bg} ${GRADE_COLORS[m.grade].text}`}>
                    {m.grade}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="text-sm font-medium text-gray-900">{m.name}</div>
                  {tooltip && (
                    <div className="relative group">
                      <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                        {tooltip}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <div className="text-xs text-gray-400">Baseline</div>
                    <div className="font-mono text-sm text-gray-600">{m.unit === "$" ? `$${m.baseline.toLocaleString()}` : `${m.baseline}${m.unit}`}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400">Simulated</div>
                    <div className="font-mono text-sm font-semibold text-gray-900">{m.unit === "$" ? `$${m.simulated.toLocaleString()}` : `${m.simulated}${m.unit}`}</div>
                  </div>
                  <div className={`text-xs font-semibold ${m.impactDirection === "positive" ? "text-emerald-600" : m.impactDirection === "negative" ? "text-red-600" : "text-gray-500"}`}>
                    {m.impactPercent > 0 ? "+" : ""}{m.impactPercent}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {report.keyFindings.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Key Findings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {report.keyFindings.map((f, i) => {
              const Icon = FINDING_ICONS[f.type] || AlertTriangle;
              const colors = FINDING_COLORS[f.type] || FINDING_COLORS.threat;
              return (
                <div key={i} className={`${colors.bg} border ${colors.border} rounded-lg p-4`} data-testid={`finding-${f.type}-${i}`}>
                  <div className="flex items-start gap-3">
                    <Icon className={`w-5 h-5 ${colors.text} shrink-0 mt-0.5`} />
                    <div>
                      <div className={`font-semibold text-sm ${colors.badge}`}>{f.title}</div>
                      <div className={`text-xs mt-1 ${colors.text} opacity-80`}>{f.description}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${f.priority === "high" ? "bg-red-100 text-red-700" : f.priority === "medium" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"}`}>
                          {f.priority}
                        </span>
                        {f.relatedProcess && (
                          <span className="text-xs text-gray-500">{f.relatedProcess.toUpperCase()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Financial Impact</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <CostCard
            label="Expected Annual Loss"
            value={`$${report.costAnalysis.expectedAnnualLoss.toLocaleString()}`}
            icon={<TrendingDown className="w-5 h-5 text-red-500" />}
          />
          <CostCard
            label="95% Value at Risk"
            value={`$${report.costAnalysis.valueAtRisk95.toLocaleString()}`}
            icon={<AlertTriangle className="w-5 h-5 text-orange-500" />}
          />
          <CostCard
            label="Mitigation ROI"
            value={`${report.costAnalysis.mitigationROI}%`}
            icon={<TrendingUp className="w-5 h-5 text-green-500" />}
          />
          <CostCard
            label="Traditional Model Gap"
            value={`${report.costAnalysis.underestimationGap}%`}
            icon={<Target className="w-5 h-5 text-purple-500" />}
          />
        </div>
      </div>

      {report.recommendations.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Recommended Actions</h3>
          <div className="space-y-3">
            {report.recommendations.map((r, i) => {
              const cat = CATEGORY_LABELS[r.category] || CATEGORY_LABELS.long_term;
              return (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm" data-testid={`recommendation-${i}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-gray-700">#{r.priority}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${cat.color}`}>{cat.label}</span>
                        <span className="text-xs text-gray-500">{r.targetProcess.toUpperCase()}</span>
                      </div>
                      <div className="text-sm font-medium text-gray-800">{r.action}</div>
                      <div className="text-xs text-gray-500 mt-1">{r.expectedImpact}</div>
                      <div className="text-xs text-gray-400 mt-1">Est. cost: {r.estimatedCost}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button variant="outline" size="sm" onClick={handleExportCSV} data-testid="button-export-report-csv">
          <Download className="w-4 h-4 mr-2" />
          Export Report (CSV)
        </Button>
      </div>
    </div>
  );
}

function ProcessGradeCard({ assessment }: { assessment: SCORProcessAssessment }) {
  const colors = GRADE_COLORS[assessment.overallGrade];
  return (
    <div className={`${colors.bg} border ${colors.border} rounded-lg p-3 text-center`} data-testid={`process-grade-${assessment.processId}`}>
      <div className={`text-2xl font-bold ${colors.text}`}>{assessment.overallGrade}</div>
      <div className={`text-xs font-semibold ${colors.text} mt-1`}>{assessment.processName}</div>
      <div className="mt-2 space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-white/70">Risk</span>
          <span className={colors.text}>{assessment.riskExposure}%</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-white/70">Covered</span>
          <span className={colors.text}>{assessment.mitigationCoverage}%</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-white/70">Cyber</span>
          <span className={colors.text}>{assessment.cyberPhysicalRisk}%</span>
        </div>
      </div>
    </div>
  );
}

function CostCard({ label, value, icon }: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
    </div>
  );
}