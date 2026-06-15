import { Shield, Flame, Package, Users, Wrench, Layers, Check } from "lucide-react";
import type { MitigationType, MitigationConfigs } from "@shared/schema";

interface MitigationPanelProps {
  activeMitigations: Set<MitigationType>;
  mitigationConfigs: MitigationConfigs;
  onToggleMitigation: (type: MitigationType) => void;
}

const MITIGATION_INFO: Record<MitigationType, { name: string; desc: string; icon: typeof Shield }> = {
  backup: { name: 'Automated Backup System', desc: '15-min recovery from ransomware', icon: Shield },
  firewall: { name: 'Advanced Firewall & IDS', desc: 'AI-powered threat detection', icon: Flame },
  buffer: { name: '30-Day Buffer Inventory', desc: 'Strategic reserves for disruptions', icon: Package },
  dual: { name: 'Dual Sourcing Strategy', desc: 'Backup suppliers with 48hr activation', icon: Users },
  maintenance: { name: 'Predictive Maintenance', desc: 'IoT/ML equipment monitoring', icon: Wrench },
  redundancy: { name: 'Equipment Redundancy', desc: 'Hot-swappable backup systems', icon: Layers },
};

function formatCost(cost: number): string {
  if (cost >= 1000) {
    return `$${(cost / 1000).toFixed(0)}K${cost >= 10000 ? '' : '/mo'}`;
  }
  return `$${cost}`;
}

export function MitigationPanel({
  activeMitigations,
  mitigationConfigs,
  onToggleMitigation,
}: MitigationPanelProps) {
  const mitigationTypes: MitigationType[] = ['backup', 'firewall', 'buffer', 'dual', 'maintenance', 'redundancy'];

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 mb-6">
      <h3 className="text-base font-semibold text-gray-800 mb-5 uppercase tracking-wider">
        Risk Mitigation Strategies
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mitigationTypes.map(type => {
          const isActive = activeMitigations.has(type);
          const info = MITIGATION_INFO[type];
          const cost = mitigationConfigs[type].cost;
          const Icon = info.icon;

          return (
            <button
              key={type}
              type="button"
              className={`
                flex items-center p-4 bg-white border-2 rounded-lg transition-all cursor-pointer text-left w-full
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                ${isActive 
                  ? 'bg-emerald-100 border-emerald-600 shadow-md' 
                  : 'border-gray-200 hover:border-blue-400 hover:-translate-y-0.5 hover:shadow-lg'
                }
              `}
              onClick={() => onToggleMitigation(type)}
              data-testid={`mitigation-${type}`}
            >
              <div className={`p-2 rounded-full mr-3 flex-shrink-0 ${isActive ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {isActive ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-800 text-sm">{info.name}</div>
                <div className="text-gray-500 text-xs">{info.desc}</div>
              </div>
              <div className={`font-bold text-sm ml-2 px-2 py-1 rounded ${isActive ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                {formatCost(cost)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
