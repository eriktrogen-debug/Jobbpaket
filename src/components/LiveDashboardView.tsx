import React, { useState, useEffect } from 'react';
import {
  Tv,
  Maximize2,
  Minimize2,
  Copy,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  Search,
  Filter,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  X,
  Lock,
  Flame,
  Wrench,
  CheckSquare,
  Square,
  ArrowRight,
  Kanban,
  Table as TableIcon,
  Sparkles,
  Share2,
  Calendar,
  UserCheck,
  Building2,
  MapPin,
  ClipboardList
} from 'lucide-react';
import { WorkOrder, GateNumber, WorkOrderLevel, GATES_DEFINITION } from '../types.ts';
import { checkGate3Requirements, logTaskCompletionToMaximo, saveWorkOrders } from '../utils/storage.ts';

interface LiveDashboardViewProps {
  workOrders: WorkOrder[];
  onUpdateWorkOrders: (orders: WorkOrder[]) => void;
  onSelectOrderForEditor?: (order: WorkOrder) => void;
  onExitDashboard?: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  isStandaloneWindow?: boolean;
}

export const LiveDashboardView: React.FC<LiveDashboardViewProps> = ({
  workOrders,
  onUpdateWorkOrders,
  onSelectOrderForEditor,
  onExitDashboard,
  theme,
  onToggleTheme,
  isStandaloneWindow = false,
}) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'table' | 'focus'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGate, setFilterGate] = useState<GateNumber | 'ALL'>('ALL');
  const [filterLevel, setFilterLevel] = useState<WorkOrderLevel | 'ALL'>('ALL');
  const [filterOnlyBlocked, setFilterOnlyBlocked] = useState(false);
  const [filterOnlyExecution, setFilterOnlyExecution] = useState(false);
  const [selectedDetailOrder, setSelectedDetailOrder] = useState<WorkOrder | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen to fullscreen changes
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleCopyTeamsLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'dashboard');
    navigator.clipboard.writeText(url.toString()).then(() => {
      setCopiedLink(true);
      triggerToast('Teams-länk kopierad till urklipp! Dela den i Teams-mötet.');
      setTimeout(() => setCopiedLink(false), 3000);
    }).catch(() => {
      triggerToast('Kunde inte kopiera länk automatiskt.');
    });
  };

  const handleOpenNewWindow = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'dashboard');
    window.open(url.toString(), '_blank', 'noopener,noreferrer');
  };

  // KPI Calculations
  const totalOrders = workOrders.length;
  const blockedGate3Orders = workOrders.filter((wo) => {
    if (wo.currentGate !== 3) return false;
    const req = checkGate3Requirements(wo);
    return !req.isSatisfied || wo.status === 'Blockerad';
  });
  const gate3ReadyOrders = workOrders.filter((wo) => {
    if (wo.currentGate !== 3) return false;
    const req = checkGate3Requirements(wo);
    return req.isSatisfied && wo.status !== 'Blockerad';
  });
  const gate4ExecutionOrders = workOrders.filter((wo) => wo.currentGate === 4);
  const gate5ClosedOrders = workOrders.filter((wo) => wo.currentGate === 5);

  // In-field task progress across all orders
  const allTasks = workOrders.flatMap((wo) => wo.tasks || []);
  const completedTasks = allTasks.filter((t) => t.completed);
  const taskProgressPercent = allTasks.length > 0
    ? Math.round((completedTasks.length / allTasks.length) * 100)
    : 0;

  // Filtered orders
  const filteredOrders = workOrders.filter((order) => {
    if (filterGate !== 'ALL' && order.currentGate !== filterGate) return false;
    if (filterLevel !== 'ALL' && order.level !== filterLevel) return false;
    if (filterOnlyBlocked) {
      const isBlocked = order.status === 'Blockerad' || (order.currentGate === 3 && !checkGate3Requirements(order).isSatisfied);
      if (!isBlocked) return false;
    }
    if (filterOnlyExecution && order.currentGate !== 4) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchId = order.id.toLowerCase().includes(q);
      const matchTitle = order.title.toLowerCase().includes(q);
      const matchPos = order.position.toLowerCase().includes(q);
      const matchFacility = order.facility.toLowerCase().includes(q);
      const matchPlanner = (order.planner || '').toLowerCase().includes(q);
      if (!matchId && !matchTitle && !matchPos && !matchFacility && !matchPlanner) return false;
    }
    return true;
  });

  // Handler to toggle a task directly from the dashboard modal and log to Maximo
  const handleToggleTask = (targetOrderId: string, taskId: string) => {
    const updatedList = workOrders.map((ord) => {
      if (ord.id !== targetOrderId) return ord;

      const currentTasks = ord.tasks || [];
      const targetTask = currentTasks.find((t) => t.id === taskId);
      if (!targetTask) return ord;

      const willBeCompleted = !targetTask.completed;
      const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
      const currentUser = ord.planner || 'Fälttekniker (Teams Dashboard)';

      const updatedTasks = currentTasks.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            completed: willBeCompleted,
            completedAt: willBeCompleted ? now : undefined,
            completedBy: willBeCompleted ? currentUser : undefined,
          };
        }
        return t;
      });

      let updated: WorkOrder = {
        ...ord,
        tasks: updatedTasks,
      };

      if (willBeCompleted) {
        const summaryText = `Uppgift klar: Task ${targetTask.taskNumber} - ${targetTask.description}`;
        const detailText = `Arbetsmoment kvitterat via Dashboard (Teams-vy) av ${currentUser} kl ${now}. Fack: ${targetTask.trade}, Est: ${targetTask.estimatedHours}h.`;
        const res = logTaskCompletionToMaximo(updated, summaryText, 'UPPGIFT', detailText, currentUser);
        updated = res.updatedOrder;
        triggerToast(`Task ${targetTask.taskNumber} kvitterad & loggad i Maximo WORKLOG!`);
      }

      return updated;
    });

    onUpdateWorkOrders(updatedList);
    saveWorkOrders(updatedList);

    // Keep selected detail order in sync
    const refreshed = updatedList.find((o) => o.id === targetOrderId);
    if (refreshed) {
      setSelectedDetailOrder(refreshed);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-blue-600 text-white font-semibold text-xs shadow-2xl flex items-center space-x-2 border border-blue-400 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP COMMAND HEADER (Optimized for TV & Teams screen share) */}
      <header className="border-b border-zinc-800 bg-zinc-900/90 backdrop-blur sticky top-0 z-40 px-4 sm:px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Brand & Mode Identification */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-900/40 border border-blue-400/30">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-lg font-black tracking-wider uppercase text-white font-mono">
                  Driftcentral & Stoppvecka Dashboard
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-1.5 inline-block"></span>
                  LIVE MAXIMO SYNK
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  TEAMS-LÄGE
                </span>
              </div>
              <p className="text-xs text-zinc-400 hidden sm:block">
                Realtidsöversikt för kontrollrum, morgonmöten och skärmdelning. Ändringar synkas direkt.
              </p>
            </div>
          </div>

          {/* Digital Clock & Teams Controls */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Live Clock */}
            <div className="hidden md:flex flex-col items-end pr-2 font-mono">
              <span className="text-sm font-bold text-zinc-200">
                {currentTime.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className="text-[10px] text-zinc-500 uppercase">
                {currentTime.toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
            </div>

            {/* Copy Teams Link */}
            <button
              onClick={handleCopyTeamsLink}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer ${
                copiedLink 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
              }`}
              title="Kopiera direktlänk till denna dashboard för delning i Microsoft Teams"
            >
              {copiedLink ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5 text-blue-400" />}
              <span className="hidden sm:inline">{copiedLink ? 'Länk kopierad!' : 'Dela Teams-länk'}</span>
            </button>

            {/* Open in New Separate Window */}
            {!isStandaloneWindow && (
              <button
                onClick={handleOpenNewWindow}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                title="Öppna denna dashboard i ett helt eget nytt webbläsarfönster för att dra till en extern skärm eller TV"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Nytt fönster</span>
              </button>
            )}

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors cursor-pointer"
              title={isFullscreen ? 'Lämna fullskärm' : 'Fullskärm för storskärm/TV (F11)'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4 text-amber-400" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Exit / Return to editor */}
            {onExitDashboard && (
              <button
                onClick={onExitDashboard}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-xs font-medium transition-colors cursor-pointer"
                title="Återgå till standard beredningsvy"
              >
                <span>Stäng</span>
                <X className="w-3.5 h-3.5 text-zinc-400" />
              </button>
            )}
          </div>
        </div>

        {/* METRICS / EXECUTIVE STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-3 pt-3 border-t border-zinc-800/80">
          {/* 1. Totalt jobb */}
          <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono text-zinc-400 block uppercase">Totalt Jobb</span>
              <span className="text-xl font-black text-white font-mono">{totalOrders}</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>

          {/* 2. Gate 3 Spärrade */}
          <div className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
            blockedGate3Orders.length > 0
              ? 'bg-red-950/40 border-red-800/80 text-red-200'
              : 'bg-zinc-900 border-zinc-800 text-zinc-400'
          }`}>
            <div>
              <span className="text-[11px] font-mono block uppercase font-bold">Gate 3 Spärr</span>
              <span className={`text-xl font-black font-mono ${blockedGate3Orders.length > 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                {blockedGate3Orders.length}
              </span>
            </div>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              blockedGate3Orders.length > 0 ? 'bg-red-900/60 text-red-300' : 'bg-zinc-800 text-zinc-500'
            }`}>
              <ShieldAlert className={`w-4 h-4 ${blockedGate3Orders.length > 0 ? 'animate-pulse' : ''}`} />
            </div>
          </div>

          {/* 3. Gate 3 Redo */}
          <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono text-zinc-400 block uppercase">Stoppredo (G3)</span>
              <span className="text-xl font-black text-emerald-400 font-mono">{gate3ReadyOrders.length}</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          {/* 4. Gate 4 I Utförande */}
          <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono text-amber-400 block uppercase font-bold">I Fält (Gate 4)</span>
              <span className="text-xl font-black text-amber-400 font-mono">{gate4ExecutionOrders.length}</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-950/60 border border-amber-800/40 text-amber-400 flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
          </div>

          {/* 5. In-field task progress */}
          <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-zinc-400 block uppercase">Uppgifter Klara</span>
              <span className="text-xs font-mono font-bold text-blue-400">{taskProgressPercent}%</span>
            </div>
            <div className="flex items-center space-x-2 mt-1">
              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full transition-all duration-500 rounded-full"
                  style={{ width: `${taskProgressPercent}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-zinc-400 whitespace-nowrap">
                {completedTasks.length}/{allTasks.length}
              </span>
            </div>
          </div>

          {/* 6. Gate 5 Slutbesiktning / Medius */}
          <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono text-zinc-400 block uppercase">Medius-attest (G5)</span>
              <span className="text-xl font-black text-indigo-400 font-mono">{gate5ClosedOrders.length}</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-indigo-950/60 border border-indigo-800/40 text-indigo-400 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* TOOLBAR: VIEW SWITCHER + SEARCH + QUICK FILTERS */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 mt-3 pt-3 border-t border-zinc-800/60">
          {/* View mode toggle */}
          <div className="flex items-center space-x-1 p-1 bg-zinc-800/70 rounded-xl border border-zinc-700/60">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Gate-tavla (Kanban)</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Matris / Tabell</span>
            </button>
            <button
              onClick={() => setViewMode('focus')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'focus'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Utförande & Säkerhetsfokus</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Sök AO, anläggning, position..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700/80 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-hidden focus:border-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2 text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick filter buttons */}
          <div className="flex items-center space-x-2 flex-wrap text-xs">
            <button
              onClick={() => {
                setFilterGate('ALL');
                setFilterLevel('ALL');
                setFilterOnlyBlocked(false);
                setFilterOnlyExecution(false);
                setSearchTerm('');
              }}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors cursor-pointer font-medium"
            >
              Alla ({totalOrders})
            </button>

            <button
              onClick={() => {
                setFilterOnlyBlocked(!filterOnlyBlocked);
                setFilterOnlyExecution(false);
              }}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                filterOnlyBlocked
                  ? 'bg-red-600 text-white ring-2 ring-red-400/30'
                  : 'bg-zinc-800 text-red-400 hover:bg-zinc-700'
              }`}
            >
              <ShieldAlert className="w-3 h-3" />
              <span>Spärrade ({blockedGate3Orders.length})</span>
            </button>

            <button
              onClick={() => {
                setFilterOnlyExecution(!filterOnlyExecution);
                setFilterOnlyBlocked(false);
              }}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                filterOnlyExecution
                  ? 'bg-amber-600 text-white ring-2 ring-amber-400/30'
                  : 'bg-zinc-800 text-amber-400 hover:bg-zinc-700'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>I fält ({gate4ExecutionOrders.length})</span>
            </button>

            {/* Level selection */}
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-mono"
            >
              <option value="ALL">Alla Nivåer</option>
              <option value="Nivå 1">Nivå 1 (Löpande)</option>
              <option value="Nivå 2">Nivå 2 (Vecko-UH)</option>
              <option value="Nivå 3">Nivå 3 (Stopp / Projekt)</option>
            </select>
          </div>
        </div>
      </header>

      {/* MAIN DASHBOARD CONTENT AREA */}
      <main className="flex-1 p-4 sm:p-6 overflow-x-auto">
        {/* VIEW MODE 1: KANBAN / GATE-TAVLA */}
        {viewMode === 'kanban' && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 min-w-[1100px] h-full items-start">
            {GATES_DEFINITION.map((gate) => {
              const gateOrders = filteredOrders.filter((o) => o.currentGate === gate.number);
              const isGate3 = gate.number === 3;
              const isGate4 = gate.number === 4;

              return (
                <div
                  key={gate.number}
                  className="flex flex-col bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-md min-h-[500px]"
                >
                  {/* Column Header */}
                  <div className={`p-3.5 border-b border-zinc-800 ${
                    isGate3 
                      ? 'bg-amber-950/30 border-b-amber-800/40' 
                      : isGate4 
                      ? 'bg-blue-950/30 border-b-blue-800/40' 
                      : 'bg-zinc-900'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
                          isGate3 
                            ? 'bg-amber-500 text-zinc-950 font-black' 
                            : isGate4 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-zinc-800 text-zinc-300'
                        }`}>
                          {gate.number}
                        </span>
                        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                          {gate.title.replace(`Gate ${gate.number}: `, '')}
                        </h2>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-xs font-mono font-bold">
                        {gateOrders.length}
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-400 mt-1 line-clamp-1">
                      {gate.subtitle}
                    </p>
                  </div>

                  {/* Column Body / Cards */}
                  <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-280px)]">
                    {gateOrders.length === 0 ? (
                      <div className="p-8 text-center text-xs text-zinc-600 font-mono border border-dashed border-zinc-800/80 rounded-xl">
                        Inga jobb i Gate {gate.number}
                      </div>
                    ) : (
                      gateOrders.map((order) => {
                        const gate3Req = checkGate3Requirements(order);
                        const isBlocked = order.status === 'Blockerad' || (order.currentGate === 3 && !gate3Req.isSatisfied);
                        const tasks = order.tasks || [];
                        const completedCount = tasks.filter((t) => t.completed).length;

                        return (
                          <div
                            key={order.id}
                            onClick={() => setSelectedDetailOrder(order)}
                            className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-sm hover:scale-[1.01] hover:shadow-lg ${
                              isBlocked
                                ? 'bg-red-950/30 border-red-700/80 hover:border-red-500'
                                : order.currentGate === 4
                                ? 'bg-zinc-900 border-blue-600/70 hover:border-blue-400'
                                : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                            }`}
                          >
                            {/* Card Header: AO & Level */}
                            <div className="flex items-center justify-between gap-1 mb-1.5">
                              <span className="font-mono font-bold text-xs text-blue-400">
                                {order.id}
                              </span>
                              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                                order.level === 'Nivå 3'
                                  ? 'bg-purple-900/60 text-purple-300 border border-purple-700/50'
                                  : order.level === 'Nivå 2'
                                  ? 'bg-blue-900/60 text-blue-300 border border-blue-700/50'
                                  : 'bg-zinc-800 text-zinc-300'
                              }`}>
                                {order.level}
                              </span>
                            </div>

                            {/* Title */}
                            <h3 className="text-xs font-bold text-zinc-100 line-clamp-2 leading-snug mb-2">
                              {order.title}
                            </h3>

                            {/* Position & Facility */}
                            <div className="flex items-center space-x-1.5 text-[11px] text-zinc-400 font-mono mb-2.5">
                              <MapPin className="w-3 h-3 text-zinc-500 shrink-0" />
                              <span className="truncate">{order.facility} • {order.position}</span>
                            </div>

                            {/* Gate 3 Blocker Alert Badge */}
                            {isGate3 && isBlocked && (
                              <div className="p-2 rounded-lg bg-red-900/40 border border-red-600/60 text-red-200 text-[11px] font-semibold flex items-start space-x-1.5 mb-2.5">
                                <ShieldAlert className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5 animate-pulse" />
                                <div>
                                  <span className="font-bold block uppercase text-[10px] tracking-wider text-red-300">
                                    SPÄRRAD: EJ KLAR FÖR STOPP
                                  </span>
                                  <span className="text-[10px] text-red-300/90 leading-tight">
                                    {gate3Req.missingItems[0] || 'Kräver fullständig materialbesiktning (Flik A).'}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Gate 3 Ready Badge */}
                            {isGate3 && !isBlocked && (
                              <div className="p-1.5 rounded-lg bg-emerald-950/50 border border-emerald-700/50 text-emerald-300 text-[10px] font-bold flex items-center space-x-1 mb-2.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span>GRÖNT LJUS: Material kitterat & godkänt</span>
                              </div>
                            )}

                            {/* Tasks / Arbetsmoment progress in Gate 4 */}
                            {tasks.length > 0 && (
                              <div className="p-2 rounded-lg bg-zinc-950/80 border border-zinc-800/80 mb-2.5">
                                <div className="flex items-center justify-between text-[11px] mb-1">
                                  <span className="text-zinc-400">Deluppgifter i fält:</span>
                                  <span className="font-mono font-bold text-zinc-200">
                                    {completedCount}/{tasks.length} ({Math.round((completedCount / tasks.length) * 100)}%)
                                  </span>
                                </div>
                                <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className="bg-emerald-500 h-full transition-all duration-300"
                                    style={{ width: `${(completedCount / tasks.length) * 100}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Footer: Planner & Maximo indicator */}
                            <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-2 border-t border-zinc-800/60 font-mono">
                              <span className="truncate">Ansvarig: {order.planner || 'Ej angiven'}</span>
                              <span className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-0.5">
                                Granska <ChevronRight className="w-3 h-3" />
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* VIEW MODE 2: TABLE / MATRIX VIEW */}
        {viewMode === 'table' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 font-mono uppercase text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">AO / Maximo</th>
                    <th className="py-3.5 px-4">Benämning & Anläggning</th>
                    <th className="py-3.5 px-4">Nivå</th>
                    <th className="py-3.5 px-4">Aktuell Gate</th>
                    <th className="py-3.5 px-4">Materialspärr (G3)</th>
                    <th className="py-3.5 px-4">Fältuppgifter (Tasks)</th>
                    <th className="py-3.5 px-4">Maximo Arbetslogg</th>
                    <th className="py-3.5 px-4">Planerare</th>
                    <th className="py-3.5 px-4 text-right">Åtgärd</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-zinc-500">
                        Inga arbetsordrar matchar de valda filtren.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => {
                      const req = checkGate3Requirements(order);
                      const isBlocked = order.status === 'Blockerad' || (order.currentGate === 3 && !req.isSatisfied);
                      const tasks = order.tasks || [];
                      const completedCount = tasks.filter((t) => t.completed).length;
                      const lastLog = order.maximoWorkLog && order.maximoWorkLog.length > 0 
                        ? order.maximoWorkLog[order.maximoWorkLog.length - 1] 
                        : null;

                      return (
                        <tr
                          key={order.id}
                          onClick={() => setSelectedDetailOrder(order)}
                          className={`hover:bg-zinc-800/50 transition-colors cursor-pointer ${
                            isBlocked ? 'bg-red-950/20' : ''
                          }`}
                        >
                          {/* AO / Wonum */}
                          <td className="py-3 px-4 font-mono font-bold text-blue-400">
                            <div>{order.id}</div>
                            <span className="text-[10px] text-zinc-500">{order.priority}</span>
                          </td>

                          {/* Title & Position */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-zinc-100 max-w-sm line-clamp-1">{order.title}</div>
                            <div className="text-[11px] text-zinc-400 font-mono">{order.facility} • {order.position}</div>
                          </td>

                          {/* Level */}
                          <td className="py-3 px-4">
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                              order.level === 'Nivå 3'
                                ? 'bg-purple-900/60 text-purple-300 border border-purple-700/50'
                                : order.level === 'Nivå 2'
                                ? 'bg-blue-900/60 text-blue-300'
                                : 'bg-zinc-800 text-zinc-400'
                            }`}>
                              {order.level}
                            </span>
                          </td>

                          {/* Current Gate */}
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-1 rounded-md font-mono font-bold text-xs bg-zinc-800 border border-zinc-700 text-zinc-200">
                              Gate {order.currentGate}
                            </span>
                          </td>

                          {/* Materialspärr */}
                          <td className="py-3 px-4">
                            {isBlocked ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded font-bold text-[10px] bg-red-900/60 text-red-300 border border-red-700">
                                <ShieldAlert className="w-3 h-3 text-red-400" />
                                <span>SPÄRRAD (Flik A)</span>
                              </span>
                            ) : req.isSatisfied ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span>Klar / Redo</span>
                              </span>
                            ) : (
                              <span className="text-zinc-500 text-[11px] font-mono">Ej aktuell</span>
                            )}
                          </td>

                          {/* Tasks progress */}
                          <td className="py-3 px-4 font-mono">
                            {tasks.length > 0 ? (
                              <div className="w-28">
                                <div className="flex justify-between text-[10px] mb-1">
                                  <span>{completedCount}/{tasks.length}</span>
                                  <span className="text-zinc-400">{Math.round((completedCount / tasks.length) * 100)}%</span>
                                </div>
                                <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className="bg-emerald-500 h-full"
                                    style={{ width: `${(completedCount / tasks.length) * 100}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="text-zinc-500 text-[10px]">Inga moment</span>
                            )}
                          </td>

                          {/* Maximo Log */}
                          <td className="py-3 px-4 max-w-xs truncate text-[11px] text-zinc-400">
                            {lastLog ? (
                              <span title={`${lastLog.createDate}: ${lastLog.summary}`}>
                                <strong className="text-zinc-300">[{lastLog.logType}]</strong> {lastLog.summary}
                              </span>
                            ) : (
                              <span className="text-zinc-600">-</span>
                            )}
                          </td>

                          {/* Planner */}
                          <td className="py-3 px-4 text-[11px] font-mono text-zinc-400">
                            {order.planner || 'Ej tilldelad'}
                          </td>

                          {/* Action */}
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDetailOrder(order);
                              }}
                              className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-blue-400 text-xs font-semibold"
                            >
                              Öppna
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW MODE 3: FOCUS / CRITICAL EXECUTION & SAFETY */}
        {viewMode === 'focus' && (
          <div className="space-y-4">
            <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl p-4 flex items-center justify-between text-xs text-amber-200">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Stopp- & Utförandefokus:</strong> Visar alla aktiva jobb med detaljerad LOTO-säkerhet, tillstånd och fältuppgifter (Maximo Tasks). Klicka på en uppgift för att klarmarkera den direkt.
                </span>
              </div>
              <span className="font-mono font-bold text-amber-300 whitespace-nowrap">
                {gate4ExecutionOrders.length} i fält • {blockedGate3Orders.length} spärrade
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredOrders.map((order) => {
                const req = checkGate3Requirements(order);
                const isBlocked = order.status === 'Blockerad' || (order.currentGate === 3 && !req.isSatisfied);
                const tasks = order.tasks || [];

                return (
                  <div
                    key={order.id}
                    className={`rounded-2xl border p-5 shadow-lg flex flex-col justify-between ${
                      isBlocked
                        ? 'bg-red-950/20 border-red-800/80'
                        : order.currentGate === 4
                        ? 'bg-zinc-900 border-blue-500/80 ring-1 ring-blue-500/20'
                        : 'bg-zinc-900 border-zinc-800'
                    }`}
                  >
                    <div>
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-black text-sm text-blue-400">
                              {order.id}
                            </span>
                            <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-zinc-800 text-zinc-300">
                              Gate {order.currentGate}
                            </span>
                            <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-purple-900/60 text-purple-300">
                              {order.level}
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-zinc-100 mt-1">
                            {order.title}
                          </h3>
                        </div>

                        {/* Status badge */}
                        {isBlocked ? (
                          <span className="px-2.5 py-1 rounded-lg bg-red-900/60 border border-red-600 text-red-200 text-xs font-bold shrink-0 flex items-center space-x-1">
                            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                            <span>SPÄRRAD (G3)</span>
                          </span>
                        ) : order.currentGate === 4 ? (
                          <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold shrink-0 animate-pulse">
                            PÅGÅENDE I FÄLT
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-mono">
                            {order.status}
                          </span>
                        )}
                      </div>

                      {/* Facility & Safety badges */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 font-mono mb-3">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-zinc-500" />
                          {order.facility} ({order.position})
                        </span>
                        <span>•</span>
                        <span>Planerare: {order.planner}</span>
                      </div>

                      {/* Safety & Permits Strip */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 text-center text-[11px] font-mono">
                        <div className={`p-1.5 rounded-lg border ${
                          order.safety.lotoRequired ? 'bg-amber-950/40 border-amber-800/60 text-amber-300 font-bold' : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                        }`}>
                          LOTO: {order.safety.lotoRequired ? 'PÅKRÄVD' : 'EJ KRAV'}
                        </div>
                        <div className={`p-1.5 rounded-lg border ${
                          order.safety.permitHotWork ? 'bg-red-950/40 border-red-800/60 text-red-300 font-bold' : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                        }`}>
                          Heta Arbeten: {order.safety.permitHotWork ? 'JA' : 'NEJ'}
                        </div>
                        <div className={`p-1.5 rounded-lg border ${
                          order.safety.permitConfinedSpace ? 'bg-purple-950/40 border-purple-800/60 text-purple-300 font-bold' : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                        }`}>
                          Slutet Utr.: {order.safety.permitConfinedSpace ? 'JA' : 'NEJ'}
                        </div>
                        <div className={`p-1.5 rounded-lg border ${
                          order.safety.permitWorkingAtHeight ? 'bg-blue-950/40 border-blue-800/60 text-blue-300 font-bold' : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                        }`}>
                          Höjdarbete: {order.safety.permitWorkingAtHeight ? 'JA' : 'NEJ'}
                        </div>
                      </div>

                      {/* Maximo Tasks with quick toggle */}
                      <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-3 mb-3">
                        <div className="flex items-center justify-between text-xs font-bold text-zinc-300 mb-2">
                          <span className="flex items-center gap-1.5">
                            <ClipboardList className="w-3.5 h-3.5 text-blue-400" />
                            <span>Arbetsuppgifter & Utförande (Maximo WORKLOG):</span>
                          </span>
                          <span className="font-mono text-zinc-400">
                            {tasks.filter(t => t.completed).length} / {tasks.length} klara
                          </span>
                        </div>

                        {tasks.length === 0 ? (
                          <div className="text-zinc-600 text-xs italic p-2">Inga deluppgifter definierade.</div>
                        ) : (
                          <div className="space-y-1.5 max-h-48 overflow-y-auto">
                            {tasks.map((task) => (
                              <label
                                key={task.id}
                                className={`flex items-start space-x-2.5 p-2 rounded-lg border transition-colors cursor-pointer text-xs ${
                                  task.completed 
                                    ? 'bg-emerald-950/20 border-emerald-800/50 text-emerald-300' 
                                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={task.completed}
                                  onChange={() => handleToggleTask(order.id, task.id)}
                                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 mt-0.5 cursor-pointer shrink-0"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-mono font-bold text-[11px] text-zinc-400">Task {task.taskNumber}</span>
                                    <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-zinc-800 text-zinc-300 font-bold">{task.trade}</span>
                                    <span className="text-[10px] text-zinc-500 font-mono">{task.estimatedHours}h</span>
                                  </div>
                                  <div className={`mt-0.5 ${task.completed ? 'line-through text-zinc-400' : 'text-zinc-100 font-medium'}`}>
                                    {task.description}
                                  </div>
                                  {task.completed && (
                                    <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
                                      ✓ Kvitterad & loggad i Maximo WORKLOG ({task.completedAt})
                                    </div>
                                  )}
                                </div>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-zinc-800 mt-2">
                      <span className="text-[11px] text-zinc-500 font-mono">
                        {order.maximoWorkLog?.length || 0} Maximo-loggar registrerade
                      </span>
                      <button
                        onClick={() => setSelectedDetailOrder(order)}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-1 cursor-pointer"
                      >
                        <span>Visa Detaljer & Logg</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* QUICK DETAIL MODAL / DRAWER (Opens when any order is clicked in Dashboard) */}
      {selectedDetailOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-start justify-between bg-zinc-950/80">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-black text-sm sm:text-base text-blue-400">
                    {selectedDetailOrder.id}
                  </span>
                  <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-zinc-800 text-zinc-300">
                    Gate {selectedDetailOrder.currentGate}
                  </span>
                  <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-purple-900/60 text-purple-300">
                    {selectedDetailOrder.level}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-zinc-100 mt-1">
                  {selectedDetailOrder.title}
                </h2>
                <div className="text-xs text-zinc-400 font-mono mt-0.5">
                  {selectedDetailOrder.facility} • Pos: {selectedDetailOrder.position} • Planerare: {selectedDetailOrder.planner}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {onSelectOrderForEditor && (
                  <button
                    onClick={() => {
                      const ord = selectedDetailOrder;
                      setSelectedDetailOrder(null);
                      if (onExitDashboard) onExitDashboard();
                      onSelectOrderForEditor(ord);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-1 cursor-pointer"
                    title="Öppna fullständig beredningsvy i huvudapplikationen"
                  >
                    <span>Öppna i Beredare</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setSelectedDetailOrder(null)}
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {/* Gate 3 Checkpoints Review */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                      Flik A: Leveranskontroll Material (Gate 3 Spärr)
                    </h3>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                    checkGate3Requirements(selectedDetailOrder).isSatisfied
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-red-950 text-red-300 border border-red-800'
                  }`}>
                    {checkGate3Requirements(selectedDetailOrder).isSatisfied ? 'SPÄRR HÄVD: REDO' : 'SPÄRR AKTIV'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center space-x-2 p-2 rounded bg-zinc-900 border border-zinc-800/80">
                    {selectedDetailOrder.materialInspection.transportUndamaged ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <span>1. Transportskadekontroll godkänd</span>
                  </div>
                  <div className="flex items-center space-x-2 p-2 rounded bg-zinc-900 border border-zinc-800/80">
                    {selectedDetailOrder.materialInspection.certificatesReceived ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <span>2. Certifikat mottagna & granskade</span>
                  </div>
                  <div className="flex items-center space-x-2 p-2 rounded bg-zinc-900 border border-zinc-800/80">
                    {selectedDetailOrder.materialInspection.physicallyKittedAndTagged ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <span>3. Fysiskt kittad och märkt med AO</span>
                  </div>
                  <div className="flex items-center space-x-2 p-2 rounded bg-zinc-900 border border-zinc-800/80">
                    {selectedDetailOrder.materialInspection.shelfLocationConfirmed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <span>4. Hyllplats bekräftad i Maximo ({selectedDetailOrder.materialInspection.shelfLocation})</span>
                  </div>
                </div>
              </div>

              {/* Tasks Checklist with check-off */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <ClipboardList className="w-4 h-4 text-blue-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                      Arbetsuppgifter (Klicka för att klarmarkera och skriva till Maximo)
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-zinc-400">
                    {(selectedDetailOrder.tasks || []).filter(t => t.completed).length} av {(selectedDetailOrder.tasks || []).length} klara
                  </span>
                </div>

                <div className="space-y-2">
                  {(selectedDetailOrder.tasks || []).map((task) => (
                    <label
                      key={task.id}
                      className={`flex items-start space-x-3 p-3 rounded-lg border transition-all cursor-pointer text-xs ${
                        task.completed
                          ? 'bg-emerald-950/20 border-emerald-800/60 text-emerald-300'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-200 hover:border-zinc-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => handleToggleTask(selectedDetailOrder.id, task.id)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 mt-0.5 cursor-pointer shrink-0"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-zinc-400">Task {task.taskNumber}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 font-bold">{task.trade}</span>
                          <span className="text-[10px] text-zinc-500 font-mono">Est: {task.estimatedHours}h</span>
                        </div>
                        <div className={`mt-0.5 ${task.completed ? 'line-through text-zinc-400' : 'font-semibold'}`}>
                          {task.description}
                        </div>
                        {task.completed && (
                          <div className="text-[10px] text-emerald-400 font-mono mt-1 flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Utförd av {task.completedBy || 'Tekniker'} kl {task.completedAt} — skriven till Maximo WORKLOG</span>
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Maximo WORKLOG Live Table */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                      IBM Maximo Arbetslogg (WORKLOG Historik)
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {selectedDetailOrder.maximoWorkLog?.length || 0} loggposter
                  </span>
                </div>

                {(!selectedDetailOrder.maximoWorkLog || selectedDetailOrder.maximoWorkLog.length === 0) ? (
                  <div className="text-zinc-600 text-xs italic py-3 text-center">Inga arbetsloggposter ännu.</div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {selectedDetailOrder.maximoWorkLog.map((log) => (
                      <div key={log.id} className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800/80 text-xs font-mono">
                        <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
                          <span className="text-blue-400 font-bold">{log.createDate} • {log.createBy}</span>
                          <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 font-bold text-[10px]">
                            {log.logType}
                          </span>
                        </div>
                        <div className="font-bold text-zinc-200">{log.summary}</div>
                        {log.detail && (
                          <div className="text-[11px] text-zinc-400 mt-1 whitespace-pre-wrap">{log.detail}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
