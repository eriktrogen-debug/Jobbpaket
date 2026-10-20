import React, { useState } from 'react';
import { X, Plus, ShieldAlert, Sparkles, Layers, BookmarkCheck } from 'lucide-react';
import { WorkOrder, WorkOrderLevel, JobTemplate } from '../types.ts';
import { formatMaximoTitle } from '../utils/storage.ts';

interface NewWorkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (newOrder: WorkOrder) => void;
  existingCount: number;
  templates?: JobTemplate[];
}

export const NewWorkOrderModal: React.FC<NewWorkOrderModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  existingCount,
  templates = [],
}) => {
  const nextId = `AO-${520000 + existingCount + 1}`;

  const [id, setId] = useState(nextId);
  const [title, setTitle] = useState('');
  const [facility, setFacility] = useState('');
  const [position, setPosition] = useState('');
  const [level, setLevel] = useState<WorkOrderLevel>('Nivå 2');
  const [priority, setPriority] = useState<WorkOrder['priority']>('2 - Hög');
  const [planner, setPlanner] = useState('Erik Trogen (Beredare)');
  const [stopWindow, setStopWindow] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [plannedStartDate, setPlannedStartDate] = useState(
    new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0]
  );

  const handleSelectTemplate = (tmplId: string) => {
    setSelectedTemplateId(tmplId);
    if (!tmplId) return;

    const tmpl = templates.find((t) => t.id === tmplId);
    if (tmpl) {
      if (!title.trim() || title.startsWith('Nytt')) {
        setTitle(tmpl.name);
      }
      setLevel(tmpl.level);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !position.trim()) {
      alert('Vänligen ange benämning och position.');
      return;
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);

    const isLevel3 = level === 'Nivå 3';
    const isLevel2 = level === 'Nivå 2';

    const tmpl = templates.find((t) => t.id === selectedTemplateId);
    const cleanId = id.trim().toUpperCase() || nextId;
    const formattedTitle = formatMaximoTitle(cleanId, title.trim());

    const newOrder: WorkOrder = {
      id: cleanId,
      title: formattedTitle,
      facility: facility.trim() || 'Huvudanläggning',
      position: position.trim().toUpperCase(),
      level,
      currentGate: 1, // Starts in Gate 1: Identifiering & Nivåval
      status: 'Pågående',
      priority,
      planner: planner.trim(),
      createdDate: now.split(' ')[0],
      plannedStartDate,
      stopWindow: stopWindow.trim() || (isLevel3 ? 'Kommande Huvudstopp' : 'Löpande planering'),
      gate3Approved: false,

      safety: tmpl ? { ...tmpl.safety } : {
        lotoRequired: isLevel2 || isLevel3,
        lotoMechanical: isLevel3,
        lotoElectrical: isLevel2 || isLevel3,
        lotoPneumaticSteam: isLevel3,
        lotoPermitId: `LOTO-${position.trim().toUpperCase() || 'STD'}`,
        riskAssessmentDone: false,
        permitHotWork: false,
        permitConfinedSpace: false,
        permitWorkingAtHeight: isLevel3,
        ppeRequired: ['Skyddsskor S3', 'Hjälm & Skyddsglasögon'],
        safetyNotes: '',
      },

      resources: tmpl ? { ...tmpl.resources } : {
        mechanicalHours: isLevel1(level) ? 2 : isLevel2 ? 8 : 16,
        electricalHours: isLevel1(level) ? 0 : 4,
        weldingHours: isLevel3 ? 8 : 0,
        craneHours: isLevel3 ? 4 : 0,
        contractorNeeded: isLevel3,
        contractorCompany: isLevel3 ? 'Industriservice AB' : '',
        contractorHours: isLevel3 ? 16 : 0,
        crewLeader: 'Skiftledare Mek',
        estimatedTotalHours: isLevel1(level) ? 2 : isLevel2 ? 12 : 44,
      },

      documentation: tmpl ? { ...tmpl.documentation } : {
        drawingNumber: '',
        electricalDiagram: '',
        pidRef: '',
        tighteningTorqueNm: '',
        lubricationSpec: '',
        workInstructions: '1. Verifiera LOTO och anläggningens driftstatus.\n2. Utför planerat underhåll enligt specifikation.\n3. Provkör och återställ.',
        attachedFiles: [],
      },

      materials: tmpl ? tmpl.materials.map(m => ({ ...m, id: `MAT-${Date.now().toString().slice(-4)}-${m.id}` })) : [],

      materialInspection: {
        checkedAgainstDrawing: false,
        transportUndamaged: false,
        certificatesReceived: !isLevel3, // Required for level 3
        physicallyKittedAndTagged: false,
        shelfLocationConfirmed: false,
        shelfLocation: '',
        inspectorName: '',
        inspectionDate: '',
        notes: tmpl ? `Skapad med mall "${tmpl.name}".` : '',
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
          id: `WL-${cleanId.replace(/[^0-9]/g, '') || '00'}-01`,
          wonum: cleanId,
          logType: 'STATUS',
          summary: `Arbetsorder upprättad i Gate 1 (${level})`,
          detail: tmpl
            ? `AO initierad baserat på standardmall "${tmpl.name}". Planerad start: ${plannedStartDate}.`
            : `AO skapad för ${facility.trim() || 'Huvudanläggning'} (${position.trim().toUpperCase()}). Beredare: ${planner.trim()}.`,
          createBy: planner.trim() || 'Beredare',
          createDate: now,
          syncedToMaximo: false,
        },
      ],

      history: [
        {
          date: now,
          user: planner,
          action: tmpl 
            ? `AO skapad baserat på mall "${tmpl.name}" (Nivå: ${level}).`
            : `AO skapad i Gate 1 med vald nivå: ${level}.`,
        },
      ],
    };

    onCreate(newOrder);
    onClose();
  };

  function isLevel1(lvl: WorkOrderLevel) {
    return lvl === 'Nivå 1';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/60">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Plus className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              Skapa Ny Arbetsorder (AO)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Optional template selector */}
          {templates.length > 0 && (
            <div className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/80">
              <label className="block text-purple-900 dark:text-purple-200 font-bold mb-1 flex items-center gap-1.5">
                <BookmarkCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Basera på sparad Jobbmall (Valfritt):</span>
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleSelectTemplate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold cursor-pointer"
              >
                <option value="">-- Ingen mall (Börja från tomt underlag) --</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.category} • {t.level})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* AO ID & Level */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                Arbetsordernummer (AO)
              </label>
              <input
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                Prioritet
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono cursor-pointer"
              >
                <option value="1 - Akut">1 - Akut (Stopp)</option>
                <option value="2 - Hög">2 - Hög (Stoppvecka)</option>
                <option value="3 - Normal">3 - Normal</option>
                <option value="4 - Låg">4 - Låg</option>
              </select>
            </div>
          </div>

          {/* Level Selection with clear visual helper */}
          <div>
            <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1.5 flex items-center justify-between">
              <span>Val av Arbetssätt (Nivåval)</span>
              <span className="text-[11px] text-zinc-400">Anpassar automatiskt krav i checklistor</span>
            </label>

            <div className="grid grid-cols-3 gap-2">
              {(['Nivå 1', 'Nivå 2', 'Nivå 3'] as WorkOrderLevel[]).map((lvl) => (
                <button
                  type="button"
                  key={lvl}
                  onClick={() => setLevel(lvl)}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    level === lvl
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 ring-2 ring-blue-500/20'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <div className="font-bold text-xs">{lvl}</div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {lvl === 'Nivå 1' && 'Löpande (<4h)'}
                    {lvl === 'Nivå 2' && 'Veckounderhåll'}
                    {lvl === 'Nivå 3' && 'Stopp/Projekt'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-zinc-600 dark:text-zinc-400 font-medium">
                Benämning / Arbetsbeskrivning
              </label>
              {title.trim() && (
                <button
                  type="button"
                  onClick={() => setTitle(formatMaximoTitle(id || nextId, title))}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1 font-semibold"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Prefixa med AO-nummer</span>
                </button>
              )}
            </div>
            <input
              type="text"
              placeholder="t.ex. Byte av matarpump P-102 inkl. laseruppriktning"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-medium"
            />
            <p className="text-[10px] text-zinc-500 mt-1">
              Formateras automatiskt som <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">{formatMaximoTitle(id || nextId, title || 'Beskrivning')}</span> för Maximo-kompatibilitet.
            </p>
          </div>

          {/* Facility & Position */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                Anläggningsdel
              </label>
              <input
                type="text"
                placeholder="t.ex. Ångcentral / Panna 3"
                value={facility}
                onChange={(e) => setFacility(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                Position (KKS / Tag-nummer)
              </label>
              <input
                type="text"
                placeholder="t.ex. 312-P102"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono uppercase"
              />
            </div>
          </div>

          {/* Planner & Stop window */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                Beredare
              </label>
              <input
                type="text"
                value={planner}
                onChange={(e) => setPlanner(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                Planerat Fönster / Stoppvecka
              </label>
              <input
                type="text"
                placeholder="t.ex. Stoppvecka 46 eller Tisdag Skift A"
                value={stopWindow}
                onChange={(e) => setStopWindow(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium cursor-pointer"
            >
              Avbryt
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors cursor-pointer"
            >
              Skapa Jobbpaket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
