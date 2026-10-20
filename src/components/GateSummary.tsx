import React from 'react';
import { 
  FileCheck2, 
  ClipboardList, 
  Lock, 
  Hammer, 
  Receipt,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';
import { GateNumber, GATES_DEFINITION, WorkOrder } from '../types.ts';

interface GateSummaryProps {
  workOrders: WorkOrder[];
  selectedGateFilter: GateNumber | 'ALL';
  onSelectGateFilter: (gate: GateNumber | 'ALL') => void;
}

export const GateSummary: React.FC<GateSummaryProps> = ({
  workOrders,
  selectedGateFilter,
  onSelectGateFilter,
}) => {
  const getGateIcon = (gateNum: GateNumber) => {
    switch (gateNum) {
      case 1:
        return <FileCheck2 className="w-4 h-4" />;
      case 2:
        return <ClipboardList className="w-4 h-4" />;
      case 3:
        return <Lock className="w-4 h-4 text-red-500" />;
      case 4:
        return <Hammer className="w-4 h-4" />;
      case 5:
        return <Receipt className="w-4 h-4" />;
    }
  };

  const getGateOrders = (gateNum: GateNumber) => {
    return workOrders.filter((wo) => wo.currentGate === gateNum);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>Gate-Översikt & Processflöde</span>
            <span className="text-xs font-normal normal-case text-zinc-500 dark:text-zinc-400">
              (Klicka på en gate för att filtrera listan)
            </span>
          </h2>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onSelectGateFilter('ALL')}
            className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              selectedGateFilter === 'ALL'
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            Visa Alla ({workOrders.length})
          </button>
        </div>
      </div>

      {/* Grid of 5 Gates */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {GATES_DEFINITION.map((gate, index) => {
          const ordersInGate = getGateOrders(gate.number);
          const hasBlocked = ordersInGate.some((wo) => wo.status === 'Blockerad');
          const isSelected = selectedGateFilter === gate.number;

          return (
            <div
              key={gate.number}
              onClick={() => onSelectGateFilter(isSelected ? 'ALL' : gate.number)}
              className={`relative rounded-lg p-3 border transition-all cursor-pointer select-none flex flex-col justify-between ${
                isSelected
                  ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30 ring-2 ring-blue-500/20'
                  : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/60'
              }`}
            >
              {/* Header inside card */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-200">
                    <span className="p-1 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                      {getGateIcon(gate.number)}
                    </span>
                    <span>G{gate.number}</span>
                  </span>

                  <span
                    className={`text-xs font-mono px-2 py-0.5 rounded-full font-bold ${
                      ordersInGate.length === 0
                        ? 'bg-zinc-200/70 dark:bg-zinc-800 text-zinc-500'
                        : hasBlocked
                        ? 'bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700'
                        : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100'
                    }`}
                  >
                    {ordersInGate.length} AO
                  </span>
                </div>

                <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                  {gate.subtitle}
                </div>

                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-tight">
                  {gate.shortDesc}
                </div>
              </div>

              {/* Status / Alert banner */}
              <div className="mt-3 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/80 flex items-center justify-between text-[11px]">
                {gate.number === 3 ? (
                  <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-bold">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Hård Spärr</span>
                  </span>
                ) : (
                  <span className="text-zinc-400 dark:text-zinc-500 font-mono">
                    Steg {gate.number}/5
                  </span>
                )}

                {hasBlocked ? (
                  <span className="text-red-600 dark:text-red-400 font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                    Blockerad
                  </span>
                ) : ordersInGate.length > 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Aktiv
                  </span>
                ) : (
                  <span className="text-zinc-400">Inga</span>
                )}
              </div>

              {/* Next arrow connector on desktop */}
              {index < GATES_DEFINITION.length - 1 && (
                <div className="hidden md:flex absolute -right-2.5 top-1/2 -translate-y-1/2 z-10 text-zinc-300 dark:text-zinc-700 pointer-events-none">
                  <ChevronRight className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
