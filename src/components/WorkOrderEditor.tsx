import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Printer, 
  Save, 
  ShieldAlert, 
  HardHat, 
  Users, 
  FileCode, 
  Package, 
  CheckCircle2, 
  Lock, 
  Unlock, 
  Plus, 
  Trash2,
  Calendar,
  AlertTriangle,
  ChevronRight,
  Info,
  Receipt,
  FileCheck2,
  BookmarkPlus,
  BookmarkCheck,
  Send,
  Sparkles,
  ScrollText,
  Server,
  Clock,
  User,
  Check
} from 'lucide-react';
import { 
  WorkOrder, 
  WorkOrderLevel, 
  GateNumber, 
  GATES_DEFINITION,
  MaterialItem,
  MaximoWorkLogEntry
} from '../types.ts';
import { MaterialInspectionTab } from './MaterialInspectionTab.tsx';
import { ServiceInspectionTab } from './ServiceInspectionTab.tsx';
import { 
  checkGate3Requirements, 
  checkGate5Requirements, 
  formatMaximoTitle,
  logTaskCompletionToMaximo 
} from '../utils/storage.ts';

interface WorkOrderEditorProps {
  order: WorkOrder;
  onSave: (order: WorkOrder) => void;
  onClose: () => void;
  onPrint: (order: WorkOrder) => void;
  onOpenSaveAsTemplate: (order: WorkOrder) => void;
  onOpenTemplatesModal: () => void;
  onExportToMaximo: (order: WorkOrder) => void;
}

export const WorkOrderEditor: React.FC<WorkOrderEditorProps> = ({
  order: initialOrder,
  onSave,
  onClose,
  onPrint,
  onOpenSaveAsTemplate,
  onOpenTemplatesModal,
  onExportToMaximo,
}) => {
  const [order, setOrder] = useState<WorkOrder>(initialOrder);
  const [activeTab, setActiveTab] = useState<'grunddata' | 'jobbpaket' | 'material' | 'service' | 'worklog'>('jobbpaket');
  const [saveToast, setSaveToast] = useState(false);
  const [workLogToast, setWorkLogToast] = useState<{ summary: string; time: string } | null>(null);

  // Manual work log form state
  const [newLogSummary, setNewLogSummary] = useState('');
  const [newLogDetail, setNewLogDetail] = useState('');
  const [newLogType, setNewLogType] = useState<MaximoWorkLogEntry['logType']>('NOTERING');

  // Trigger floating worklog confirmation toast
  const triggerWorkLogToast = (summary: string) => {
    const time = new Date().toLocaleTimeString().slice(0, 5);
    setWorkLogToast({ summary, time });
    setTimeout(() => setWorkLogToast(null), 3500);
  };

  // Sync internal state if initialOrder changes
  useEffect(() => {
    setOrder(initialOrder);
  }, [initialOrder]);

  // New material item state
  const [newPartNumber, setNewPartNumber] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newQuantity, setNewQuantity] = useState(1);
  const [newUnit, setNewUnit] = useState('st');
  const [newInStock, setNewInStock] = useState(true);
  const [newShelfLocation, setNewShelfLocation] = useState('');

  // New task state (Maximo WOACTIVITY / Arbetsuppgifter)
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskTrade, setNewTaskTrade] = useState<import('../types.ts').WorkOrderTask['trade']>('MEK');
  const [newTaskHours, setNewTaskHours] = useState(2);

  const gate3Validation = checkGate3Requirements(order);
  const gate5Validation = checkGate5Requirements(order);

  // Auto-adapt requirements when user selects a different level (Nivå 1 vs 2 vs 3)
  const handleLevelChange = (newLevel: WorkOrderLevel) => {
    let updatedSafety = { ...order.safety };
    let updatedMaterials = [...order.materials];

    if (newLevel === 'Nivå 1') {
      // Nivå 1: Minimal requirements, quick job
      updatedSafety.permitHotWork = false;
      updatedSafety.permitConfinedSpace = false;
      updatedSafety.permitWorkingAtHeight = false;
    } else if (newLevel === 'Nivå 2') {
      // Nivå 2: Veckounderhåll, mandatory risk assessment, LOTO
      updatedSafety.lotoRequired = true;
      updatedSafety.riskAssessmentDone = true;
    } else if (newLevel === 'Nivå 3') {
      // Nivå 3: Stopp/Projekt - Full LOTO, risk assessment, higher scrutiny
      updatedSafety.lotoRequired = true;
      updatedSafety.lotoMechanical = true;
      updatedSafety.lotoElectrical = true;
      updatedSafety.riskAssessmentDone = true;
      updatedSafety.permitHotWork = true;
      // Mark certificates required on materials
      updatedMaterials = updatedMaterials.map(m => ({ ...m, certificateRequired: true }));
    }

    const updated = {
      ...order,
      level: newLevel,
      safety: updatedSafety,
      materials: updatedMaterials,
    };
    setOrder(updated);
    onSave(updated);
  };

  const handleFieldChange = (fields: Partial<WorkOrder>) => {
    const updated = { ...order, ...fields };
    setOrder(updated);
    onSave(updated);
  };

  const handleSaveExplicit = () => {
    onSave(order);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  // Gate navigation
  const canAdvanceToGate = (targetGate: GateNumber): { allowed: boolean; reason?: string } => {
    if (targetGate <= order.currentGate) return { allowed: true };

    if (targetGate === 2) {
      if (!order.title.trim()) return { allowed: false, reason: 'Benämning måste fyllas i' };
      return { allowed: true };
    }

    if (targetGate === 3) {
      // Gate 2 -> Gate 3: Need risk assessment and at least basic work instructions
      if (!order.safety.riskAssessmentDone) {
        return { allowed: false, reason: 'Riskanalys måste genomföras innan Gate 3.' };
      }
      return { allowed: true };
    }

    if (targetGate === 4) {
      // Gate 3 -> Gate 4: THE HARD LOCK!
      if (!gate3Validation.isSatisfied) {
        return { 
          allowed: false, 
          reason: `SPÄRR: Gate 3 är låst! ${gate3Validation.missingItems[0]}` 
        };
      }
      return { allowed: true };
    }

    if (targetGate === 5) {
      return { allowed: true };
    }

    return { allowed: true };
  };

  const setGate = (gateNum: GateNumber) => {
    const check = canAdvanceToGate(gateNum);
    if (!check.allowed) {
      alert(`Kan ej byta till Gate ${gateNum}:\n${check.reason}`);
      if (gateNum === 4 && !gate3Validation.isSatisfied) {
        setActiveTab('material');
      }
      return;
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    let newStatus = order.status;
    if (gateNum === 3 && !gate3Validation.isSatisfied) {
      newStatus = 'Blockerad';
    } else if (gateNum === 4) {
      newStatus = 'Pågående';
    } else if (gateNum === 5 && order.serviceInspection.physicalInspectionDone) {
      newStatus = 'Klar';
    }

    const gateDef = GATES_DEFINITION.find(g => g.number === gateNum);
    let updated: WorkOrder = {
      ...order,
      currentGate: gateNum,
      status: newStatus,
      history: [
        ...order.history,
        {
          date: now,
          user: order.planner || 'Planerare',
          action: `Processflyttad till Gate ${gateNum} (${gateDef?.subtitle})`,
        },
      ],
    };

    // Requirement: Every time a task/gate status becomes completed, log to Maximo WORKLOG!
    const res = logTaskCompletionToMaximo(
      updated,
      `Gate-avancemang: Flyttad till Gate ${gateNum} (${gateDef?.subtitle})`,
      'STATUS',
      `Arbetsordern har godkänts och processats till Gate ${gateNum}. Status i Maximo: ${newStatus}.`,
      order.planner || 'Planerare'
    );
    updated = res.updatedOrder;
    triggerWorkLogToast(`Gate-avancemang: Gate ${gateNum} (${gateDef?.subtitle})`);

    setOrder(updated);
    onSave(updated);
  };

  // Add material row
  const handleAddMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartNumber.trim() || !newDescription.trim()) return;

    const newItem: MaterialItem = {
      id: `MAT-${Date.now().toString().slice(-4)}`,
      partNumber: newPartNumber.trim().toUpperCase(),
      description: newDescription.trim(),
      quantity: Number(newQuantity) || 1,
      unit: newUnit,
      inStock: newInStock,
      shelfLocation: newShelfLocation.trim().toUpperCase() || 'FÖRRÅD-IN',
      certificateRequired: order.level === 'Nivå 3',
    };

    const updatedMaterials = [...order.materials, newItem];
    const updated = { ...order, materials: updatedMaterials };
    setOrder(updated);
    onSave(updated);

    // Reset inputs
    setNewPartNumber('');
    setNewDescription('');
    setNewQuantity(1);
    setNewShelfLocation('');
  };

  const handleRemoveMaterial = (id: string) => {
    const updated = {
      ...order,
      materials: order.materials.filter((m) => m.id !== id),
    };
    setOrder(updated);
    onSave(updated);
  };

  const handleToggleMaterialInStock = (id: string) => {
    const targetItem = order.materials.find(m => m.id === id);
    const willBeInStock = !targetItem?.inStock;

    const updatedMaterials = order.materials.map((m) =>
      m.id === id ? { ...m, inStock: !m.inStock } : m
    );

    let updated: WorkOrder = {
      ...order,
      materials: updatedMaterials,
    };

    // When material is marked in stock, log to Maximo WORKLOG!
    if (willBeInStock && targetItem) {
      const res = logTaskCompletionToMaximo(
        updated,
        `Uppgift klar: Reservdel ${targetItem.partNumber} verifierad i lager`,
        'MATERIAL',
        `Reservdel ${targetItem.partNumber} (${targetItem.description}, ${targetItem.quantity} ${targetItem.unit}) bekräftad på hylla ${targetItem.shelfLocation}.`,
        order.planner || 'Förrådstekniker'
      );
      updated = res.updatedOrder;
      triggerWorkLogToast(`Reservdel ${targetItem.partNumber} bekräftad i lager`);
    }

    setOrder(updated);
    onSave(updated);
  };

  // Manual work log entry submit handler (Maximo WORKLOG table)
  const handleAddManualWorkLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogSummary.trim()) return;

    const res = logTaskCompletionToMaximo(
      order,
      newLogSummary.trim(),
      newLogType,
      newLogDetail.trim() || undefined,
      order.planner || 'Underhållsplanerare'
    );
    setOrder(res.updatedOrder);
    onSave(res.updatedOrder);
    triggerWorkLogToast(newLogSummary.trim());
    setNewLogSummary('');
    setNewLogDetail('');
  };

  // Toggle completion of a specific work order task
  // Requirement: "Varje gång en uppgift blir klar så ska den skrivas i arbetsloggen i maximo"
  const handleToggleTaskCompleted = (taskId: string) => {
    const currentTasks = order.tasks || [];
    const targetTask = currentTasks.find((t) => t.id === taskId);
    if (!targetTask) return;

    const willBeCompleted = !targetTask.completed;
    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const currentUser = order.planner || 'Fälttekniker';

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
      ...order,
      tasks: updatedTasks,
    };

    if (willBeCompleted) {
      const summaryText = `Uppgift klar: Task ${targetTask.taskNumber} - ${targetTask.description}`;
      const detailText = `Arbetsmoment utfört och kvitterat av ${currentUser} kl ${now}. Fack/Discipline: ${targetTask.trade}, Estimerad tid: ${targetTask.estimatedHours}h.`;

      const res = logTaskCompletionToMaximo(
        updated,
        summaryText,
        'UPPGIFT',
        detailText,
        currentUser
      );
      updated = res.updatedOrder;
      triggerWorkLogToast(`Task ${targetTask.taskNumber} kvitterad & loggad i Maximo`);
    }

    setOrder(updated);
    onSave(updated);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskDesc.trim()) return;

    const currentTasks = order.tasks || [];
    const nextTaskNum = currentTasks.length > 0
      ? Math.max(...currentTasks.map((t) => t.taskNumber)) + 10
      : 10;

    const newTask: import('../types.ts').WorkOrderTask = {
      id: `TSK-${Date.now().toString().slice(-4)}`,
      taskNumber: nextTaskNum,
      description: newTaskDesc.trim(),
      trade: newTaskTrade,
      estimatedHours: Number(newTaskHours) || 2,
      completed: false,
    };

    const updated = {
      ...order,
      tasks: [...currentTasks, newTask],
    };

    setOrder(updated);
    onSave(updated);
    setNewTaskDesc('');
  };

  const handleRemoveTask = (taskId: string) => {
    const updated = {
      ...order,
      tasks: (order.tasks || []).filter((t) => t.id !== taskId),
    };
    setOrder(updated);
    onSave(updated);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden transition-all">
      {/* Top Action Bar */}
      <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer"
            title="Tillbaka till dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-base font-extrabold text-zinc-900 dark:text-zinc-100 tracking-wider">
                {order.id}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {order.level}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                order.status === 'Klar'
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                  : order.status === 'Blockerad'
                  ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 font-bold'
                  : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
              }`}>
                {order.status}
              </span>
            </div>
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 truncate max-w-xl">
              {order.title}
            </h2>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {saveToast && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 animate-pulse mr-2">
              <CheckCircle2 className="w-3.5 h-3.5" /> Sparad!
            </span>
          )}

          {/* Read from template */}
          <button
            onClick={onOpenTemplatesModal}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-800 dark:text-purple-300 text-xs font-semibold transition-colors cursor-pointer"
            title="Läs in färdiga säkerhetskrav, moment och artiklar från en sparad mall"
          >
            <BookmarkCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Läs in från Mall</span>
            <span className="sm:hidden">Mall</span>
          </button>

          {/* Save as template */}
          <button
            onClick={() => onOpenSaveAsTemplate(order)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-medium transition-colors cursor-pointer"
            title="Spara detta jobb som återanvändbar mall till nästa gång"
          >
            <BookmarkPlus className="w-3.5 h-3.5 text-purple-500" />
            <span className="hidden sm:inline">Spara som Mall</span>
          </button>

          {/* Export / Sync to Maximo */}
          <button
            onClick={() => onExportToMaximo(order)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition-colors cursor-pointer shadow-xs"
            title="Exportera eller synka detta jobb tillbaka till IBM Maximo EAM"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportera till Maximo</span>
            <span className="sm:hidden">Maximo</span>
          </button>

          <button
            onClick={() => onPrint(order)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-medium transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Skriv ut</span>
          </button>

          <button
            onClick={handleSaveExplicit}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Spara</span>
          </button>
        </div>
      </div>

      {/* Interactive Gate Stepper & Progression */}
      <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/40">
        <div className="flex items-center justify-between text-xs font-mono mb-2 text-zinc-600 dark:text-zinc-400">
          <span className="font-bold uppercase tracking-wider">Underhållsflöde & Gate-Status:</span>
          <span>Aktiv Gate: G{order.currentGate} ({GATES_DEFINITION.find(g => g.number === order.currentGate)?.subtitle})</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          {GATES_DEFINITION.map((gate) => {
            const isCurrent = gate.number === order.currentGate;
            const isPast = gate.number < order.currentGate;
            const isGate3 = gate.number === 3;
            const isGate3Locked = isGate3 && !gate3Validation.isSatisfied;

            return (
              <button
                key={gate.number}
                onClick={() => setGate(gate.number)}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer relative ${
                  isCurrent
                    ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 ring-2 ring-blue-500/20'
                    : isPast
                    ? 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 text-zinc-500 dark:text-zinc-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-extrabold flex items-center gap-1">
                    <span>G{gate.number}</span>
                    {isPast && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                    {isGate3 && isGate3Locked && <Lock className="w-3 h-3 text-red-500" />}
                  </span>

                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                    isCurrent
                      ? order.status === 'Blockerad'
                        ? 'bg-red-500 text-white'
                        : 'bg-blue-600 text-white'
                      : isPast
                      ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                  }`}>
                    {isCurrent ? 'AKTIV' : isPast ? 'PASSERAD' : 'VÄNTAR'}
                  </span>
                </div>

                <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                  {gate.subtitle}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="px-5 border-b border-zinc-200 dark:border-zinc-800 flex overflow-x-auto space-x-1 sm:space-x-4 bg-zinc-50/50 dark:bg-zinc-950/20">
        <button
          onClick={() => setActiveTab('jobbpaket')}
          className={`py-3 px-3 text-xs font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors flex items-center space-x-1.5 cursor-pointer ${
            activeTab === 'jobbpaket'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          <HardHat className="w-4 h-4" />
          <span>Beredning (Jobbpaket)</span>
        </button>

        <button
          onClick={() => setActiveTab('material')}
          className={`py-3 px-3 text-xs font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors flex items-center space-x-1.5 cursor-pointer ${
            activeTab === 'material'
              ? 'border-amber-600 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Flik A: Leveranskontroll Material</span>
          {!gate3Validation.isSatisfied && (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping ml-1"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('service')}
          className={`py-3 px-3 text-xs font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors flex items-center space-x-1.5 cursor-pointer ${
            activeTab === 'service'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Flik B: Entreprenör & Medius</span>
        </button>

        <button
          onClick={() => setActiveTab('worklog')}
          className={`py-3 px-3 text-xs font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors flex items-center space-x-1.5 cursor-pointer ${
            activeTab === 'worklog'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          <ScrollText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Flik C: Maximo Arbetslogg</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800">
            {order.maximoWorkLog?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('grunddata')}
          className={`py-3 px-3 text-xs font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors flex items-center space-x-1.5 cursor-pointer ${
            activeTab === 'grunddata'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          <span>Grunddata & Nivåval</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="p-5 sm:p-6">
        {/* TAB 1: JOBBPAKET (BEREDNING) */}
        {activeTab === 'jobbpaket' && (
          <div className="space-y-8">
            {/* Level notice box */}
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Aktivt Arbetssätt:</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200">
                    {order.level}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  {order.level === 'Nivå 1' && 'Löpande jobb (<4h): Enkla skyddsåtgärder, begränsad resursinsats och snabb leveranskontroll.'}
                  {order.level === 'Nivå 2' && 'Veckounderhåll: Obligatorisk LOTO och riskanalys, koordinering mellan mek och el.'}
                  {order.level === 'Nivå 3' && 'Stopp / Större Projekt: Fullständigt LOTO-paket, obligatoriska arbetstillstånd (heta arbeten/slutet rum), lyftplan och 3.1 materialcertifikat.'}
                </p>
              </div>

              <div className="shrink-0 flex items-center space-x-2">
                {(['Nivå 1', 'Nivå 2', 'Nivå 3'] as WorkOrderLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => handleLevelChange(lvl)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      order.level === lvl
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* SEKTION 1: SÄKERHET & LOTO */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center space-x-2 pb-3 mb-4 border-b border-zinc-100 dark:border-zinc-800">
                <ShieldAlert className="w-5 h-5 text-red-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                  Säkerhet & LOTO (Bryt & Lås, Riskanalys, Tillstånd)
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {/* LOTO Required */}
                <label className="flex items-center space-x-2.5 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={order.safety.lotoRequired}
                    onChange={(e) => {
                      const updated = {
                        ...order,
                        safety: { ...order.safety, lotoRequired: e.target.checked },
                      };
                      setOrder(updated);
                      onSave(updated);
                    }}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    LOTO Erfordras (Bryt & Lås)
                  </span>
                </label>

                {/* Riskanalys Done */}
                <label className="flex items-center space-x-2.5 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={order.safety.riskAssessmentDone}
                    onChange={(e) => {
                      let updated = {
                        ...order,
                        safety: { ...order.safety, riskAssessmentDone: e.target.checked },
                      };
                      if (e.target.checked && !order.safety.riskAssessmentDone) {
                        const res = logTaskCompletionToMaximo(
                          updated,
                          'Uppgift klar: Riskanalys genomförd och godkänd i Gate 2',
                          'SÄKERHET',
                          'Risker, barriärer och skyddsutrustning specificerade och godkända.',
                          order.planner
                        );
                        updated = res.updatedOrder;
                        triggerWorkLogToast('Riskanalys genomförd & loggad i Maximo');
                      }
                      setOrder(updated);
                      onSave(updated);
                    }}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    Riskanalys Genomförd
                  </span>
                </label>

                {/* Hot work permit */}
                <label className={`flex items-center space-x-2.5 p-3 rounded-lg border transition-colors cursor-pointer select-none ${
                  order.safety.permitHotWork 
                    ? 'border-amber-400 bg-amber-50/60 dark:bg-amber-950/30 text-amber-900 dark:text-amber-100'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 text-zinc-700 dark:text-zinc-300'
                }`}>
                  <input
                    type="checkbox"
                    checked={order.safety.permitHotWork}
                    onChange={(e) => {
                      let updated = {
                        ...order,
                        safety: { ...order.safety, permitHotWork: e.target.checked },
                      };
                      if (e.target.checked && !order.safety.permitHotWork) {
                        const res = logTaskCompletionToMaximo(
                          updated,
                          'Uppgift klar: Arbetstillstånd Heta Arbeten beviljat',
                          'SÄKERHET',
                          'Brandvakt, släckutrustning och tillståndsgivning kvitterade.',
                          order.planner
                        );
                        updated = res.updatedOrder;
                        triggerWorkLogToast('Tillstånd Heta Arbeten beviljat & loggat i Maximo');
                      }
                      setOrder(updated);
                      onSave(updated);
                    }}
                    className="w-4 h-4 rounded text-amber-600"
                  />
                  <span className="text-xs font-bold">
                    Tillstånd Heta Arbeten
                  </span>
                </label>

                {/* Confined Space permit */}
                <label className={`flex items-center space-x-2.5 p-3 rounded-lg border transition-colors cursor-pointer select-none ${
                  order.safety.permitConfinedSpace
                    ? 'border-red-400 bg-red-50/60 dark:bg-red-950/30 text-red-900 dark:text-red-100'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 text-zinc-700 dark:text-zinc-300'
                }`}>
                  <input
                    type="checkbox"
                    checked={order.safety.permitConfinedSpace}
                    onChange={(e) => {
                      let updated = {
                        ...order,
                        safety: { ...order.safety, permitConfinedSpace: e.target.checked },
                      };
                      if (e.target.checked && !order.safety.permitConfinedSpace) {
                        const res = logTaskCompletionToMaximo(
                          updated,
                          'Uppgift klar: Arbetstillstånd Slutet Rum utfärdat',
                          'SÄKERHET',
                          'Gasmätning och friskluftsventilation verifierade innan tillträde.',
                          order.planner
                        );
                        updated = res.updatedOrder;
                        triggerWorkLogToast('Tillstånd Slutet Rum beviljat & loggat i Maximo');
                      }
                      setOrder(updated);
                      onSave(updated);
                    }}
                    className="w-4 h-4 rounded text-red-600"
                  />
                  <span className="text-xs font-bold">
                    Tillstånd Slutet Rum
                  </span>
                </label>

                {/* Working at Height permit */}
                <label className={`flex items-center space-x-2.5 p-3 rounded-lg border transition-colors cursor-pointer select-none ${
                  order.safety.permitWorkingAtHeight
                    ? 'border-amber-400 bg-amber-50/60 dark:bg-amber-950/30 text-amber-900 dark:text-amber-100'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 text-zinc-700 dark:text-zinc-300'
                }`}>
                  <input
                    type="checkbox"
                    checked={order.safety.permitWorkingAtHeight}
                    onChange={(e) => {
                      let updated = {
                        ...order,
                        safety: { ...order.safety, permitWorkingAtHeight: e.target.checked },
                      };
                      if (e.target.checked && !order.safety.permitWorkingAtHeight) {
                        const res = logTaskCompletionToMaximo(
                          updated,
                          'Uppgift klar: Arbetstillstånd Arbete på Höjd utfärdat',
                          'SÄKERHET',
                          'Fallskyddsutrustning, förankringspunkter och skyltning kontrollerade.',
                          order.planner
                        );
                        updated = res.updatedOrder;
                        triggerWorkLogToast('Tillstånd Arbete på Höjd beviljat & loggat i Maximo');
                      }
                      setOrder(updated);
                      onSave(updated);
                    }}
                    className="w-4 h-4 rounded text-amber-600"
                  />
                  <span className="text-xs font-bold">
                    Tillstånd Arbete på Höjd
                  </span>
                </label>
              </div>

              {/* LOTO Details row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800 text-xs">
                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                    LOTO Tillstånds-ID / Brytschema-nr
                  </label>
                  <input
                    type="text"
                    value={order.safety.lotoPermitId}
                    onChange={(e) => {
                      const updated = {
                        ...order,
                        safety: { ...order.safety, lotoPermitId: e.target.value },
                      };
                      setOrder(updated);
                      onSave(updated);
                    }}
                    placeholder="t.ex. LOTO-P4-2026-089"
                    className="w-full px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-zinc-900 dark:text-zinc-100 uppercase"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                    Brytpunkter & Nollenergikontroll (Mek, El, Tryck/Media)
                  </label>
                  <div className="flex flex-wrap gap-4 mt-1.5">
                    <label className="flex items-center space-x-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={order.safety.lotoElectrical}
                        onChange={(e) => {
                          let updated = {
                            ...order,
                            safety: { ...order.safety, lotoElectrical: e.target.checked },
                          };
                          if (e.target.checked && !order.safety.lotoElectrical) {
                            const res = logTaskCompletionToMaximo(
                              updated,
                              'Uppgift klar: Elektrisk brytning verifierad (Ställverk/Säkerhetsbrytare)',
                              'SÄKERHET',
                              'Huvudbrytare låst och spänningslöshet kontrollerad.',
                              order.planner
                            );
                            updated = res.updatedOrder;
                            triggerWorkLogToast('Elektrisk brytning kvitterad & loggad i Maximo');
                          }
                          setOrder(updated);
                          onSave(updated);
                        }}
                        className="w-3.5 h-3.5 rounded text-blue-600"
                      />
                      <span>Elektrisk brytning (Ställverk/Säkerhetsbrytare)</span>
                    </label>

                    <label className="flex items-center space-x-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={order.safety.lotoMechanical}
                        onChange={(e) => {
                          let updated = {
                            ...order,
                            safety: { ...order.safety, lotoMechanical: e.target.checked },
                          };
                          if (e.target.checked && !order.safety.lotoMechanical) {
                            const res = logTaskCompletionToMaximo(
                              updated,
                              'Uppgift klar: Mekanisk spärr applicerad (Kilar, bultar, spärrklossar)',
                              'SÄKERHET',
                              'Rörliga maskindelar mekaniskt fixerade och blockerade mot oavsiktlig rörelse.',
                              order.planner
                            );
                            updated = res.updatedOrder;
                            triggerWorkLogToast('Mekanisk spärr kvitterad & loggad i Maximo');
                          }
                          setOrder(updated);
                          onSave(updated);
                        }}
                        className="w-3.5 h-3.5 rounded text-blue-600"
                      />
                      <span>Mekanisk spärr (Kilar, bultar, spärrklossar)</span>
                    </label>

                    <label className="flex items-center space-x-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={order.safety.lotoPneumaticSteam}
                        onChange={(e) => {
                          let updated = {
                            ...order,
                            safety: { ...order.safety, lotoPneumaticSteam: e.target.checked },
                          };
                          if (e.target.checked && !order.safety.lotoPneumaticSteam) {
                            const res = logTaskCompletionToMaximo(
                              updated,
                              'Uppgift klar: Mediaavstängning och tryckavlastning verifierad',
                              'SÄKERHET',
                              'Ventiler stängda, ledningar avluftade/dränerade och nollenergi kontrollerad.',
                              order.planner
                            );
                            updated = res.updatedOrder;
                            triggerWorkLogToast('Mediaavstängning kvitterad & loggad i Maximo');
                          }
                          setOrder(updated);
                          onSave(updated);
                        }}
                        className="w-3.5 h-3.5 rounded text-blue-600"
                      />
                      <span>Media (Ånga, tryckluft, hydraulik, kem)</span>
                    </label>
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                    Särskilda Säkerhetsinstruktioner
                  </label>
                  <input
                    type="text"
                    value={order.safety.safetyNotes}
                    onChange={(e) => {
                      const updated = {
                        ...order,
                        safety: { ...order.safety, safetyNotes: e.target.value },
                      };
                      setOrder(updated);
                      onSave(updated);
                    }}
                    placeholder="Instruktioner till utförare angående personlig skyddsutrustning eller specifika risker..."
                    className="w-full px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>
            </div>

            {/* SEKTION 2: RESURSER & TIMMAR */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center space-x-2 pb-3 mb-4 border-b border-zinc-100 dark:border-zinc-800">
                <Users className="w-5 h-5 text-blue-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                  Resurser & Kompetenser (Mek, El, Svets, Kran/Lyft + Timmar)
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 text-xs mb-4">
                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                    Mekaniker (h)
                  </label>
                  <input
                    type="number"
                    value={order.resources.mechanicalHours}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      const updated = {
                        ...order,
                        resources: { ...order.resources, mechanicalHours: val },
                      };
                      setOrder(updated);
                      onSave(updated);
                    }}
                    className="w-full px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                    Elektriker (h)
                  </label>
                  <input
                    type="number"
                    value={order.resources.electricalHours}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      const updated = {
                        ...order,
                        resources: { ...order.resources, electricalHours: val },
                      };
                      setOrder(updated);
                      onSave(updated);
                    }}
                    className="w-full px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                    Svetsare (h)
                  </label>
                  <input
                    type="number"
                    value={order.resources.weldingHours}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      const updated = {
                        ...order,
                        resources: { ...order.resources, weldingHours: val },
                      };
                      setOrder(updated);
                      onSave(updated);
                    }}
                    className="w-full px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                    Kran/Lyft (h)
                  </label>
                  <input
                    type="number"
                    value={order.resources.craneHours}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      const updated = {
                        ...order,
                        resources: { ...order.resources, craneHours: val },
                      };
                      setOrder(updated);
                      onSave(updated);
                    }}
                    className="w-full px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                    Entreprenör (h)
                  </label>
                  <input
                    type="number"
                    value={order.resources.contractorHours}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      const updated = {
                        ...order,
                        resources: { ...order.resources, contractorHours: val },
                      };
                      setOrder(updated);
                      onSave(updated);
                    }}
                    className="w-full px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                    Total beräknad tid
                  </label>
                  <div className="px-3 py-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono font-bold">
                    {order.resources.mechanicalHours +
                      order.resources.electricalHours +
                      order.resources.weldingHours +
                      order.resources.craneHours +
                      order.resources.contractorHours} h
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-3">
                  <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                    Entreprenörsfirma / Leverantör
                  </label>
                  <input
                    type="text"
                    value={order.resources.contractorCompany}
                    onChange={(e) => {
                      const updated = {
                        ...order,
                        resources: { ...order.resources, contractorCompany: e.target.value },
                      };
                      setOrder(updated);
                      onSave(updated);
                    }}
                    placeholder="t.ex. Industrirör & Montage AB"
                    className="w-full px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div className="col-span-2 sm:col-span-3">
                  <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                    Arbetsledare / Skiftansvarig montör
                  </label>
                  <input
                    type="text"
                    value={order.resources.crewLeader}
                    onChange={(e) => {
                      const updated = {
                        ...order,
                        resources: { ...order.resources, crewLeader: e.target.value },
                      };
                      setOrder(updated);
                      onSave(updated);
                    }}
                    placeholder="t.ex. Stefan Bergström"
                    className="w-full px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>
            </div>

            {/* SEKTION 3: TEKNISK DOKUMENTATION & MONTERINGSINSTRUKTIONER */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center space-x-2 pb-3 mb-4 border-b border-zinc-100 dark:border-zinc-800">
                <FileCode className="w-5 h-5 text-emerald-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                  Teknisk Dokumentation (Ritningar, Elschema, Moment, Instruktioner)
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mb-3">
                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                    Ritningsnummer
                  </label>
                  <input
                    type="text"
                    value={order.documentation.drawingNumber}
                    onChange={(e) => {
                      const updated = {
                        ...order,
                        documentation: { ...order.documentation, drawingNumber: e.target.value },
                      };
                      setOrder(updated);
                      onSave(updated);
                    }}
                    placeholder="t.ex. RIT-P4-421-8812 rev C"
                    className="w-full px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                    Elschema / P&ID
                  </label>
                  <input
                    type="text"
                    value={order.documentation.electricalDiagram}
                    onChange={(e) => {
                      const updated = {
                        ...order,
                        documentation: { ...order.documentation, electricalDiagram: e.target.value },
                      };
                      setOrder(updated);
                      onSave(updated);
                    }}
                    placeholder="t.ex. EL-421-SCH-04 / PID-P4-STEAM"
                    className="w-full px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                    Åtdragningsmoment (Nm)
                  </label>
                  <input
                    type="text"
                    value={order.documentation.tighteningTorqueNm}
                    onChange={(e) => {
                      const updated = {
                        ...order,
                        documentation: { ...order.documentation, tighteningTorqueNm: e.target.value },
                      };
                      setOrder(updated);
                      onSave(updated);
                    }}
                    placeholder="t.ex. 320 Nm (M24 A4-80, korsdragning)"
                    className="w-full px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                    Arbetsinstruktion / Steg-för-steg metodik
                  </label>
                  <textarea
                    rows={3}
                    value={order.documentation.workInstructions}
                    onChange={(e) => {
                      const updated = {
                        ...order,
                        documentation: { ...order.documentation, workInstructions: e.target.value },
                      };
                      setOrder(updated);
                      onSave(updated);
                    }}
                    placeholder="1. Verifiera LOTO... 2. Demontera... 3. Montera... 4. Provkör..."
                    className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* SEKTION 4: RESERVDELAR & MATERIAL */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center space-x-2">
                  <Package className="w-5 h-5 text-amber-500" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                    Artikellista & Reservdelar ({order.materials.length} artiklar)
                  </h3>
                </div>
                <button
                  onClick={() => setActiveTab('material')}
                  className="text-xs text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <span>Gå till Leveranskontroll (Flik A)</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Table of materials */}
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-mono">
                      <th className="py-2 px-2">Artikelnr</th>
                      <th className="py-2 px-2">Benämning</th>
                      <th className="py-2 px-2">Antal</th>
                      <th className="py-2 px-2">Lagerstatus</th>
                      <th className="py-2 px-2">Hyllplats</th>
                      <th className="py-2 px-2">Certifikatkrav</th>
                      <th className="py-2 px-2 text-right">Åtgärd</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {order.materials.map((mat) => (
                      <tr key={mat.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                        <td className="py-2.5 px-2 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                          {mat.partNumber}
                        </td>
                        <td className="py-2.5 px-2 text-zinc-800 dark:text-zinc-200 font-medium">
                          {mat.description}
                        </td>
                        <td className="py-2.5 px-2 font-mono">
                          {mat.quantity} {mat.unit}
                        </td>
                        <td className="py-2.5 px-2">
                          <button
                            onClick={() => handleToggleMaterialInStock(mat.id)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                              mat.inStock
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                : 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 animate-pulse'
                            }`}
                            title="Klicka för att ändra lagerstatus"
                          >
                            {mat.inStock ? 'I LAGER' : 'SAKNAS / EJ ANLÄNT'}
                          </button>
                        </td>
                        <td className="py-2.5 px-2 font-mono text-zinc-600 dark:text-zinc-400">
                          {mat.shelfLocation || 'Ej angiven'}
                        </td>
                        <td className="py-2.5 px-2">
                          {mat.certificateRequired ? (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              3.1 Krav
                            </span>
                          ) : (
                            <span className="text-[10px] text-zinc-400">Standard</span>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <button
                            onClick={() => handleRemoveMaterial(mat.id)}
                            className="p-1 text-zinc-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                            title="Ta bort artikel"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add material row form */}
              <form onSubmit={handleAddMaterial} className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800">
                <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-blue-500" />
                  <span>Lägg till reservdel i jobbpaketet:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-6 gap-2 text-xs">
                  <input
                    type="text"
                    placeholder="Artikelnr (t.ex. VNT-102)"
                    value={newPartNumber}
                    onChange={(e) => setNewPartNumber(e.target.value)}
                    className="sm:col-span-1 px-2.5 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono uppercase"
                  />
                  <input
                    type="text"
                    placeholder="Benämning (t.ex. O-ring Viton)"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="sm:col-span-2 px-2.5 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                  />
                  <div className="flex gap-1">
                    <input
                      type="number"
                      min="1"
                      placeholder="Antal"
                      value={newQuantity}
                      onChange={(e) => setNewQuantity(Number(e.target.value))}
                      className="w-16 px-2 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono"
                    />
                    <select
                      value={newUnit}
                      onChange={(e) => setNewUnit(e.target.value)}
                      className="px-2 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono"
                    >
                      <option value="st">st</option>
                      <option value="m">m</option>
                      <option value="kg">kg</option>
                      <option value="l">l</option>
                      <option value="sats">sats</option>
                    </select>
                  </div>
                  <input
                    type="text"
                    placeholder="Hylla (t.ex. KITT-B12)"
                    value={newShelfLocation}
                    onChange={(e) => setNewShelfLocation(e.target.value)}
                    className="px-2.5 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono uppercase"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 font-bold transition-colors cursor-pointer"
                  >
                    + Lägg till
                  </button>
                </div>
              </form>
            </div>

            {/* SEKTION 5: ARBETSUPPGIFTER & UTFÖRANDE (MAXIMO WOACTIVITY / TASKS) */}
            <div className={`bg-white dark:bg-zinc-900 border rounded-xl p-5 shadow-sm transition-all ${
              order.currentGate === 4 
                ? 'border-blue-500 ring-2 ring-blue-500/20' 
                : 'border-zinc-200 dark:border-zinc-800'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-zinc-100 dark:border-zinc-800 gap-2">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                        Maximo Arbetsuppgifter & Utförande (WOACTIVITY / Tasks)
                      </h3>
                      {order.currentGate === 4 && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-600 text-white animate-pulse">
                          GATE 4 AKTIV
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Varje gång en uppgift bockas av skrivs den automatiskt in i Maximo Arbetslogg (WORKLOG) i realtid med tid och signatur.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  <div className="text-right text-xs">
                    <span className="text-zinc-500 block text-[11px]">Framsteg i fält:</span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      {(order.tasks || []).filter(t => t.completed).length} av {(order.tasks || []).length} klara
                    </span>
                  </div>
                  <div className="w-24 bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full transition-all duration-300"
                      style={{
                        width: `${
                          (order.tasks || []).length > 0 
                            ? Math.round(((order.tasks || []).filter(t => t.completed).length / (order.tasks || []).length) * 100)
                            : 0
                        }%`
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Tasks List */}
              <div className="space-y-2.5 mb-4">
                {(!order.tasks || order.tasks.length === 0) ? (
                  <div className="p-4 text-center rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 text-xs text-zinc-500">
                    Inga uppgifter upplagda ännu. Lägg till uppgifter i formuläret nedan.
                  </div>
                ) : (
                  order.tasks.map((task) => (
                    <div
                      key={task.id}
                      className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                        task.completed
                          ? 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/40 dark:bg-emerald-950/20'
                          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => handleToggleTaskCompleted(task.id)}
                          className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 mt-0.5 cursor-pointer shrink-0"
                          title="Klicka för att klarmarkera uppgift (skrivs direkt till Maximo Arbetslogg)"
                        />
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-xs text-zinc-600 dark:text-zinc-400">
                              Task {task.taskNumber}
                            </span>
                            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                              task.trade === 'MEK'
                                ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
                                : task.trade === 'EL'
                                ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                                : task.trade === 'SVETS'
                                ? 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300'
                                : task.trade === 'KRAN'
                                ? 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                            }`}>
                              {task.trade}
                            </span>
                            <span className="text-[11px] text-zinc-500 font-mono">
                              Est: {task.estimatedHours}h
                            </span>
                          </div>

                          <div className={`text-xs font-semibold mt-1 ${
                            task.completed
                              ? 'text-zinc-900 dark:text-zinc-100'
                              : 'text-zinc-800 dark:text-zinc-200'
                          }`}>
                            {task.description}
                          </div>

                          {task.completed && (
                            <div className="flex items-center space-x-2 text-[10px] text-emerald-700 dark:text-emerald-400 font-medium mt-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Klarmarkerad av {task.completedBy || 'Tekniker'} kl {task.completedAt}</span>
                              <span className="text-zinc-400">•</span>
                              <span className="text-emerald-600 dark:text-emerald-300 font-mono">Skriven i Maximo WORKLOG</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveTask(task.id)}
                        className="p-1 text-zinc-400 hover:text-red-600 rounded transition-colors cursor-pointer shrink-0"
                        title="Ta bort uppgift"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add task form */}
              <form onSubmit={handleAddTask} className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800">
                <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-blue-500" />
                  <span>Lägg till arbetsmoment / deluppgift:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-6 gap-2 text-xs">
                  <input
                    type="text"
                    placeholder="Beskrivning av moment (t.ex. Laseruppriktning av koppling)"
                    value={newTaskDesc}
                    onChange={(e) => setNewTaskDesc(e.target.value)}
                    className="sm:col-span-3 px-2.5 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                  />
                  <select
                    value={newTaskTrade}
                    onChange={(e) => setNewTaskTrade(e.target.value as any)}
                    className="px-2 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono"
                  >
                    <option value="MEK">MEK (Mekanik)</option>
                    <option value="EL">EL (Elektriker)</option>
                    <option value="SVETS">SVETS (Svetsare)</option>
                    <option value="KRAN">KRAN (Kran/Rigg)</option>
                    <option value="AUTO">AUTO (Automation)</option>
                    <option value="ALLM">ALLM (Allmänt)</option>
                  </select>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      placeholder="Timmar"
                      value={newTaskHours}
                      onChange={(e) => setNewTaskHours(Number(e.target.value))}
                      className="w-full px-2 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono"
                    />
                    <span className="text-[11px] text-zinc-400">h</span>
                  </div>
                  <button
                    type="submit"
                    disabled={!newTaskDesc.trim()}
                    className="px-3 py-1.5 rounded bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 font-bold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    + Lägg till
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 2: FLIK A: LEVERANSKONTROLL MATERIAL (MED DEN HÅRDA SPÄRREN) */}
        {activeTab === 'material' && (
          <MaterialInspectionTab
            order={order}
            onChange={(updated) => {
              setOrder(updated);
              onSave(updated);
            }}
          />
        )}

        {/* TAB 3: FLIK B: ENTREPRENÖR & MEDIUS-ATTEST */}
        {activeTab === 'service' && (
          <ServiceInspectionTab
            order={order}
            onChange={(updated) => {
              setOrder(updated);
              onSave(updated);
            }}
          />
        )}

        {/* TAB 4: GRUNDDATA & NIVÅVAL */}
        {activeTab === 'grunddata' && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 pb-2 border-b border-zinc-100 dark:border-zinc-800">
              Grundläggande Maximo-data & Position
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                  Arbetsordernummer (AO)
                </label>
                <input
                  type="text"
                  value={order.id}
                  onChange={(e) => handleFieldChange({ id: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                  Prioritet
                </label>
                <select
                  value={order.priority}
                  onChange={(e) => handleFieldChange({ priority: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono"
                >
                  <option value="1 - Akut">1 - Akut (Stoppar produktion)</option>
                  <option value="2 - Hög">2 - Hög (Kommande underhållsstopp)</option>
                  <option value="3 - Normal">3 - Normal (Planerad beredning)</option>
                  <option value="4 - Låg">4 - Låg (Förebyggande / inspektion)</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                  Beredare (Planner)
                </label>
                <input
                  type="text"
                  value={order.planner}
                  onChange={(e) => handleFieldChange({ planner: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-zinc-600 dark:text-zinc-400 font-medium">
                    Benämning på arbetsorder
                  </label>
                  <button
                    type="button"
                    onClick={() => handleFieldChange({ title: formatMaximoTitle(order.id, order.title) })}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1 font-semibold"
                    title="Formatera enligt Maximo-kravet: [AO-nummer] - [Beskrivning]"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Sätt Maximo-standard: [AO] - [Beskrivning]</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={order.title}
                  onChange={(e) => handleFieldChange({ title: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold"
                />
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                  Planerat fönster / Stoppvecka
                </label>
                <input
                  type="text"
                  value={order.stopWindow || ''}
                  onChange={(e) => handleFieldChange({ stopWindow: e.target.value })}
                  placeholder="t.ex. Underhållsstopp V.45"
                  className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                  Anläggningsdel
                </label>
                <input
                  type="text"
                  value={order.facility}
                  onChange={(e) => handleFieldChange({ facility: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                  Position / KKS-kod
                </label>
                <input
                  type="text"
                  value={order.position}
                  onChange={(e) => handleFieldChange({ position: e.target.value })}
                  placeholder="t.ex. 421-V012 eller RB-104-DRV"
                  className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                  Planerat startdatum
                </label>
                <input
                  type="date"
                  value={order.plannedStartDate}
                  onChange={(e) => handleFieldChange({ plannedStartDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: FLIK C: MAXIMO ARBETSLOGG (WORKLOG) */}
        {activeTab === 'worklog' && (
          <div className="space-y-6">
            {/* Header info banner */}
            <div className="p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-gradient-to-r from-emerald-50/70 to-blue-50/50 dark:from-emerald-950/40 dark:to-zinc-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start space-x-3">
                <div className="p-2.5 rounded-lg bg-emerald-600 text-white shrink-0 shadow-sm">
                  <ScrollText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-sm tracking-wide uppercase text-zinc-900 dark:text-zinc-100">
                      IBM Maximo Arbetslogg (Objektstruktur WORKLOG)
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      LIVE MAXIMO LOGG
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                    Varje gång en uppgift (riskanalys, tillstånd, reservdel, materialkontroll, kitting, slutbesiktning eller gate-övergång) blir klar skrivs den automatiskt hit och synkas till Maximo.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onExportToMaximo(order)}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 shadow-sm"
                  title="Synka hela arbetsloggen till IBM Maximo"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Synka logg till Maximo</span>
                </button>
              </div>
            </div>

            {/* Quick summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
                <span className="text-zinc-500 text-[11px] block">Totalt loggade poster</span>
                <span className="text-base font-extrabold font-mono text-zinc-900 dark:text-zinc-100">
                  {order.maximoWorkLog?.length || 0} st
                </span>
              </div>
              <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
                <span className="text-zinc-500 text-[11px] block">Uppgifter & Säkerhet</span>
                <span className="text-base font-extrabold font-mono text-blue-600 dark:text-blue-400">
                  {order.maximoWorkLog?.filter(w => w.logType === 'UPPGIFT' || w.logType === 'SÄKERHET').length || 0} st
                </span>
              </div>
              <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
                <span className="text-zinc-500 text-[11px] block">Leverans & Kitting</span>
                <span className="text-base font-extrabold font-mono text-amber-600 dark:text-amber-400">
                  {order.maximoWorkLog?.filter(w => w.logType === 'LEVERANS' || w.logType === 'MATERIAL').length || 0} st
                </span>
              </div>
              <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
                <span className="text-zinc-500 text-[11px] block">Besiktning & Medius</span>
                <span className="text-base font-extrabold font-mono text-indigo-600 dark:text-indigo-400">
                  {order.maximoWorkLog?.filter(w => w.logType === 'INSPEKTION' || w.logType === 'MEDIUS' || w.logType === 'STATUS').length || 0} st
                </span>
              </div>
            </div>

            {/* Manual note form */}
            <form onSubmit={handleAddManualWorkLog} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-emerald-500" />
                  <span>Skriv notering direkt till Maximo Arbetslogg</span>
                </h4>
                <span className="text-[11px] text-zinc-500">Mappas till IBM Maximo WORKLOG-tabell</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Sammanfattning / Arbetsmoment (Maximo Summary):
                  </label>
                  <input
                    type="text"
                    placeholder="t.ex. Kontrollmätning axeltapp utförd, spel inom 0.03 mm"
                    value={newLogSummary}
                    onChange={(e) => setNewLogSummary(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Loggtyp (LOGTYPE):
                  </label>
                  <select
                    value={newLogType}
                    onChange={(e) => setNewLogType(e.target.value as any)}
                    className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-xs font-mono cursor-pointer"
                  >
                    <option value="NOTERING">NOTERING - Fältanteckning</option>
                    <option value="UPPGIFT">UPPGIFT - Genomfört moment</option>
                    <option value="SÄKERHET">SÄKERHET - LOTO / Tillstånd</option>
                    <option value="LEVERANS">LEVERANS - Material & Kittning</option>
                    <option value="INSPEKTION">INSPEKTION - Slutkontroll</option>
                    <option value="MEDIUS">MEDIUS - Faktura & Timmar</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Utförlig loggtext / Anteckningar (Long Description):
                </label>
                <textarea
                  rows={2}
                  placeholder="Skriv ytterligare detaljer om det utförda arbetet eller mätresultat..."
                  value={newLogDetail}
                  onChange={(e) => setNewLogDetail(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-xs"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={!newLogSummary.trim()}
                  className="px-4 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 font-bold text-xs disabled:opacity-50 transition-all cursor-pointer flex items-center space-x-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Lägg till i Maximo-logg</span>
                </button>
              </div>
            </form>

            {/* Work log entries timeline */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-500">
                  Kronologiskt Loggflöde ({order.maximoWorkLog?.length || 0} poster):
                </h4>
                <span className="text-[11px] text-zinc-400 font-mono">Nyast överst</span>
              </div>

              {(!order.maximoWorkLog || order.maximoWorkLog.length === 0) ? (
                <div className="p-8 text-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 text-xs">
                  Inga loggposter ännu. Varje gång en uppgift i jobbpaketet eller kontrollerna bockas av skrivs den hit.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {order.maximoWorkLog.map((log) => {
                    const getBadgeStyle = (type: string) => {
                      switch (type) {
                        case 'SÄKERHET':
                          return 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
                        case 'LEVERANS':
                        case 'MATERIAL':
                          return 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800';
                        case 'STATUS':
                          return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
                        case 'MEDIUS':
                          return 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
                        case 'INSPEKTION':
                          return 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
                        default:
                          return 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
                      }
                    };

                    return (
                      <div
                        key={log.id}
                        className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all text-xs shadow-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${getBadgeStyle(log.logType)}`}>
                              {log.logType}
                            </span>
                            <span className="font-mono text-[10px] text-zinc-400">
                              {log.id}
                            </span>
                          </div>

                          <div className="flex items-center space-x-3 text-[11px] text-zinc-500">
                            <span className="flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3 text-zinc-400" />
                              <span>{log.createDate}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3 text-zinc-400" />
                              <span className="font-semibold">{log.createBy}</span>
                            </span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                              log.syncedToMaximo 
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' 
                                : 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
                            }`}>
                              {log.syncedToMaximo ? 'Synkad i Maximo' : 'Lokal logg'}
                            </span>
                          </div>
                        </div>

                        <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100 mb-0.5">
                          {log.summary}
                        </div>

                        {log.detail && log.detail !== log.summary && (
                          <div className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1 whitespace-pre-line bg-zinc-50 dark:bg-zinc-800/40 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800">
                            {log.detail}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating WorkLog Auto-Notification Toast */}
      {workLogToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-2xl border border-emerald-400 dark:border-emerald-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 flex items-center space-x-3 animate-in slide-in-from-bottom-5 duration-200">
          <div className="p-2.5 rounded-lg bg-emerald-500 text-white shrink-0 shadow-md">
            <ScrollText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-600 dark:text-emerald-400 font-mono">
                Skrivet i Maximo Arbetslogg
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">kl {workLogToast.time}</span>
            </div>
            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mt-0.5 max-w-sm line-clamp-2">
              {workLogToast.summary}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
