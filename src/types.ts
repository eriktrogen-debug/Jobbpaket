/**
 * Types for Industrial Jobbpaket & Leveranskontroll (Maximo / Medius)
 */

export type WorkOrderLevel = 'Nivå 1' | 'Nivå 2' | 'Nivå 3';
// Nivå 1: Löpande (<4h)
// Nivå 2: Veckounderhåll
// Nivå 3: Stopp / Större Projekt

export type GateNumber = 1 | 2 | 3 | 4 | 5;

export type GateStatus = 'Klar' | 'Pågående' | 'Blockerad';

export interface GateInfo {
  number: GateNumber;
  title: string;
  subtitle: string;
  shortDesc: string;
}

export const GATES_DEFINITION: GateInfo[] = [
  {
    number: 1,
    title: 'Gate 1: Identifiering & Nivåval',
    subtitle: 'AO-upplägg & Granskning',
    shortDesc: 'Val av arbetssätt (Nivå 1-3) och grundläggande prioritering.',
  },
  {
    number: 2,
    title: 'Gate 2: Beredning (Jobbpaket)',
    subtitle: 'Säkerhet, Resurser & Ritningar',
    shortDesc: 'Beredning av LOTO, mekanik/el/svets/kran och dokumentation.',
  },
  {
    number: 3,
    title: 'Gate 3: Leveranskontroll Material',
    subtitle: 'SPÄRR: Kittning & Materialverifiering',
    shortDesc: 'Hård spärr. Kan ej schemaläggas förrän alla materialkrav är uppfyllda.',
  },
  {
    number: 4,
    title: 'Gate 4: Utförande',
    subtitle: 'Fältarbete & Installation',
    shortDesc: 'Genomförande på anläggningen, LOTO applicerat och montage.',
  },
  {
    number: 5,
    title: 'Gate 5: Slutbesiktning & Ekonomi',
    subtitle: 'Maximo & Medius-attest',
    shortDesc: 'Slutbesiktning, 5S, hävning av LOTO och ekonomisk attest i Medius.',
  },
];

export interface MaterialItem {
  id: string;
  partNumber: string;
  description: string;
  quantity: number;
  unit: string;
  inStock: boolean;
  shelfLocation: string;
  drawingRef?: string;
  certificateRequired: boolean;
}

export interface SafetyChecklist {
  lotoRequired: boolean;
  lotoMechanical: boolean;
  lotoElectrical: boolean;
  lotoPneumaticSteam: boolean;
  lotoPermitId: string;
  riskAssessmentDone: boolean;
  permitHotWork: boolean;
  permitConfinedSpace: boolean;
  permitWorkingAtHeight: boolean;
  ppeRequired: string[]; // e.g. ["Hjälm & Visir", "Fallskyddsselen", "Kemhandskar"]
  safetyNotes: string;
}

export interface ResourcePlan {
  mechanicalHours: number;
  electricalHours: number;
  weldingHours: number;
  craneHours: number;
  contractorNeeded: boolean;
  contractorCompany: string;
  contractorHours: number;
  crewLeader: string;
  estimatedTotalHours: number;
}

export interface TechnicalDocumentation {
  drawingNumber: string;
  electricalDiagram: string;
  pidRef: string;
  tighteningTorqueNm: string;
  lubricationSpec: string;
  workInstructions: string;
  attachedFiles: string[];
}

export interface MaterialInspection {
  // Flik A: Material & Kittning (Innan jobbstart)
  checkedAgainstDrawing: boolean;      // 1. Artikel kontrollerad mot ritning
  transportUndamaged: boolean;         // 2. Transportskadefri
  certificatesReceived: boolean;       // 3. Certifikat mottagna (t.ex. 3.1-intyg)
  physicallyKittedAndTagged: boolean;  // 4. Fysiskt kittad och märkt med AO-nummer
  shelfLocationConfirmed: boolean;     // 5. Hyllplats angiven och bekräftad
  shelfLocation: string;               // t.ex. "KITT-B14-02"
  inspectorName: string;               // Förrådstekniker / Mottagningskontroll
  inspectionDate: string;              // YYYY-MM-DD
  notes: string;
}

export interface ServiceInspection {
  // Flik B: Entreprenörs- & Tjänstekontroll (Efter utfört jobb)
  physicalInspectionDone: boolean;         // 1. Fysisk besiktning utförd
  guardsRestoredLotoRevoked: boolean;      // 2. Skydd återställda / LOTO formellt hävt
  housekeepingApproved: boolean;           // 3. Städning & 5S godkänd
  measurementProtocolsReceived: boolean;   // 4. Mätprotokoll / provkörningsdokumentation mottagen
  hoursAndMaterialReconciled: boolean;     // 5. Timmar/material avstämda för attest i Medius
  mediusPoNumber: string;                  // Inköpsorder (PO)
  mediusInvoiceRef: string;                // Fakturanummer / Fakturareferens
  mediusApprover: string;                  // Attestant (Underhållsledare / Avdelningschef)
  approvalDate: string;                    // Datum för attest
  maximoStatusAfterInspection: 'TECO' | 'AVSL' | 'PÅG' | 'VÄNTAR'; // Teknisk status i Maximo
  notes: string;
}

export interface WorkOrder {
  id: string; // e.g. "AO-512088"
  title: string; // e.g. "Ventilbyte ångledning DN150 vid underhållsstopp"
  facility: string; // e.g. "Kraftvärmeverk Panna 4"
  position: string; // e.g. "421-V012"
  level: WorkOrderLevel;
  currentGate: GateNumber;
  status: GateStatus; // Grön = Klar, Gul = Pågående, Röd = Blockerad/Saknas
  priority: '1 - Akut' | '2 - Hög' | '3 - Normal' | '4 - Låg';
  planner: string; // Beredare
  createdDate: string;
  plannedStartDate: string;
  stopWindow?: string; // t.ex. "Stoppvecka 44" eller "Vecka 42 Skift C"
  
  // Modul 2: Jobbpaket sektioner
  safety: SafetyChecklist;
  resources: ResourcePlan;
  documentation: TechnicalDocumentation;
  materials: MaterialItem[];

  // Modul 3: Leveranskontroll (Två flikar)
  materialInspection: MaterialInspection;
  serviceInspection: ServiceInspection;

  // Gate 3 Approval state
  gate3Approved: boolean;
  gate3ApprovedBy?: string;
  gate3ApprovedDate?: string;

  // Maximo sync metadata
  lastMaximoSync?: {
    date: string;
    status: string; // e.g. "WAPPR", "BEDÖM", "SCHED", "INPRG", "TECO"
    transactionId: string;
  };

  // Maximo Arbetsuppgifter (WOACTIVITY / Tasks)
  tasks?: WorkOrderTask[];

  // Maximo Arbetslogg (WORKLOG) - skrivs varje gång en uppgift blir klar
  maximoWorkLog?: MaximoWorkLogEntry[];

  // History & audit log
  history: {
    date: string;
    user: string;
    action: string;
  }[];
}

export interface WorkOrderTask {
  id: string; // e.g. "TSK-10"
  taskNumber: number; // e.g. 10, 20, 30
  description: string;
  trade: 'MEK' | 'EL' | 'SVETS' | 'KRAN' | 'AUTO' | 'ALLM';
  estimatedHours: number;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
}

export interface MaximoWorkLogEntry {
  id: string; // e.g. "WL-1001"
  wonum: string; // e.g. "AO-512088"
  logType: 'UPPGIFT' | 'STATUS' | 'LEVERANS' | 'MATERIAL' | 'SÄKERHET' | 'INSPEKTION' | 'MEDIUS' | 'NOTERING';
  summary: string; // Kort rubrik för Maximo worklog summary
  detail?: string; // Utförligare beskrivning
  createBy: string; // Användare / Beredare
  createDate: string; // Tidsstämpel "YYYY-MM-DD HH:mm"
  syncedToMaximo?: boolean; // Indikerar om posten synkats till Maximo server
}

export interface JobTemplate {
  id: string; // e.g. "MALL-001"
  name: string; // e.g. "Kuggväxelbyte SEW KA-serie"
  description: string;
  category: 'Mekanik' | 'Ventiler/Rör' | 'Pumpar/Hydraulik' | 'El & Instrument' | 'Allmänt';
  level: WorkOrderLevel;
  safety: SafetyChecklist;
  resources: ResourcePlan;
  documentation: TechnicalDocumentation;
  materials: MaterialItem[];
  createdAt: string;
  createdBy: string;
}

