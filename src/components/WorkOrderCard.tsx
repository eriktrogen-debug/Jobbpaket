import { 
  Lock, 
  MapPin, 
  User, 
  Printer, 
  ArrowRight, 
  PackageCheck, 
  ShieldCheck, 
  Layers,
  Server,
  Send,
  ScrollText,
  CheckCircle2
} from 'lucide-react';
import { WorkOrder } from '../types.ts';
import { checkGate3Requirements } from '../utils/storage.ts';

interface WorkOrderCardProps {
  order: WorkOrder;
  onSelect: (order: WorkOrder) => void;
  onPrint: (order: WorkOrder) => void;
  onExportToMaximo?: (order: WorkOrder) => void;
}

export const WorkOrderCard: React.FC<WorkOrderCardProps> = ({
  order,
  onSelect,
  onPrint,
  onExportToMaximo,
}) => {
  const gate3Validation = checkGate3Requirements(order);
  const isGate3Blocked = order.currentGate === 3 && !gate3Validation.isSatisfied;

  // Level badge styling
  const getLevelBadge = (lvl: WorkOrder['level']) => {
    switch (lvl) {
      case 'Nivå 1':
        return {
          label: 'Nivå 1 (<4h Löpande)',
          bg: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800',
        };
      case 'Nivå 2':
        return {
          label: 'Nivå 2 (Veckounderhåll)',
          bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
        };
      case 'Nivå 3':
        return {
          label: 'Nivå 3 (Stopp / Projekt)',
          bg: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800',
        };
    }
  };

  // Status color pill
  const getStatusStyle = (status: WorkOrder['status']) => {
    switch (status) {
      case 'Klar':
        return {
          text: 'Klar',
          dot: 'bg-emerald-500',
          badge: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
        };
      case 'Pågående':
        return {
          text: 'Pågående',
          dot: 'bg-amber-500',
          badge: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
        };
      case 'Blockerad':
        return {
          text: 'Blockerad / Saknas',
          dot: 'bg-red-500',
          badge: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800 animate-pulse',
        };
    }
  };

  const levelInfo = getLevelBadge(order.level);
  const statusInfo = getStatusStyle(order.status);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all group">
      {/* Top Banner with AO-ID & Status */}
      <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 bg-zinc-50/60 dark:bg-zinc-900/40">
        <div className="flex items-center space-x-2.5">
          <span className="font-mono text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-wider">
            {order.id}
          </span>
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${levelInfo.bg}`}>
            {levelInfo.label}
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono">
            Prio: {order.priority}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Status Badge (Grön / Gul / Röd) */}
          <div className={`flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-full font-medium border ${statusInfo.badge}`}>
            <span className={`w-2 h-2 rounded-full ${statusInfo.dot}`}></span>
            <span>{statusInfo.text}</span>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-4 sm:p-5">
        <h3 
          onClick={() => onSelect(order)}
          className="text-base font-bold text-zinc-900 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer mb-2 line-clamp-2"
        >
          {order.title}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-600 dark:text-zinc-400 mb-4">
          <div className="flex items-center space-x-1.5 truncate">
            <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="truncate">{order.facility} ({order.position})</span>
          </div>

          <div className="flex items-center space-x-1.5 truncate">
            <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="truncate">Beredare: {order.planner}</span>
          </div>

          <div className="flex items-center space-x-1.5 truncate font-mono">
            <Layers className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span>Fönster: {order.stopWindow || 'Löpande plan'}</span>
          </div>

          <div className="flex items-center space-x-1.5 truncate">
            <PackageCheck className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span>
              Material: {order.materials.length} art. ({order.materials.filter(m => m.inStock).length} i lager)
            </span>
          </div>

          <div className="flex items-center space-x-1.5 truncate">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>
              Uppgifter: {(order.tasks || []).filter(t => t.completed).length}/{(order.tasks || []).length} klara
            </span>
          </div>

          <div className="flex items-center space-x-1.5 truncate sm:col-span-2">
            <ScrollText className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
              Maximo Arbetslogg: {order.maximoWorkLog?.length || 0} st händelser
            </span>
          </div>
        </div>

        {/* 5-Gate Stepper Progress */}
        <div className="my-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 mb-1.5">
            <span>Processförlopp</span>
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
              Gate {order.currentGate} av 5
            </span>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {[1, 2, 3, 4, 5].map((gNum) => {
              const isPast = gNum < order.currentGate;
              const isCurrent = gNum === order.currentGate;
              
              let barColor = 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400';
              if (isPast) {
                barColor = 'bg-emerald-500 text-white';
              } else if (isCurrent) {
                if (order.status === 'Blockerad') {
                  barColor = 'bg-red-500 text-white animate-pulse';
                } else if (order.status === 'Klar') {
                  barColor = 'bg-emerald-500 text-white';
                } else {
                  barColor = 'bg-amber-500 text-white';
                }
              }

              return (
                <div
                  key={gNum}
                  className={`h-6 rounded flex items-center justify-center text-[10px] font-bold font-mono transition-colors ${barColor}`}
                  title={`Gate ${gNum}`}
                >
                  G{gNum}
                  {gNum === 3 && isGate3Blocked && (
                    <Lock className="w-2.5 h-2.5 ml-0.5 inline text-white" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Gate 3 Lock Warning Banner (if currently blocked in Gate 3) */}
        {isGate3Blocked && (
          <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800/80 text-red-800 dark:text-red-200 text-xs">
            <div className="flex items-center space-x-1.5 font-bold mb-1">
              <Lock className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span>SPÄRR: Leveranskontroll ej komplett</span>
            </div>
            <p className="text-[11px] text-red-700 dark:text-red-300">
              {gate3Validation.missingItems[0]}
              {gate3Validation.missingItems.length > 1 && ` (+${gate3Validation.missingItems.length - 1} till)`}
            </p>
          </div>
        )}

        {/* Gate 3 Passed indicator */}
        {order.gate3Approved && order.currentGate >= 3 && (
          <div className="mt-3 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between">
            <span className="flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold">Gate 3 Godkänd:</span>
              <span className="text-[11px] font-mono">{order.materialInspection.shelfLocation || 'Kittad'}</span>
            </span>
            <span className="text-[10px] text-zinc-500">{order.gate3ApprovedDate?.split(' ')[0]}</span>
          </div>
        )}
        {/* Tasks and Maximo Worklog info bar */}
        <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-500">
          <span className="flex items-center space-x-1" title="Maximo Tasks / Arbetsmoment">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>{(order.tasks || []).filter(t => t.completed).length}/{(order.tasks || []).length} moment klara</span>
          </span>
          <span className="flex items-center space-x-1 text-zinc-400" title="Poster i Maximo Arbetslogg">
            <ScrollText className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span>{order.maximoWorkLog?.length || 0} loggposter</span>
          </span>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-4 sm:px-5 py-3 bg-zinc-50 dark:bg-zinc-900/60 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => onPrint(order)}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 text-xs font-medium transition-colors cursor-pointer"
            title="Skriv ut / Stoppärmsblad"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Skriv ut</span>
          </button>

          {onExportToMaximo && (
            <button
              onClick={() => onExportToMaximo(order)}
              className="flex items-center space-x-1 px-2 py-1.5 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-300/60 dark:border-emerald-800/60 text-xs font-semibold transition-colors cursor-pointer"
              title="Synka denna arbetsorder tillbaka till Maximo"
            >
              <Send className="w-3 h-3" />
              <span className="hidden sm:inline">Synka Maximo</span>
            </button>
          )}
        </div>

        <button
          onClick={() => onSelect(order)}
          className="flex items-center space-x-1 px-3.5 py-1.5 rounded-md bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-semibold shadow-sm transition-colors cursor-pointer"
        >
          <span>Öppna Jobbpaket</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
