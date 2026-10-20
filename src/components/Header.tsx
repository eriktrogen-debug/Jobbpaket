import React from 'react';
import { 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Plus, 
  RotateCcw, 
  Sun, 
  Moon, 
  FileDown, 
  Layers,
  Wrench,
  Tv,
  ExternalLink,
  LogOut,
  Scale,
  UserCheck
} from 'lucide-react';
import { WorkOrder } from '../types.ts';
import { AuthenticatedUser } from '../utils/security.ts';
import { RIGHTS_HOLDER } from '../utils/legalTerms.ts';

interface HeaderProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  workOrders: WorkOrder[];
  onNewWorkOrder: () => void;
  onOpenImport: () => void;
  onOpenTemplates: () => void;
  onResetData: () => void;
  onExportStandaloneHtml: () => void;
  onOpenDashboard: () => void;
  onOpenDashboardNewWindow: () => void;
  currentUser?: AuthenticatedUser | null;
  onLogout: () => void;
  onOpenTermsModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  onToggleTheme,
  workOrders,
  onNewWorkOrder,
  onOpenImport,
  onOpenTemplates,
  onResetData,
  onExportStandaloneHtml,
  onOpenDashboard,
  onOpenDashboardNewWindow,
  currentUser,
  onLogout,
  onOpenTermsModal,
}) => {
  const totalCount = workOrders.length;
  const blockedGate3Count = workOrders.filter(
    (wo) => wo.currentGate === 3 && wo.status === 'Blockerad'
  ).length;
  const inExecutionCount = workOrders.filter((wo) => wo.currentGate === 4).length;
  const readyGate5Count = workOrders.filter((wo) => wo.currentGate === 5).length;

  return (
    <header className="border-b transition-colors bg-white/95 dark:bg-zinc-900/95 border-zinc-200 dark:border-zinc-800 sticky top-0 z-30 backdrop-blur">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Title */}
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-sm">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 uppercase">
                Jobbpaket & Leveranskontroll
              </h1>
              <span className="text-xs px-2 py-0.5 rounded font-mono font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">
                Maximo ↔ Medius
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Underhållsplanering med Gate 1–5 & Obligatorisk Materialspärr
            </p>
          </div>
        </div>

        {/* Quick KPI stats */}
        <div className="hidden lg:flex items-center space-x-3 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 flex items-center space-x-2">
            <Layers className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-zinc-500 dark:text-zinc-400">Totalt AO:</span>
            <span className="font-bold text-zinc-900 dark:text-zinc-100">{totalCount}</span>
          </div>

          <div className={`px-3 py-1.5 rounded-md border flex items-center space-x-2 ${
            blockedGate3Count > 0 
              ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 font-bold' 
              : 'bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
          }`}>
            <ShieldAlert className={`w-3.5 h-3.5 ${blockedGate3Count > 0 ? 'text-red-600 dark:text-red-400 animate-pulse' : 'text-zinc-400'}`} />
            <span>Gate 3 Spärr:</span>
            <span className="font-bold">{blockedGate3Count}</span>
          </div>

          <div className="px-3 py-1.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 flex items-center space-x-2">
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>I fält (Gate 4):</span>
            <span className="font-bold">{inExecutionCount}</span>
          </div>

          <div className="px-3 py-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 flex items-center space-x-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Medius-attest (G5):</span>
            <span className="font-bold">{readyGate5Count}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {/* New AO button */}
          <button
            onClick={onNewWorkOrder}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-xs shadow-sm transition-colors cursor-pointer"
            title="Skapa nytt jobbpaket / AO"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Ny AO</span>
          </button>

          {/* Import Maximo / Excel button */}
          <button
            onClick={onOpenImport}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-xs shadow-sm transition-colors cursor-pointer"
            title="Direktimportera från Maximo eller Excel/CSV"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Importera Maximo/Excel</span>
            <span className="md:hidden">Importera</span>
          </button>

          {/* Live Dashboard for TV / Teams Screen Share */}
          <div className="flex items-center rounded-md bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow-sm overflow-hidden">
            <button
              onClick={onOpenDashboard}
              className="flex items-center space-x-1.5 px-3 py-1.5 hover:from-blue-800 hover:to-indigo-800 font-medium text-xs transition-colors cursor-pointer"
              title="Öppna Driftcentral & Stoppvecka Dashboard för möten och storskärm"
            >
              <Tv className="w-3.5 h-3.5 text-blue-200" />
              <span className="hidden sm:inline font-bold">Storskärm / Teams</span>
              <span className="sm:hidden font-bold">Dashboard</span>
            </button>
            <button
              onClick={onOpenDashboardNewWindow}
              className="px-2 py-1.5 bg-black/20 hover:bg-black/40 border-l border-white/20 transition-colors cursor-pointer"
              title="Öppna dashboard i ett separat nytt fönster (för TV/extern skärm)"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-100" />
            </button>
          </div>

          {/* Templates library button */}
          <button
            onClick={onOpenTemplates}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-medium text-xs shadow-sm transition-colors cursor-pointer"
            title="Hantera och använd sparade Jobbmallar"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Jobbmallar</span>
          </button>

          {/* Export Standalone HTML */}
          <button
            onClick={onExportStandaloneHtml}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 font-medium text-xs transition-colors cursor-pointer"
            title="Ladda ner som fristående offline HTML-fil"
          >
            <FileDown className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden lg:inline">Exportera HTML</span>
          </button>

          {/* Reset Demo Data */}
          <button
            onClick={onResetData}
            className="p-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700 text-xs transition-colors cursor-pointer"
            title="Återställ till förifyllda exempelorder"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Theme Switcher */}
          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 transition-colors cursor-pointer"
            title={theme === 'dark' ? 'Växla till ljust läge' : 'Växla till mörkt läge'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-zinc-700" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
