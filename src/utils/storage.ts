import { WorkOrder } from '../types.ts';
import { INITIAL_WORK_ORDERS } from '../mockData.ts';

const STORAGE_KEY = 'industrial_jobbpaket_work_orders_v1';
const THEME_KEY = 'industrial_jobbpaket_theme';

export function loadWorkOrders(): WorkOrder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveWorkOrders(INITIAL_WORK_ORDERS);
      return INITIAL_WORK_ORDERS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item: any) => ({
        ...item,
        tasks: item.tasks && item.tasks.length > 0 ? item.tasks : getDefaultTasksForOrder(item),
        maximoWorkLog: item.maximoWorkLog || (item.history || []).map((h: any, idx: number) => ({
          id: `WL-${item.id.replace(/[^0-9]/g, '') || '00'}-${idx + 1}`,
          wonum: item.id,
          logType: 'STATUS',
          summary: h.action,
          detail: h.action,
          createBy: h.user || 'Maximo Sync',
          createDate: h.date,
          syncedToMaximo: true,
        })),
      }));
    }
    return INITIAL_WORK_ORDERS;
  } catch (e) {
    console.error('Failed to load work orders from localStorage:', e);
    return INITIAL_WORK_ORDERS;
  }
}

let workOrdersChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    workOrdersChannel = new BroadcastChannel('maximo_workorders_channel');
  }
} catch {
  // ignore if unsupported
}

export function saveWorkOrders(orders: WorkOrder[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    if (workOrdersChannel) {
      workOrdersChannel.postMessage({ type: 'ORDERS_UPDATED', orders });
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('workorders-updated', { detail: orders }));
    }
  } catch (e) {
    console.error('Failed to save work orders to localStorage:', e);
  }
}

/**
 * Subscribes to work order changes across windows/tabs (localStorage & BroadcastChannel)
 */
export function subscribeToWorkOrders(callback: (orders: WorkOrder[]) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (Array.isArray(parsed)) {
          callback(parsed);
        }
      } catch (err) {
        console.error('Error parsing synced work orders:', err);
      }
    }
  };

  const handleCustom = (e: Event) => {
    const custom = e as CustomEvent<WorkOrder[]>;
    if (custom.detail && Array.isArray(custom.detail)) {
      callback(custom.detail);
    }
  };

  const handleBroadcast = (e: MessageEvent) => {
    if (e.data && e.data.type === 'ORDERS_UPDATED' && Array.isArray(e.data.orders)) {
      callback(e.data.orders);
    }
  };

  window.addEventListener('storage', handleStorage);
  window.addEventListener('workorders-updated', handleCustom);
  if (workOrdersChannel) {
    workOrdersChannel.addEventListener('message', handleBroadcast);
  }

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener('workorders-updated', handleCustom);
    if (workOrdersChannel) {
      workOrdersChannel.removeEventListener('message', handleBroadcast);
    }
  };
}

export function resetWorkOrders(): WorkOrder[] {
  try {
    localStorage.removeItem(STORAGE_KEY);
    saveWorkOrders(INITIAL_WORK_ORDERS);
    return INITIAL_WORK_ORDERS;
  } catch (e) {
    console.error('Failed to reset work orders:', e);
    return INITIAL_WORK_ORDERS;
  }
}

export function getSavedTheme(): 'dark' | 'light' {
  try {
    const theme = localStorage.getItem(THEME_KEY);
    return theme === 'light' ? 'light' : 'dark'; // default to industrial dark
  } catch {
    return 'dark';
  }
}

export function setSavedTheme(theme: 'dark' | 'light'): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (e) {
    console.error('Failed to save theme:', e);
  }
}

/**
 * Validates Gate 3 Material Inspection Hard Lock
 * Returns an array of missing requirements.
 * If length === 0, Gate 3 is satisfied!
 */
export function checkGate3Requirements(order: WorkOrder): {
  isSatisfied: boolean;
  missingItems: string[];
} {
  const missing: string[] = [];
  const mi = order.materialInspection;

  if (!mi.checkedAgainstDrawing) {
    missing.push('1. Artikel ej kontrollerad mot ritning/specifikation');
  }
  if (!mi.transportUndamaged) {
    missing.push('2. Kontroll av transportskador ej godkänd');
  }
  if (!mi.certificatesReceived) {
    missing.push('3. Obligatoriska certifikat/materialintyg saknas');
  }
  if (!mi.physicallyKittedAndTagged) {
    missing.push('4. Material ej fysiskt kittat och uppmärkt med AO-nummer');
  }
  if (!mi.shelfLocationConfirmed || !mi.shelfLocation?.trim()) {
    missing.push('5. Hyllplats/Staging-position saknas eller är ej bekräftad');
  }

  // Also check if any material item is out of stock
  const outOfStock = order.materials.filter(m => !m.inStock);
  if (outOfStock.length > 0) {
    missing.push(`6. ${outOfStock.length} st reservdelar har ej anlänt (ej i lager)`);
  }

  return {
    isSatisfied: missing.length === 0,
    missingItems: missing,
  };
}

/**
 * Validates Gate 5 Service & Contractor inspection (Medius attest)
 */
export function checkGate5Requirements(order: WorkOrder): {
  isSatisfied: boolean;
  missingItems: string[];
} {
  const missing: string[] = [];
  const si = order.serviceInspection;

  if (!si.physicalInspectionDone) {
    missing.push('Fysisk slutbesiktning ej utförd');
  }
  if (!si.guardsRestoredLotoRevoked) {
    missing.push('Skydd ej återställda eller LOTO ej formellt hävt');
  }
  if (!si.housekeepingApproved) {
    missing.push('Städning & 5S ej godkänd på arbetsplatsen');
  }
  if (!si.measurementProtocolsReceived) {
    missing.push('Mätprotokoll / provkörningsdokumentation saknas');
  }
  if (!si.hoursAndMaterialReconciled) {
    missing.push('Timmar och material ej avstämda mot inköpsorder för Medius-attest');
  }
  if (!si.mediusPoNumber?.trim()) {
    missing.push('Medius PO-nummer saknas');
  }

  return {
    isSatisfied: missing.length === 0,
    missingItems: missing,
  };
}

const TEMPLATES_STORAGE_KEY = 'industrial_jobbpaket_templates_v1';

export const INITIAL_TEMPLATES: import('../types.ts').JobTemplate[] = [
  {
    id: 'MALL-MEK-01',
    name: 'Kuggväxelbyte & Uppriktning (Veckostopp)',
    description: 'Standardmall för demontering, fundamentrengöring, montage av kuggväxel, fyllning av syntetisk växellådsolja och laseruppriktning.',
    category: 'Mekanik',
    level: 'Nivå 2',
    safety: {
      lotoRequired: true,
      lotoMechanical: true,
      lotoElectrical: true,
      lotoPneumaticSteam: false,
      lotoPermitId: 'LOTO-STD-MEK',
      riskAssessmentDone: true,
      permitHotWork: false,
      permitConfinedSpace: false,
      permitWorkingAtHeight: false,
      ppeRequired: ['Skyddsskor S3', 'Hjälm med hakrem', 'Skärskyddshandskar'],
      safetyNotes: 'Lås huvudbrytare i ställverk. Kontrollera nollenergi. Spärra rullbana/drivaxel mekaniskt mot vridning.',
    },
    resources: {
      mechanicalHours: 12,
      electricalHours: 4,
      weldingHours: 0,
      craneHours: 2,
      contractorNeeded: false,
      contractorCompany: '',
      contractorHours: 0,
      crewLeader: 'Skiftledare Mek',
      estimatedTotalHours: 18,
    },
    documentation: {
      drawingNumber: 'RIT-MEK-STD-DRV',
      electricalDiagram: 'EL-STD-MOT',
      pidRef: 'Standard P&ID',
      tighteningTorqueNm: 'Fundamentbult M20: 210 Nm. Klämnav: 85 Nm',
      lubricationSpec: 'Kugghjulsolja ISO VG 220 syntet, ca 4-6 liter',
      workInstructions: '1. Bryt och lås ställverk.\n2. Tappa ur olja till miljöfat.\n3. Demontera kopplingsskydd och mät utgångsläge.\n4. Lyft ut gammal växel med pelarkran.\n5. Rengör maskinfundament.\n6. Montera ny kuggväxel, fyll olja och utför laseruppriktning (max tolerans 0.05 mm).\n7. Montera skydd och provkör.',
      attachedFiles: ['Laseruppriktning_Protokoll.pdf'],
    },
    materials: [
      {
        id: 'TMPL-M1',
        partNumber: 'SEW-KA77-DRN',
        description: 'Vinkelkuggväxel SEW KA77 eller motsv.',
        quantity: 1,
        unit: 'st',
        inStock: true,
        shelfLocation: 'KITT-MEK-01',
        certificateRequired: false,
      },
      {
        id: 'TMPL-M2',
        partNumber: 'KPL-ROTEX-38',
        description: 'Elastisk koppling Rotex 38 / tandkrans 98 ShA',
        quantity: 1,
        unit: 'st',
        inStock: true,
        shelfLocation: 'KITT-MEK-01',
        certificateRequired: false,
      },
      {
        id: 'TMPL-M3',
        partNumber: 'OIL-VG220-5L',
        description: 'Kugghjulsolja ISO VG 220 5L dunk',
        quantity: 1,
        unit: 'dunk',
        inStock: true,
        shelfLocation: 'KITT-MEK-01',
        certificateRequired: false,
      },
    ],
    createdAt: '2026-10-01',
    createdBy: 'Underhållsingenjör',
  },
  {
    id: 'MALL-RÖR-02',
    name: 'Ventilbyte Ångledning & Tryckkärl (Stopp)',
    description: 'Omfattande jobbpaket för heta arbeten, ångtryckavlastning, grafitpackningar, momentdragning och EN 10204 3.1 materialcertifiering.',
    category: 'Ventiler/Rör',
    level: 'Nivå 3',
    safety: {
      lotoRequired: true,
      lotoMechanical: true,
      lotoElectrical: true,
      lotoPneumaticSteam: true,
      lotoPermitId: 'LOTO-STD-TRYCK',
      riskAssessmentDone: true,
      permitHotWork: true,
      permitConfinedSpace: false,
      permitWorkingAtHeight: true,
      ppeRequired: ['Hjälm med visir', 'Fallskyddssele', 'Värmehandskar', 'Gasvarnare'],
      safetyNotes: 'Ledning måste tryckavlastas och säkras med blindfläns. Nollenergi på manometrar.',
    },
    resources: {
      mechanicalHours: 16,
      electricalHours: 4,
      weldingHours: 12,
      craneHours: 6,
      contractorNeeded: true,
      contractorCompany: 'Industrirör AB',
      contractorHours: 24,
      crewLeader: 'Rörledare',
      estimatedTotalHours: 62,
    },
    documentation: {
      drawingNumber: 'RIT-TRYCK-DN150-C',
      electricalDiagram: 'EL-VALVE-ACTUATOR',
      pidRef: 'PID-STEAM-01',
      tighteningTorqueNm: '320 Nm (M24 A4-80, korsdragning i 3 steg: 100-220-320 Nm)',
      lubricationSpec: 'Molykote P-37 högtemperaturpasta för bultförband',
      workInstructions: '1. Verifiera LOTO och blindflänsning.\n2. Demontera bultförband med kättingtalg.\n3. Rengör flänsytor noggrant från gamla packningsrester.\n4. Montera ny ventil med grafitpackning.\n5. Korsdra bultar i tre steg enligt protokoll.\n6. Återställ ställdon och kalibrera gränslägen.',
      attachedFiles: ['Tryckprovningsprotokoll_Mall.pdf', 'Svetsplan_WPS.pdf'],
    },
    materials: [
      {
        id: 'TMPL-V1',
        partNumber: 'VNT-DN150-PN40',
        description: 'Styrventil DN150 PN40',
        quantity: 1,
        unit: 'st',
        inStock: true,
        shelfLocation: 'HYLLA-M08',
        certificateRequired: true,
      },
      {
        id: 'TMPL-V2',
        partNumber: 'PCK-GRAF-DN150',
        description: 'Kamprofilpackning grafit DN150 PN40',
        quantity: 2,
        unit: 'st',
        inStock: true,
        shelfLocation: 'HYLLA-M08',
        certificateRequired: true,
      },
      {
        id: 'TMPL-V3',
        partNumber: 'BLT-M24-140-A4',
        description: 'Bultset M24x140 A4-80 inkl. brickor och muttrar (16 st)',
        quantity: 1,
        unit: 'sats',
        inStock: true,
        shelfLocation: 'HYLLA-M08',
        certificateRequired: true,
      },
    ],
    createdAt: '2026-10-05',
    createdBy: 'Huvudplanerare Stopp',
  },
  {
    id: 'MALL-HYD-03',
    name: 'Pumpservice & Tätning (Löpande)',
    description: 'Kompakt jobbpaket för snabbt byte eller revision av centrifugal- eller kugghjulspump under löpande drift/kortare skiftestopp (<4h).',
    category: 'Pumpar/Hydraulik',
    level: 'Nivå 1',
    safety: {
      lotoRequired: true,
      lotoMechanical: false,
      lotoElectrical: true,
      lotoPneumaticSteam: false,
      lotoPermitId: 'LOTO-STD-PUMP',
      riskAssessmentDone: true,
      permitHotWork: false,
      permitConfinedSpace: false,
      permitWorkingAtHeight: false,
      ppeRequired: ['Skyddsglasögon', 'Nitrilhandskar', 'Skyddsskor S3'],
      safetyNotes: 'Spänningslös manöverkrets. Trycklös returledning.',
    },
    resources: {
      mechanicalHours: 2.5,
      electricalHours: 1.0,
      weldingHours: 0,
      craneHours: 0,
      contractorNeeded: false,
      contractorCompany: '',
      contractorHours: 0,
      crewLeader: 'Skiftmekaniker',
      estimatedTotalHours: 3.5,
    },
    documentation: {
      drawingNumber: 'HYD-PUMP-STD',
      electricalDiagram: 'EL-MOT-DIR',
      pidRef: 'P&ID-HYD',
      tighteningTorqueNm: 'Fästbultar: 25 Nm. Rörkopplingar: 40 Nm',
      lubricationSpec: 'Hydraulolja ISO VG 46',
      workInstructions: '1. Bryt spänning och säkra manöverkrets.\n2. Dränera pumphus.\n3. Lossa flänsar och demontera pump.\n4. Byt tätningsringar och montera ny pump.\n5. Lufta pumphus innan start.',
      attachedFiles: [],
    },
    materials: [
      {
        id: 'TMPL-P1',
        partNumber: 'PMP-REX-12CC',
        description: 'Kugghjulspump 12cc',
        quantity: 1,
        unit: 'st',
        inStock: true,
        shelfLocation: 'HYLLA-H03',
        certificateRequired: false,
      },
      {
        id: 'TMPL-P2',
        partNumber: 'TÄTN-VITON-SET',
        description: 'Packningssats Viton O-ringar',
        quantity: 1,
        unit: 'sats',
        inStock: true,
        shelfLocation: 'HYLLA-H03',
        certificateRequired: false,
      },
    ],
    createdAt: '2026-10-10',
    createdBy: 'Hydraulikspecialist',
  },
];

export function loadTemplates(): import('../types.ts').JobTemplate[] {
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (!raw) {
      saveTemplates(INITIAL_TEMPLATES);
      return INITIAL_TEMPLATES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_TEMPLATES;
  } catch (e) {
    console.error('Failed to load templates:', e);
    return INITIAL_TEMPLATES;
  }
}

export function saveTemplates(templates: import('../types.ts').JobTemplate[]): void {
  try {
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  } catch (e) {
    console.error('Failed to save templates:', e);
  }
}

/**
 * Ensures description adheres to the Maximo format requirement:
 * "[AO-nummer] - [Beskrivning]"
 * Prevents redundant duplicates if the raw description already begins with the AO number.
 */
export function formatMaximoTitle(wonum: string, rawDescription: string): string {
  const cleanWonum = (wonum || '').trim().toUpperCase();
  const cleanDesc = (rawDescription || '').trim();

  if (!cleanDesc) return cleanWonum;
  if (!cleanWonum) return cleanDesc;

  // Check if cleanDesc already begins with cleanWonum (e.g. "AO-601923 - " or "AO-601923: ")
  const regex = new RegExp(`^${cleanWonum}[\\s:-]+`, 'i');
  if (regex.test(cleanDesc)) {
    const stripped = cleanDesc.replace(regex, '').trim();
    return stripped ? `${cleanWonum} - ${stripped}` : cleanWonum;
  }

  // Also handle if description is just the wonum
  if (cleanDesc.toUpperCase() === cleanWonum) {
    return cleanWonum;
  }

  return `${cleanWonum} - ${cleanDesc}`;
}

/**
 * Adds an entry to the Maximo WORKLOG table for the specified work order.
 * Called automatically whenever a task/checkpoint is completed!
 */
export function logTaskCompletionToMaximo(
  order: WorkOrder,
  summary: string,
  logType: import('../types.ts').MaximoWorkLogEntry['logType'] = 'UPPGIFT',
  detail?: string,
  user?: string
): { updatedOrder: WorkOrder; newEntry: import('../types.ts').MaximoWorkLogEntry } {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
  const entryId = `WL-${order.id.replace(/[^0-9]/g, '') || '00'}-${Date.now().toString().slice(-4)}`;
  const currentUser = user || order.planner || 'Underhållsplanerare';

  const newEntry: import('../types.ts').MaximoWorkLogEntry = {
    id: entryId,
    wonum: order.id,
    logType,
    summary,
    detail: detail || `Uppgift slutförd och registrerad i Maximo arbetslogg vid ${now}.`,
    createBy: currentUser,
    createDate: now,
    syncedToMaximo: false, // New log entry awaiting next sync to Maximo
  };

  const updatedOrder: WorkOrder = {
    ...order,
    maximoWorkLog: [newEntry, ...(order.maximoWorkLog || [])],
    history: [
      ...order.history,
      {
        date: now,
        user: currentUser,
        action: `[Maximo WORKLOG] ${summary}`,
      },
    ],
  };

  return { updatedOrder, newEntry };
}

/**
 * Returns default Maximo operational tasks (WOACTIVITY) tailored for the work order level.
 */
export function getDefaultTasksForOrder(order: Partial<WorkOrder>): import('../types.ts').WorkOrderTask[] {
  const isLvl3 = order.level === 'Nivå 3';
  const isLvl1 = order.level === 'Nivå 1';

  if (isLvl1) {
    return [
      {
        id: 'TSK-10',
        taskNumber: 10,
        description: 'Säkerhetsbrytning & verifiering av nollenergi',
        trade: 'EL',
        estimatedHours: 0.5,
        completed: false,
      },
      {
        id: 'TSK-20',
        taskNumber: 20,
        description: 'Demontering av slitdel / defekt komponent',
        trade: 'MEK',
        estimatedHours: 1.5,
        completed: false,
      },
      {
        id: 'TSK-30',
        taskNumber: 30,
        description: 'Montering av ny reservdel och funktionsprov',
        trade: 'MEK',
        estimatedHours: 1.5,
        completed: false,
      },
      {
        id: 'TSK-40',
        taskNumber: 40,
        description: '5S-städning, provkörning och återlämning till drift',
        trade: 'ALLM',
        estimatedHours: 0.5,
        completed: false,
      },
    ];
  }

  return [
    {
      id: 'TSK-10',
      taskNumber: 10,
      description: 'LOTO-säkring: Bryt & lås ställverk/ventiler samt varningsskyltning',
      trade: 'EL',
      estimatedHours: isLvl3 ? 2 : 1,
      completed: false,
    },
    {
      id: 'TSK-20',
      taskNumber: 20,
      description: 'Riggning, säkring av lyftväg och demontering av defekt utrustning',
      trade: 'MEK',
      estimatedHours: isLvl3 ? 6 : 3,
      completed: false,
    },
    {
      id: 'TSK-30',
      taskNumber: 30,
      description: 'Rengöring, kontrollmätning av tätningsytor/axeltappar och toleranskontroll',
      trade: 'MEK',
      estimatedHours: isLvl3 ? 4 : 2,
      completed: false,
    },
    {
      id: 'TSK-40',
      taskNumber: 40,
      description: 'Montage av ny komponent & kontrollerad momentdragning enligt teknisk specifikation',
      trade: 'MEK',
      estimatedHours: isLvl3 ? 6 : 4,
      completed: false,
    },
    {
      id: 'TSK-50',
      taskNumber: 50,
      description: 'Laseruppriktning, spänningssättning och provkörning med mätvärden',
      trade: 'AUTO',
      estimatedHours: isLvl3 ? 4 : 2,
      completed: false,
    },
    {
      id: 'TSK-60',
      taskNumber: 60,
      description: 'Slutkontroll, 5S-städning, formell hävning av LOTO och driftöverlämning',
      trade: 'ALLM',
      estimatedHours: 1,
      completed: false,
    },
  ];
}

