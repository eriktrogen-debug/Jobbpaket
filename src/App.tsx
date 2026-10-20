/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  SlidersHorizontal, 
  Download, 
  Printer, 
  Layers, 
  CheckCircle2, 
  ShieldAlert, 
  Lock, 
  RotateCcw,
  Sparkles,
  FileText,
  AlertTriangle,
  FileSpreadsheet,
  BookmarkCheck,
  CheckSquare,
  Square,
  Send
} from 'lucide-react';
import { WorkOrder, GateNumber, WorkOrderLevel, JobTemplate } from './types.ts';
import { 
  loadWorkOrders, 
  saveWorkOrders, 
  resetWorkOrders, 
  getSavedTheme, 
  setSavedTheme,
  checkGate3Requirements,
  loadTemplates,
  saveTemplates,
  formatMaximoTitle,
  subscribeToWorkOrders
} from './utils/storage.ts';
import { generateStandaloneHtml } from './utils/exportHtml.ts';
import { Header } from './components/Header.tsx';
import { GateSummary } from './components/GateSummary.tsx';
import { WorkOrderCard } from './components/WorkOrderCard.tsx';
import { WorkOrderEditor } from './components/WorkOrderEditor.tsx';
import { PrintView } from './components/PrintView.tsx';
import { NewWorkOrderModal } from './components/NewWorkOrderModal.tsx';
import { ImportModal } from './components/ImportModal.tsx';
import { TemplateModal } from './components/TemplateModal.tsx';
import { MaximoExportModal } from './components/MaximoExportModal.tsx';
import { LiveDashboardView } from './components/LiveDashboardView.tsx';

export default function App() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [printOrders, setPrintOrders] = useState<WorkOrder[] | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isMaximoExportModalOpen, setIsMaximoExportModalOpen] = useState(false);
  const [maximoExportList, setMaximoExportList] = useState<WorkOrder[]>([]);
  const [templateTargetOrder, setTemplateTargetOrder] = useState<WorkOrder | null>(null);
  const [templates, setTemplates] = useState<JobTemplate[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Dashboard for TV / Teams Screen Share
  const [isDashboardOpen, setIsDashboardOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      return searchParams.get('view') === 'dashboard' || window.location.hash === '#dashboard';
    }
    return false;
  });

  // Multi-select for batch print and export
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filters
  const [gateFilter, setGateFilter] = useState<GateNumber | 'ALL'>('ALL');
  const [levelFilter, setLevelFilter] = useState<WorkOrderLevel | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Klar' | 'Pågående' | 'Blockerad'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Initial load
  useEffect(() => {
    const loaded = loadWorkOrders();
    setWorkOrders(loaded);

    const loadedTemplates = loadTemplates();
    setTemplates(loadedTemplates);

    const savedTheme = getSavedTheme();
    setTheme(savedTheme);
    applyThemeToDocument(savedTheme);
  }, []);

  // Real-time synchronization across browser windows/tabs
  useEffect(() => {
    const unsubscribe = subscribeToWorkOrders((updated) => {
      setWorkOrders(updated);
      setSelectedOrder((prev) => (prev ? updated.find((o) => o.id === prev.id) || prev : null));
    });
    return () => unsubscribe();
  }, []);

  // Listen to browser navigation / URL parameter changes
  useEffect(() => {
    const handleLocationChange = () => {
      const searchParams = new URLSearchParams(window.location.search);
      setIsDashboardOpen(searchParams.get('view') === 'dashboard' || window.location.hash === '#dashboard');
    };
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const handleOpenDashboard = () => {
    setIsDashboardOpen(true);
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'dashboard');
    window.history.pushState({}, '', url.toString());
  };

  const handleOpenDashboardNewWindow = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'dashboard');
    window.open(url.toString(), '_blank', 'noopener,noreferrer');
  };

  const handleCloseDashboard = () => {
    setIsDashboardOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.delete('view');
    window.history.pushState({}, '', url.pathname + (url.search ? url.search : ''));
  };

  const applyThemeToDocument = (t: 'dark' | 'light') => {
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleToggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    setSavedTheme(next);
    applyThemeToDocument(next);
  };

  const handleUpdateOrder = (updatedOrder: WorkOrder) => {
    const nextList = workOrders.map((wo) =>
      wo.id === updatedOrder.id ? updatedOrder : wo
    );
    setWorkOrders(nextList);
    saveWorkOrders(nextList);
    if (selectedOrder?.id === updatedOrder.id) {
      setSelectedOrder(updatedOrder);
    }
  };

  const handleCreateOrder = (newOrder: WorkOrder) => {
    const nextList = [newOrder, ...workOrders];
    setWorkOrders(nextList);
    saveWorkOrders(nextList);
    setSelectedOrder(newOrder); // Open immediately for editing
  };

  const handleImportOrders = (imported: WorkOrder[]) => {
    const nextList = [...imported, ...workOrders];
    setWorkOrders(nextList);
    saveWorkOrders(nextList);
    if (imported.length === 1) {
      setSelectedOrder(imported[0]); // Open single import directly
    }
  };

  const handleTriggerMaximoExport = (ordersToExport?: WorkOrder[]) => {
    if (ordersToExport && ordersToExport.length > 0) {
      setMaximoExportList(ordersToExport);
    } else {
      const selected = workOrders.filter((o) => selectedIds.includes(o.id));
      setMaximoExportList(selected.length > 0 ? selected : filteredOrders);
    }
    setIsMaximoExportModalOpen(true);
  };

  const handleMaximoOrderSynced = (syncedOrders: WorkOrder[]) => {
    const updatedMap = new Map(syncedOrders.map((o) => [o.id, o]));
    const nextList = workOrders.map((wo) => updatedMap.get(wo.id) || wo);
    setWorkOrders(nextList);
    saveWorkOrders(nextList);
    if (selectedOrder && updatedMap.has(selectedOrder.id)) {
      setSelectedOrder(updatedMap.get(selectedOrder.id)!);
    }
  };

  const handleResetData = () => {
    if (window.confirm('Vill du återställa till de förifyllda industridata-exemplen?')) {
      const reset = resetWorkOrders();
      setWorkOrders(reset);
      setSelectedOrder(null);
      setPrintOrders(null);
      setSelectedIds([]);
    }
  };

  // Export standalone HTML file for user download
  const handleExportStandaloneHtml = () => {
    const htmlString = generateStandaloneHtml(workOrders);
    const blob = new Blob([htmlString], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jobbpaket_leveranskontroll.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Applying a template
  const handleApplyTemplate = (tmpl: JobTemplate) => {
    if (selectedOrder) {
      const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
      const updated: WorkOrder = {
        ...selectedOrder,
        level: tmpl.level,
        safety: { ...tmpl.safety },
        resources: { ...tmpl.resources },
        documentation: { ...tmpl.documentation },
        materials: tmpl.materials.map(m => ({
          ...m,
          id: `MAT-${Date.now().toString().slice(-4)}-${m.id}`,
        })),
        history: [
          ...selectedOrder.history,
          {
            date: now,
            user: 'Mallhanterare',
            action: `Läst in och applicerat mall "${tmpl.name}".`,
          },
        ],
      };
      handleUpdateOrder(updated);
    } else {
      // Create new order from template
      const nextId = `AO-${520000 + workOrders.length + 1}`;
      const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
      const newFromTemplate: WorkOrder = {
        id: nextId,
        title: formatMaximoTitle(nextId, tmpl.name),
        facility: 'Huvudanläggning',
        position: 'POS-NY',
        level: tmpl.level,
        currentGate: 1,
        status: 'Pågående',
        priority: '2 - Hög',
        planner: 'Beredare',
        createdDate: now.split(' ')[0],
        plannedStartDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
        stopWindow: tmpl.level === 'Nivå 3' ? 'Kommande Huvudstopp' : 'Veckounderhåll',
        gate3Approved: false,
        safety: { ...tmpl.safety },
        resources: { ...tmpl.resources },
        documentation: { ...tmpl.documentation },
        materials: tmpl.materials.map(m => ({
          ...m,
          id: `MAT-${Date.now().toString().slice(-4)}-${m.id}`,
        })),
        materialInspection: {
          checkedAgainstDrawing: false,
          transportUndamaged: false,
          certificatesReceived: tmpl.level !== 'Nivå 3',
          physicallyKittedAndTagged: false,
          shelfLocationConfirmed: false,
          shelfLocation: '',
          inspectorName: '',
          inspectionDate: '',
          notes: `Skapad utifrån mall "${tmpl.name}".`,
        },
        serviceInspection: {
          physicalInspectionDone: false,
          guardsRestoredLotoRevoked: false,
          housekeepingApproved: false,
          measurementProtocolsReceived: false,
          hoursAndMaterialReconciled: false,
          mediusPoNumber: `PO-${Math.floor(100000 + Math.random() * 900000)}`,
          mediusInvoiceRef: '',
          mediusApprover: 'Underhållschef',
          approvalDate: '',
          maximoStatusAfterInspection: 'VÄNTAR',
          notes: '',
        },
        maximoWorkLog: [
          {
            id: `WL-${nextId.replace(/[^0-9]/g, '') || '00'}-01`,
            wonum: nextId,
            logType: 'STATUS',
            summary: `Arbetsorder initierad från mall: ${tmpl.name}`,
            detail: `Grunddata, LOTO och artiklar inlästa från standardmall "${tmpl.name}".`,
            createBy: 'Beredare',
            createDate: now,
            syncedToMaximo: false,
          },
        ],
        history: [
          {
            date: now,
            user: 'Beredare',
            action: `Skapad från jobbmall "${tmpl.name}".`,
          },
        ],
      };
      handleCreateOrder(newFromTemplate);
    }
  };

  // Filtering
  const filteredOrders = workOrders.filter((wo) => {
    if (gateFilter !== 'ALL' && wo.currentGate !== gateFilter) {
      return false;
    }
    if (levelFilter !== 'ALL' && wo.level !== levelFilter) {
      return false;
    }
    if (statusFilter !== 'ALL' && wo.status !== statusFilter) {
      return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchId = wo.id.toLowerCase().includes(q);
      const matchTitle = wo.title.toLowerCase().includes(q);
      const matchPosition = wo.position.toLowerCase().includes(q);
      const matchFacility = wo.facility.toLowerCase().includes(q);
      const matchPlanner = wo.planner.toLowerCase().includes(q);
      if (!matchId && !matchTitle && !matchPosition && !matchFacility && !matchPlanner) {
        return false;
      }
    }
    return true;
  });

  // Toggle multi-select
  const toggleSelectOrder = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    if (selectedIds.length === filteredOrders.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredOrders.map((o) => o.id));
    }
  };

  const handlePrintSelected = () => {
    const toPrint = workOrders.filter((o) => selectedIds.includes(o.id));
    if (toPrint.length > 0) {
      setPrintOrders(toPrint);
    } else if (filteredOrders.length > 0) {
      setPrintOrders(filteredOrders);
    }
  };

  // If in Print View, render print layout exclusively
  if (printOrders) {
    return (
      <PrintView
        orders={printOrders}
        onClose={() => setPrintOrders(null)}
      />
    );
  }

  // If in Dashboard View (for TV screens & Microsoft Teams screen share)
  if (isDashboardOpen) {
    return (
      <LiveDashboardView
        workOrders={workOrders}
        onUpdateWorkOrders={(updatedList) => {
          setWorkOrders(updatedList);
          saveWorkOrders(updatedList);
        }}
        onSelectOrderForEditor={(order) => {
          setIsDashboardOpen(false);
          setSelectedOrder(order);
          const url = new URL(window.location.href);
          url.searchParams.delete('view');
          window.history.pushState({}, '', url.pathname + (url.search ? url.search : ''));
        }}
        onExitDashboard={handleCloseDashboard}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        isStandaloneWindow={typeof window !== 'undefined' && window.location.search.includes('view=dashboard')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans transition-colors pb-16">
      {/* Top Header */}
      <Header
        theme={theme}
        onToggleTheme={handleToggleTheme}
        workOrders={workOrders}
        onNewWorkOrder={() => setIsNewModalOpen(true)}
        onOpenImport={() => setIsImportModalOpen(true)}
        onOpenTemplates={() => {
          setTemplateTargetOrder(null);
          setIsTemplateModalOpen(true);
        }}
        onResetData={handleResetData}
        onExportStandaloneHtml={handleExportStandaloneHtml}
        onOpenDashboard={handleOpenDashboard}
        onOpenDashboardNewWindow={handleOpenDashboardNewWindow}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {selectedOrder ? (
          /* WORK ORDER EDITOR (Modul 2, 3, etc.) */
          <WorkOrderEditor
            order={selectedOrder}
            onSave={handleUpdateOrder}
            onClose={() => setSelectedOrder(null)}
            onPrint={(orderToPrint) => setPrintOrders([orderToPrint])}
            onOpenSaveAsTemplate={(orderToSave) => {
              setTemplateTargetOrder(orderToSave);
              setIsTemplateModalOpen(true);
            }}
            onOpenTemplatesModal={() => {
              setTemplateTargetOrder(selectedOrder);
              setIsTemplateModalOpen(true);
            }}
            onExportToMaximo={(orderToExport) => handleTriggerMaximoExport([orderToExport])}
          />
        ) : (
          /* DASHBOARD & GATE OVERVIEW (Modul 1) */
          <div className="space-y-6">
            {/* Visual 5-Gate Progression Bar */}
            <GateSummary
              workOrders={workOrders}
              selectedGateFilter={gateFilter}
              onSelectGateFilter={setGateFilter}
            />

            {/* Filter and Search Bar */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Sök AO-nummer, benämning, anläggning, position (KKS)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              {/* Dropdown Filters & Actions */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Level Filter */}
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium hidden sm:inline">Nivå:</span>
                  <select
                    value={levelFilter}
                    onChange={(e) => setLevelFilter(e.target.value as any)}
                    className="px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer font-medium"
                  >
                    <option value="ALL">Alla Nivåer</option>
                    <option value="Nivå 1">Nivå 1 (Löpande &lt;4h)</option>
                    <option value="Nivå 2">Nivå 2 (Veckounderhåll)</option>
                    <option value="Nivå 3">Nivå 3 (Stopp/Projekt)</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium hidden sm:inline">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer font-medium"
                  >
                    <option value="ALL">Alla Statusar</option>
                    <option value="Klar">Grön (Klar)</option>
                    <option value="Pågående">Gul (Pågående)</option>
                    <option value="Blockerad">Röd (Blockerad / Saknas)</option>
                  </select>
                </div>

                {/* Batch Print Button */}
                <button
                  onClick={handlePrintSelected}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 dark:bg-zinc-200 hover:bg-zinc-700 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 shadow-xs"
                  title="Skriv ut valda eller alla filtrerade jobb i ett sammanhängande stoppärmsblad"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>
                    {selectedIds.length > 0
                      ? `Skriv ut (${selectedIds.length})`
                      : `Skriv ut (${filteredOrders.length})`}
                  </span>
                </button>

                {/* Export to Maximo button */}
                <button
                  onClick={() => handleTriggerMaximoExport()}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 shadow-xs"
                  title="Exportera och synka tillbaka till IBM Maximo EAM"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {selectedIds.length > 0
                      ? `Synka Maximo (${selectedIds.length})`
                      : `Synka Maximo (${filteredOrders.length})`}
                  </span>
                </button>

                {/* Clear filters if active */}
                {(gateFilter !== 'ALL' || levelFilter !== 'ALL' || statusFilter !== 'ALL' || searchTerm) && (
                  <button
                    onClick={() => {
                      setGateFilter('ALL');
                      setLevelFilter('ALL');
                      setStatusFilter('ALL');
                      setSearchTerm('');
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                  >
                    Rensa
                  </button>
                )}
              </div>
            </div>

            {/* Results count & multi-select header */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSelectAllFiltered}
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {selectedIds.length === filteredOrders.length && filteredOrders.length > 0 ? (
                    <>
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>Avmarkera alla</span>
                    </>
                  ) : (
                    <>
                      <Square className="w-3.5 h-3.5" />
                      <span>Markera alla ({filteredOrders.length})</span>
                    </>
                  )}
                </button>
                <span>•</span>
                <span>
                  Visar <strong>{filteredOrders.length}</strong> av <strong>{workOrders.length}</strong> arbetsordrar
                  {gateFilter !== 'ALL' && ` i Gate ${gateFilter}`}
                </span>
              </div>

              {/* Status color legend */}
              <div className="flex items-center space-x-3 text-[11px]">
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Grön = Klar</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>Gul = Pågående</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  <span>Röd = Blockerad (Spärr)</span>
                </span>
              </div>
            </div>

            {/* Work Orders List Grid */}
            {filteredOrders.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Inga arbetsordrar matchade filtret
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
                  Pröva att rensa sökningen eller klicka på "Importera Maximo/Excel" för att ladda in fler ordrar.
                </p>
                <div className="mt-4 flex items-center justify-center space-x-2">
                  <button
                    onClick={() => {
                      setGateFilter('ALL');
                      setLevelFilter('ALL');
                      setStatusFilter('ALL');
                      setSearchTerm('');
                    }}
                    className="px-4 py-2 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-xs font-semibold hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                  >
                    Återställ filter
                  </button>
                  <button
                    onClick={() => setIsImportModalOpen(true)}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Importera från Maximo / Excel
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredOrders.map((order) => {
                  const isSelectedForPrint = selectedIds.includes(order.id);
                  return (
                    <div key={order.id} className="relative group/wrapper">
                      {/* Selection checkbox for batch print */}
                      <div className="absolute top-4 right-4 z-20">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectOrder(order.id);
                          }}
                          className="p-1 rounded bg-white/90 dark:bg-zinc-800/90 hover:bg-white dark:hover:bg-zinc-700 shadow-xs border border-zinc-200 dark:border-zinc-700 cursor-pointer"
                          title="Välj för utskrift"
                        >
                          {isSelectedForPrint ? (
                            <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Square className="w-4 h-4 text-zinc-400" />
                          )}
                        </button>
                      </div>

                      <WorkOrderCard
                        order={order}
                        onSelect={(ord) => setSelectedOrder(ord)}
                        onPrint={(ord) => setPrintOrders([ord])}
                        onExportToMaximo={(ord) => handleTriggerMaximoExport([ord])}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* New Work Order Modal */}
      <NewWorkOrderModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onCreate={handleCreateOrder}
        existingCount={workOrders.length}
        templates={templates}
      />

      {/* Import Modal (Maximo + Excel) */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportOrders={handleImportOrders}
        existingCount={workOrders.length}
      />

      {/* Templates Modal (Manage, Save as template, Apply) */}
      <TemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        templates={templates}
        onUpdateTemplates={(updatedTemplates) => setTemplates(updatedTemplates)}
        onApplyTemplate={handleApplyTemplate}
        currentOrderForSave={templateTargetOrder}
      />
    </div>
  );
}
