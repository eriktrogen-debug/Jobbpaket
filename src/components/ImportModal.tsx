import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  Database, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Server,
  Search,
  Sparkles
} from 'lucide-react';
import { WorkOrder, WorkOrderLevel } from '../types.ts';
import { formatMaximoTitle } from '../utils/storage.ts';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportOrders: (orders: WorkOrder[]) => void;
  existingCount: number;
}

// Simulated active Maximo work queue ready for import
const MOCK_MAXIMO_QUEUE = [
  {
    wonum: 'AO-601923',
    rawDescription: 'Revidering och packningsbyte kylvattenpump P-402',
    location: 'Panna 4 / Kylvattensystem',
    assetnum: '421-P402',
    worktype: 'Nivå 2' as WorkOrderLevel,
    priority: '2 - Hög' as const,
    schedstart: '2026-11-10',
    planner: 'Maximo Auto-Sync (Beredningskö)',
    stopWindow: 'Stoppvecka 46',
    materialsCount: 2,
    instructions: '1. Säkra LOTO på matningsställverk.\n2. Töm pumphus och demontera gavelfläns.\n3. Byt packningssats och slitringar.\n4. Momentdra och provkör mot stängd ventil.',
  },
  {
    wonum: 'AO-602881',
    rawDescription: 'Byte av vibrationsgivare & signalkabel på primärluftsfläkt F-12',
    location: 'Rökgasrening / Fläkthall',
    assetnum: '210-F012',
    worktype: 'Nivå 1' as WorkOrderLevel,
    priority: '3 - Normal' as const,
    schedstart: '2026-10-28',
    planner: 'Instrumentplanerare',
    stopWindow: 'Löpande UH (<4h)',
    materialsCount: 1,
    instructions: 'Byt accelerometersensor och dra ny skärmad signalkabel till kopplingslåda JB-12.',
  },
  {
    wonum: 'AO-603105',
    rawDescription: 'Totalrenovering ångturbinlager TB-01 vid planerat storstopp',
    location: 'Turbinhall / TG-1',
    assetnum: 'TG1-BRG01',
    worktype: 'Nivå 3' as WorkOrderLevel,
    priority: '1 - Akut' as const,
    schedstart: '2026-11-20',
    planner: 'Turbinspecialist',
    stopWindow: 'Huvudstopp V.47',
    materialsCount: 4,
    instructions: 'Omfattande revisionsarbete: Lagerspelsmätning, oljespolning, heta arbeten och kranlyft.',
  },
];

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportOrders,
  existingCount,
}) => {
  const [activeTab, setActiveTab] = useState<'maximo' | 'excel'>('maximo');
  const [maximoSearch, setMaximoSearch] = useState('');
  const [maximoCustomDesc, setMaximoCustomDesc] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);

  // Excel state
  const [excelPreview, setExcelPreview] = useState<any[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [excelError, setExcelError] = useState<string | null>(null);
  const [pastedData, setPastedData] = useState<string>('');

  if (!isOpen) return null;

  // 1. MAXIMO DIRECT IMPORT HANDLER
  const handleImportMaximoOrder = (item: typeof MOCK_MAXIMO_QUEUE[0]) => {
    setIsSyncing(true);
    setTimeout(() => {
      const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
      const isLvl3 = item.worktype === 'Nivå 3';
      const isLvl2 = item.worktype === 'Nivå 2';

      // Formatting requirement: Title MUST strictly be "AO-nummer - Beskrivning"
      const formattedTitle = formatMaximoTitle(item.wonum, item.rawDescription);

      const newOrder: WorkOrder = {
        id: item.wonum,
        title: formattedTitle,
        facility: item.location,
        position: item.assetnum,
        level: item.worktype,
        currentGate: 1,
        status: 'Pågående',
        priority: item.priority,
        planner: item.planner,
        createdDate: now.split(' ')[0],
        plannedStartDate: item.schedstart,
        stopWindow: item.stopWindow,
        gate3Approved: false,

        safety: {
          lotoRequired: isLvl2 || isLvl3,
          lotoMechanical: isLvl3,
          lotoElectrical: true,
          lotoPneumaticSteam: isLvl3,
          lotoPermitId: `LOTO-${item.assetnum}`,
          riskAssessmentDone: false,
          permitHotWork: isLvl3,
          permitConfinedSpace: false,
          permitWorkingAtHeight: isLvl3,
          ppeRequired: ['Hjälm', 'Skyddsskor S3', 'Skyddsglasögon'],
          safetyNotes: 'Synkad från Maximo EAM. Verifiera brytschema innan fältstart.',
        },

        resources: {
          mechanicalHours: isLvl3 ? 20 : isLvl2 ? 8 : 2,
          electricalHours: isLvl3 ? 8 : 2,
          weldingHours: isLvl3 ? 6 : 0,
          craneHours: isLvl3 ? 4 : 0,
          contractorNeeded: isLvl3,
          contractorCompany: isLvl3 ? 'Specialistservice AB' : '',
          contractorHours: isLvl3 ? 24 : 0,
          crewLeader: 'Skiftansvarig montör',
          estimatedTotalHours: isLvl3 ? 58 : isLvl2 ? 10 : 4,
        },

        documentation: {
          drawingNumber: `RIT-${item.assetnum}-REV`,
          electricalDiagram: `EL-${item.assetnum}`,
          pidRef: 'Maximo P&ID länk',
          tighteningTorqueNm: isLvl3 ? '180 Nm' : '75 Nm',
          lubricationSpec: 'Standard enligt smörjplan',
          workInstructions: item.instructions,
          attachedFiles: ['Maximo_Arbetsorder_Export.pdf'],
        },

        materials: [
          {
            id: `MAT-IMP-1`,
            partNumber: `ART-${item.assetnum}-01`,
            description: `Huvudkomponent / Reservdel för ${item.assetnum}`,
            quantity: 1,
            unit: 'st',
            inStock: true,
            shelfLocation: 'FÖRRÅD-IN',
            certificateRequired: isLvl3,
          },
        ],

        materialInspection: {
          checkedAgainstDrawing: false,
          transportUndamaged: false,
          certificatesReceived: !isLvl3,
          physicallyKittedAndTagged: false,
          shelfLocationConfirmed: false,
          shelfLocation: '',
          inspectorName: '',
          inspectionDate: '',
          notes: 'Importerad från Maximo. Invänter förrådskontroll.',
        },

        serviceInspection: {
          physicalInspectionDone: false,
          guardsRestoredLotoRevoked: false,
          housekeepingApproved: false,
          measurementProtocolsReceived: false,
          hoursAndMaterialReconciled: false,
          mediusPoNumber: `PO-${Math.floor(200000 + Math.random() * 800000)}`,
          mediusInvoiceRef: '',
          mediusApprover: 'Underhållschef',
          approvalDate: '',
          maximoStatusAfterInspection: 'VÄNTAR',
          notes: '',
        },

        maximoWorkLog: [
          {
            id: `WL-${item.wonum.replace(/[^0-9]/g, '') || '00'}-01`,
            wonum: item.wonum,
            logType: 'STATUS',
            summary: `Arbetsorder importerad från Maximo (${item.wonum})`,
            detail: `Importerad till Gate 1 Identifiering & Nivåval (${item.worktype}). Status: WAPPR -> Pågående. Beskrivning synkad.`,
            createBy: item.planner || 'Maximo Sync',
            createDate: now,
            syncedToMaximo: true,
          },
        ],

        history: [
          {
            date: now,
            user: 'Maximo REST Sync',
            action: `Direktimporterad från IBM Maximo (Wonum: ${item.wonum}) till Gate 1.`,
          },
        ],
      };

      onImportOrders([newOrder]);
      setIsSyncing(false);
      setSyncSuccess(`Arbetsorder ${item.wonum} har importerats framgångsrikt från Maximo!`);
      setTimeout(() => {
        setSyncSuccess(null);
        onClose();
      }, 1200);
    }, 400);
  };

  // Custom Maximo WONUM Search & Import
  // Custom Maximo WONUM Search & Import
  const handleCustomMaximoImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!maximoSearch.trim()) return;

    const customWonum = maximoSearch.trim().toUpperCase().startsWith('AO-')
      ? maximoSearch.trim().toUpperCase()
      : `AO-${maximoSearch.trim().toUpperCase()}`;

    const rawDesc = maximoCustomDesc.trim() || `Underhållsarbete på processposition ${customWonum}`;

    const syntheticOrder: typeof MOCK_MAXIMO_QUEUE[0] = {
      wonum: customWonum,
      rawDescription: rawDesc,
      location: 'Huvudanläggning / Processavdelning',
      assetnum: `POS-${customWonum.replace(/[^0-9]/g, '') || '101'}`,
      worktype: 'Nivå 2',
      priority: '2 - Hög',
      schedstart: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString().split('T')[0],
      planner: 'Maximo REST API',
      stopWindow: 'Kommande veckostopp',
      materialsCount: 1,
      instructions: '1. Utför beredning och verifiera LOTO.\n2. Montera och provkör.',
    };

    handleImportMaximoOrder(syntheticOrder);
  };

  // 2. EXCEL / CSV FILE UPLOAD HANDLER
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setExcelError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!json || json.length === 0) {
          setExcelError('Kalkylbladet verkar vara tomt eller saknar rader.');
          return;
        }

        setExcelPreview(json);
      } catch (err: any) {
        console.error(err);
        setExcelError('Kunde inte läsa filen. Säkerställ att det är en giltig .xlsx, .xls eller .csv fil.');
      }
    };

    reader.readAsBinaryString(file);
  };

  // Parse pasted tabular text (e.g. from Excel copy-paste)
  const handleParsePastedData = () => {
    if (!pastedData.trim()) return;
    try {
      const rows = pastedData.trim().split('\n').map(r => r.split('\t'));
      if (rows.length < 2) {
        setExcelError('Minst en rubrikrad och en datarygg behövs vid inklistring.');
        return;
      }
      const headers = rows[0].map(h => h.trim());
      const parsed = rows.slice(1).map(row => {
        const obj: any = {};
        headers.forEach((h, idx) => {
          obj[h] = row[idx] ? row[idx].trim() : '';
        });
        return obj;
      });

      setExcelPreview(parsed);
      setFileName('Inklistrat kalkylblad');
      setExcelError(null);
    } catch (err) {
      setExcelError('Kunde inte tolka den inklistrade informationen.');
    }
  };

  // Convert Excel preview rows to WorkOrders
  const handleCommitExcelImport = () => {
    if (excelPreview.length === 0) return;

    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const importedOrders: WorkOrder[] = excelPreview.map((row, idx) => {
      // Flexible column key matching
      const rawId = row['AO-nummer'] || row['WONUM'] || row['AO'] || row['Id'] || `AO-${530000 + existingCount + idx + 1}`;
      const cleanId = String(rawId).trim().toUpperCase();
      const rawTitle = row['Benämning'] || row['Beskrivning'] || row['DESCRIPTION'] || row['Titel'] || 'Importerad arbetsorder';
      const cleanTitle = String(rawTitle).trim();
      
      // Formatting requirement: Title MUST strictly be "AO-nummer - Beskrivning"
      const title = formatMaximoTitle(cleanId, cleanTitle);

      const facility = row['Anläggning'] || row['LOCATION'] || row['Plats'] || 'Huvudanläggning';
      const position = row['Position'] || row['ASSETNUM'] || row['KKS'] || `POS-${idx + 1}`;
      const rawLevel = (row['Nivå'] || row['WORKTYPE'] || row['Nivåval'] || 'Nivå 2').toString();
      
      let level: WorkOrderLevel = 'Nivå 2';
      if (rawLevel.includes('1') || rawLevel.toLowerCase().includes('löpande')) level = 'Nivå 1';
      else if (rawLevel.includes('3') || rawLevel.toLowerCase().includes('stopp')) level = 'Nivå 3';

      const planner = row['Beredare'] || row['PLANNER'] || 'Excel Importör';
      const plannedDate = row['Datum'] || row['SCHEDSTART'] || new Date().toISOString().split('T')[0];
      const stopWindow = row['Fönster'] || row['Stoppvecka'] || 'Planerat underhåll';
      const priority = (row['Prio'] || row['WOPRIORITY'] || '2 - Hög') as any;

      const isLvl3 = level === 'Nivå 3';
      const isLvl2 = level === 'Nivå 2';

      return {
        id: cleanId,
        title: title,
        facility: String(facility).trim(),
        position: String(position).trim().toUpperCase(),
        level,
        currentGate: 1,
        status: 'Pågående',
        priority,
        planner: String(planner).trim(),
        createdDate: now.split(' ')[0],
        plannedStartDate: String(plannedDate).trim(),
        stopWindow: String(stopWindow).trim(),
        gate3Approved: false,

        safety: {
          lotoRequired: isLvl2 || isLvl3,
          lotoMechanical: isLvl3,
          lotoElectrical: isLvl2 || isLvl3,
          lotoPneumaticSteam: isLvl3,
          lotoPermitId: `LOTO-${position}`,
          riskAssessmentDone: false,
          permitHotWork: isLvl3,
          permitConfinedSpace: false,
          permitWorkingAtHeight: isLvl3,
          ppeRequired: ['Skyddsskor S3', 'Hjälm & Skyddsglasögon'],
          safetyNotes: 'Importerad via Excel. Riskanalys skall granskas i Gate 2.',
        },

        resources: {
          mechanicalHours: isLvl3 ? 16 : isLvl2 ? 8 : 2,
          electricalHours: isLvl3 ? 4 : 2,
          weldingHours: isLvl3 ? 4 : 0,
          craneHours: isLvl3 ? 2 : 0,
          contractorNeeded: isLvl3,
          contractorCompany: '',
          contractorHours: 0,
          crewLeader: 'Skiftledare Mek',
          estimatedTotalHours: isLvl3 ? 26 : isLvl2 ? 10 : 2,
        },

        documentation: {
          drawingNumber: `RIT-${position}`,
          electricalDiagram: '',
          pidRef: '',
          tighteningTorqueNm: '',
          lubricationSpec: '',
          workInstructions: '1. Verifiera LOTO.\n2. Utför arbete enligt specifikation.\n3. Provkör.',
          attachedFiles: [],
        },

        materials: [
          {
            id: `MAT-EXC-${idx + 1}`,
            partNumber: `ART-${position}-01`,
            description: `Reservdel specificerad för ${position}`,
            quantity: 1,
            unit: 'st',
            inStock: true,
            shelfLocation: 'FÖRRÅD-IN',
            certificateRequired: isLvl3,
          },
        ],

        materialInspection: {
          checkedAgainstDrawing: false,
          transportUndamaged: false,
          certificatesReceived: !isLvl3,
          physicallyKittedAndTagged: false,
          shelfLocationConfirmed: false,
          shelfLocation: '',
          inspectorName: '',
          inspectionDate: '',
          notes: 'Excel-importerad post.',
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
            summary: `Arbetsorder inläst från Excel (${fileName || 'fil'})`,
            detail: `AO skapad via filimport. Titel: "${title}". Tilldelad till ${planner}.`,
            createBy: planner || 'Excel Import',
            createDate: now,
            syncedToMaximo: false,
          },
        ],

        history: [
          {
            date: now,
            user: 'Excel Import',
            action: `Skapad via Excel-import (${fileName || 'kalkylblad'}).`,
          },
        ],
      };
    });

    onImportOrders(importedOrders);
    onClose();
  };

  // Download official Excel template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'AO-nummer': 'AO-530101',
        'Benämning': 'Byte av drivrulle och lager på transportör TR-12',
        'Anläggning': 'Krosshall / Bandtransport',
        'Position': '301-TR012',
        'Nivå': 'Nivå 2',
        'Prio': '2 - Hög',
        'Datum': '2026-11-15',
        'Fönster': 'Veckostopp V.46',
        'Beredare': 'Erik Trogen'
      },
      {
        'AO-nummer': 'AO-530102',
        'Benämning': 'Flänsbyte och tätning syraledning DN80',
        'Anläggning': 'Kemikalieberedning',
        'Position': '612-V080',
        'Nivå': 'Nivå 3',
        'Prio': '1 - Akut',
        'Datum': '2026-11-20',
        'Fönster': 'Huvudstopp V.47',
        'Beredare': 'Anna Lind'
      },
      {
        'AO-nummer': 'AO-530103',
        'Benämning': 'Byte av oljefilter hydraulaggregat H-4',
        'Anläggning': 'Presslinje 1',
        'Position': 'HYD-FLT-04',
        'Nivå': 'Nivå 1',
        'Prio': '3 - Normal',
        'Datum': '2026-10-25',
        'Fönster': 'Löpande UH',
        'Beredare': 'Lars Holm'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Jobbpaket_Importmall');
    XLSX.writeFile(wb, 'Maximo_Jobbpaket_Importmall.xlsx');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                Importera Arbetsordrar
              </h2>
              <p className="text-xs text-zinc-500">
                Direktanslutning till IBM Maximo eller import från Excel / CSV
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-6 pt-3 border-b border-zinc-200 dark:border-zinc-800 flex space-x-4 bg-zinc-50/50 dark:bg-zinc-900/50">
          <button
            onClick={() => setActiveTab('maximo')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center space-x-2 transition-colors cursor-pointer ${
              activeTab === 'maximo'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Direktimport från IBM Maximo</span>
          </button>

          <button
            onClick={() => setActiveTab('excel')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center space-x-2 transition-colors cursor-pointer ${
              activeTab === 'excel'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>Importera från Excel / CSV</span>
          </button>
        </div>

        {/* Tab 1: MAXIMO DIRECT IMPORT */}
        {activeTab === 'maximo' && (
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
            {/* Status alert */}
            {syncSuccess && (
              <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center space-x-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{syncSuccess}</span>
              </div>
            )}

            {/* Format rule callout banner */}
            <div className="p-3 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/40 flex items-start space-x-2.5">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-blue-900 dark:text-blue-200 block text-xs">
                  Maximo Namnstandard: AO-nummer &amp; Beskrivning
                </span>
                <span className="text-[11px] text-blue-700 dark:text-blue-300">
                  Vid import från Maximo formateras jobbpaketets benämning automatiskt enligt regeln: <strong className="font-mono bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded text-blue-950 dark:text-blue-100">[AO-nummer] - [Beskrivning]</strong>.
                </span>
              </div>
            </div>

            {/* Quick search & custom import form */}
            <form onSubmit={handleCustomMaximoImport} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 space-y-3">
              <label className="font-bold text-zinc-900 dark:text-zinc-100 block">
                Sök eller importera specifik Maximo Arbetsorder
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                    Arbetsordernummer (WONUM):
                  </span>
                  <div className="relative">
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="t.ex. AO-604512"
                      value={maximoSearch}
                      onChange={(e) => setMaximoSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-zinc-900 dark:text-zinc-100 uppercase"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                    Beskrivning i Maximo:
                  </span>
                  <input
                    type="text"
                    placeholder="t.ex. Byte av transmissionsrem och spännare"
                    value={maximoCustomDesc}
                    onChange={(e) => setMaximoCustomDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              {maximoSearch.trim() && (
                <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[11px] flex items-center justify-between">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    Skapas i Jobbpaket som:
                  </span>
                  <span className="font-bold text-blue-700 dark:text-blue-300 font-mono">
                    {formatMaximoTitle(maximoSearch.trim().toUpperCase(), maximoCustomDesc.trim() || 'Allmän beredning')}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <p className="text-[11px] text-zinc-500">
                  Kopplad mot Maximo REST API / OSLC Integration (Objektstruktur MXWO).
                </p>
                <button
                  type="submit"
                  disabled={!maximoSearch.trim() || isSyncing}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold cursor-pointer transition-colors shadow-xs"
                >
                  {isSyncing ? 'Hämtar...' : 'Importera från Maximo'}
                </button>
              </div>
            </form>

            {/* Ready Maximo queue */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-500">
                  Väntande Maximo-ordrar redo för Jobbpaket-beredning:
                </h3>
                <span className="text-[11px] text-zinc-400">
                  Källa: Maximo REST Beredningskö
                </span>
              </div>

              <div className="space-y-3">
                {MOCK_MAXIMO_QUEUE.map((item) => {
                  const formattedTitle = formatMaximoTitle(item.wonum, item.rawDescription);
                  return (
                    <div
                      key={item.wonum}
                      className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-blue-400 dark:hover:border-blue-600 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1.5 flex-wrap gap-y-1">
                          <span className="font-mono font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                            {item.wonum}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            {item.worktype}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            Prio: {item.priority}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                            Fönster: {item.stopWindow}
                          </span>
                        </div>

                        {/* Title showing AO number + Description */}
                        <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100 mb-1">
                          <span className="text-blue-600 dark:text-blue-400 mr-1.5">Titel:</span>
                          <span className="font-mono">{formattedTitle}</span>
                        </div>

                        <div className="text-[11px] text-zinc-500 flex flex-wrap gap-x-2">
                          <span>{item.location}</span>
                          <span>•</span>
                          <span>POS: <strong className="font-mono text-zinc-700 dark:text-zinc-300">{item.assetnum}</strong></span>
                          <span>•</span>
                          <span>Planerad: {item.schedstart}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleImportMaximoOrder(item)}
                        disabled={isSyncing}
                        className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 font-bold shrink-0 transition-all cursor-pointer flex items-center space-x-1.5 shadow-xs"
                      >
                        <span>Importera till Gate 1</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: EXCEL / CSV IMPORT */}
        {activeTab === 'excel' && (
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
            {/* Download template banner */}
            <div className="p-3.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 flex items-center justify-between gap-3">
              <div>
                <span className="font-bold text-emerald-900 dark:text-emerald-100 block">
                  Officiell Excel-mall för underhållsberedning
                </span>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-300">
                  Ladda ner standardmallen med fördefinierade kolumner (AO-nummer, Benämning, Anläggning, Position, Nivå).
                </span>
              </div>
              <button
                onClick={handleDownloadTemplate}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center space-x-1.5 shrink-0 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Ladda ner Mall (.xlsx)</span>
              </button>
            </div>

            {/* File Dropzone */}
            <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-6 text-center hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                id="excel-file-input"
                className="hidden"
              />
              <label htmlFor="excel-file-input" className="cursor-pointer block">
                <FileSpreadsheet className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 block">
                  Klicka för att välja Excel-fil (.xlsx, .xls, .csv)
                </span>
                <span className="text-zinc-500 text-xs mt-1 block">
                  Eller dra och släpp filen här
                </span>
                {fileName && (
                  <span className="mt-2 inline-block px-2.5 py-1 rounded bg-zinc-200 dark:bg-zinc-800 font-mono text-zinc-800 dark:text-zinc-200 font-bold">
                    Vald fil: {fileName}
                  </span>
                )}
              </label>
            </div>

            {/* Or Paste tabular data */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">
                  Alternativt: Klistra in rader direkt från Excel
                </label>
                {pastedData && (
                  <button
                    onClick={handleParsePastedData}
                    className="text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    Tolka inklistrad data
                  </button>
                )}
              </div>
              <textarea
                rows={3}
                placeholder="Kopiera celler från Excel (inkl. rubrikrad) och klistra in här..."
                value={pastedData}
                onChange={(e) => setPastedData(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-xs"
              />
            </div>

            {/* Error Message */}
            {excelError && (
              <div className="p-3 rounded-lg bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200 font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{excelError}</span>
              </div>
            )}

            {/* Preview Table */}
            {excelPreview.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase tracking-wider text-zinc-500">
                    Förhandsgranskning ({excelPreview.length} rader identifierade):
                  </span>
                  <button
                    onClick={handleCommitExcelImport}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer shadow-sm"
                  >
                    Slutför Import ({excelPreview.length} st AO)
                  </button>
                </div>

                <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-lg max-h-48">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 sticky top-0 font-mono">
                      <tr>
                        {Object.keys(excelPreview[0] || {}).slice(0, 6).map((k) => (
                          <th key={k} className="p-2 border-b border-zinc-200 dark:border-zinc-700">{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {excelPreview.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                          {Object.values(row).slice(0, 6).map((val: any, cIdx) => (
                            <td key={cIdx} className="p-2 truncate max-w-[150px] font-mono">{String(val)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 flex items-center justify-between text-xs">
          <span className="text-zinc-500">
            Alla importerade ordrar placeras i Gate 1 för granskning och nivåval.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 font-semibold cursor-pointer"
          >
            Stäng
          </button>
        </div>
      </div>
    </div>
  );
};
