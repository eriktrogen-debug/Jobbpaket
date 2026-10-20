import React from 'react';
import { 
  Printer, 
  ArrowLeft, 
  ShieldAlert, 
  CheckSquare, 
  Square, 
  Wrench, 
  AlertTriangle,
  FileCheck2,
  Lock,
  Building
} from 'lucide-react';
import { WorkOrder } from '../types.ts';

interface PrintViewProps {
  order?: WorkOrder | null;
  orders?: WorkOrder[];
  onClose: () => void;
}

export const PrintView: React.FC<PrintViewProps> = ({ order, orders, onClose }) => {
  const printList: WorkOrder[] = orders && orders.length > 0 ? orders : order ? [order] : [];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 p-4 sm:p-8">
      {/* Floating Control Bar for screen view (hidden when printing) */}
      <div className="no-print max-w-4xl mx-auto mb-6 p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md flex items-center justify-between">
        <button
          onClick={onClose}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Tillbaka till appen</span>
        </button>

        <div className="text-xs text-zinc-500 text-center hidden sm:block">
          Utskriftsanpassad vy för <strong>Stoppärm</strong> och <strong>Fältmontage</strong> (A4)
          {printList.length > 1 && ` • ${printList.length} st arbetsordrar`}
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Skriv ut ({printList.length} st) / PDF</span>
        </button>
      </div>

      {printList.map((currentOrder, oIdx) => (
        <div 
          key={currentOrder.id}
          className={`max-w-4xl mx-auto bg-white text-zinc-900 p-8 sm:p-10 border border-zinc-300 shadow-xl rounded-none print-card font-sans mb-10 ${
            oIdx < printList.length - 1 ? 'page-break-after' : ''
          }`}
        >
          {/* Document Header */}
          <div className="border-b-2 border-zinc-900 pb-4 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-mono font-bold tracking-widest text-zinc-600 uppercase">
                  Underhållsavdelningen • Maximo EAM & Medius Flöde
                </div>
                <h1 className="text-2xl font-black uppercase tracking-tight text-zinc-950 mt-1">
                  Jobbpaket & Leveranskontroll
                </h1>
                <div className="text-sm font-bold text-zinc-800 mt-1">
                  {currentOrder.title}
                </div>
              </div>

              <div className="text-right">
                <div className="inline-block border-2 border-zinc-900 px-3 py-1 bg-zinc-100 font-mono text-xl font-black">
                  {currentOrder.id}
                </div>
                <div className="text-[10px] font-mono text-zinc-500 mt-1">
                  KITTPLATS: <span className="font-bold text-zinc-900">{currentOrder.materialInspection.shelfLocation || 'FÖRRÅD'}</span>
                </div>
              </div>
            </div>

            {/* Metadata bar */}
            <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-zinc-300 text-xs">
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase font-bold">Anläggning / Del</span>
                <span className="font-bold">{currentOrder.facility}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase font-bold">Position (KKS)</span>
                <span className="font-mono font-bold">{currentOrder.position}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase font-bold">Arbetssätt</span>
                <span className="font-bold bg-zinc-200 px-1.5 py-0.5 rounded text-[11px]">{currentOrder.level}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase font-bold">Planerat Fönster</span>
                <span className="font-bold">{currentOrder.stopWindow || 'Löpande'}</span>
              </div>
            </div>
          </div>

          {/* SECTION 1: SÄKERHET, LOTO & ARBETSTILLSTÅND */}
          <div className="border-2 border-zinc-900 rounded p-4 mb-5 bg-zinc-50">
            <div className="flex items-center justify-between border-b border-zinc-300 pb-2 mb-3">
              <h2 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-zinc-900">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                <span>Säkerhet, LOTO & Tillstånd (Obligatorisk genomgång före start)</span>
              </h2>
              <span className="font-mono text-xs font-bold bg-zinc-200 px-2 py-0.5 border border-zinc-400">
                Tillstånd: {currentOrder.safety.lotoPermitId || 'STANDARD'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-3">
              <div className="flex items-center space-x-1.5">
                {currentOrder.safety.lotoRequired ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-zinc-400" />}
                <span className="font-semibold">LOTO Erfordras</span>
              </div>
              <div className="flex items-center space-x-1.5">
                {currentOrder.safety.riskAssessmentDone ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-zinc-400" />}
                <span className="font-semibold">Riskanalys Genomförd</span>
              </div>
              <div className="flex items-center space-x-1.5">
                {currentOrder.safety.permitHotWork ? <CheckSquare className="w-4 h-4 text-amber-700" /> : <Square className="w-4 h-4 text-zinc-400" />}
                <span className={currentOrder.safety.permitHotWork ? 'font-bold text-amber-900' : ''}>Heta Arbeten</span>
              </div>
              <div className="flex items-center space-x-1.5">
                {currentOrder.safety.permitConfinedSpace ? <CheckSquare className="w-4 h-4 text-red-700" /> : <Square className="w-4 h-4 text-zinc-400" />}
                <span className={currentOrder.safety.permitConfinedSpace ? 'font-bold text-red-900' : ''}>Slutet Rum</span>
              </div>
            </div>

            {currentOrder.safety.safetyNotes && (
              <div className="text-xs bg-white p-2 rounded border border-zinc-300 font-mono">
                <strong className="text-red-700">OBS Säkerhetsanvisning: </strong>
                {currentOrder.safety.safetyNotes}
              </div>
            )}
          </div>

          {/* SECTION 2: TEKNISKA DATA & INSTRUKTIONER */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5 text-xs">
            <div className="border border-zinc-300 p-3 rounded">
              <span className="text-[10px] text-zinc-500 font-bold block uppercase">Ritningsnummer</span>
              <span className="font-mono font-bold text-sm">{currentOrder.documentation.drawingNumber || 'Enligt anläggningspärm'}</span>
            </div>
            <div className="border border-zinc-300 p-3 rounded">
              <span className="text-[10px] text-zinc-500 font-bold block uppercase">Åtdragningsmoment</span>
              <span className="font-mono font-bold text-sm text-zinc-950">{currentOrder.documentation.tighteningTorqueNm || 'Enligt standard'}</span>
            </div>
            <div className="border border-zinc-300 p-3 rounded">
              <span className="text-[10px] text-zinc-500 font-bold block uppercase">Smörjmedel / Kem</span>
              <span className="font-mono font-bold text-sm">{currentOrder.documentation.lubricationSpec || 'Standard smörjfett'}</span>
            </div>

            <div className="sm:col-span-3 border border-zinc-300 p-3 rounded bg-zinc-50">
              <span className="text-[10px] text-zinc-500 font-bold block uppercase mb-1">Arbetsinstruktion</span>
              <p className="text-xs leading-relaxed whitespace-pre-line text-zinc-800">
                {currentOrder.documentation.workInstructions || 'Demontera, rengör anliggningsytor, montera ny komponent, momentdra och provkör.'}
              </p>
            </div>
          </div>

          {/* SECTION 3: KITTAT MATERIAL & RESERVDELAR */}
          <div className="mb-6">
            <h2 className="text-xs font-black uppercase tracking-wider text-zinc-900 border-b border-zinc-900 pb-1 mb-2">
              Material- & Reservdelslista (Kittat för AO-{currentOrder.id.replace('AO-', '')})
            </h2>

            <table className="w-full text-xs text-left border border-zinc-300">
              <thead className="bg-zinc-100 font-mono text-[10px] uppercase border-b border-zinc-300">
                <tr>
                  <th className="p-1.5 border-r border-zinc-300">Artikelnr</th>
                  <th className="p-1.5 border-r border-zinc-300">Benämning</th>
                  <th className="p-1.5 border-r border-zinc-300 text-center">Antal</th>
                  <th className="p-1.5 border-r border-zinc-300">Hyllplats / Staging</th>
                  <th className="p-1.5 text-center">Montörskontroll</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {currentOrder.materials.map((mat) => (
                  <tr key={mat.id}>
                    <td className="p-1.5 font-mono font-bold border-r border-zinc-200">{mat.partNumber}</td>
                    <td className="p-1.5 border-r border-zinc-200">{mat.description}</td>
                    <td className="p-1.5 font-mono text-center border-r border-zinc-200">{mat.quantity} {mat.unit}</td>
                    <td className="p-1.5 font-mono border-r border-zinc-200">{mat.shelfLocation}</td>
                    <td className="p-1.5 text-center">
                      <span className="inline-block w-4 h-4 border border-zinc-400"></span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* SECTION 3B: ARBETSUPPGIFTER & MOMENT (MAXIMO TASKS) */}
          {(currentOrder.tasks && currentOrder.tasks.length > 0) && (
            <div className="border border-zinc-300 rounded p-4 mb-5 text-xs">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-2 mb-3">
                <h3 className="font-bold uppercase tracking-wider text-zinc-900">
                  Arbetsuppgifter i fält (Maximo WOACTIVITY / Tasks)
                </h3>
                <span className="text-[10px] text-zinc-500 font-mono">Kvitteras vid utförande</span>
              </div>
              <div className="space-y-2">
                {currentOrder.tasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between border-b border-zinc-100 pb-1.5 text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="inline-block w-4 h-4 border border-zinc-400 text-center font-bold text-[10px] leading-4">
                        {task.completed ? '✓' : ''}
                      </span>
                      <span className="font-mono font-bold text-zinc-700">Task {task.taskNumber}</span>
                      <span className="font-mono text-[10px] px-1 bg-zinc-100 border border-zinc-300 rounded">{task.trade}</span>
                      <span className="text-zinc-800">{task.description}</span>
                    </div>
                    <div className="text-[11px] text-zinc-500 font-mono">
                      {task.completed ? `Klar (${task.completedBy || 'Mek'})` : `${task.estimatedHours}h`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 3C: MAXIMO ARBETSLOGG (WORKLOG) */}
          {(currentOrder.maximoWorkLog && currentOrder.maximoWorkLog.length > 0) && (
            <div className="border border-zinc-300 rounded p-4 mb-5 text-xs bg-zinc-50/50">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-2 mb-2">
                <h3 className="font-bold uppercase tracking-wider text-zinc-900">
                  IBM Maximo Arbetslogg (Registrerade händelser ur WORKLOG)
                </h3>
                <span className="text-[10px] font-mono text-zinc-500">
                  {currentOrder.maximoWorkLog.length} poster loggade
                </span>
              </div>
              <div className="space-y-1.5 text-[11px] font-mono">
                {currentOrder.maximoWorkLog.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-start justify-between border-b border-zinc-200/60 pb-1">
                    <div>
                      <span className="font-bold text-zinc-800">[{log.logType}]</span>{' '}
                      <span className="text-zinc-900">{log.summary}</span>
                    </div>
                    <div className="text-[10px] text-zinc-500 shrink-0 ml-2">
                      {log.createDate} • {log.createBy}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PAGE BREAK FOR CONTROL SHEETS */}
          <div className="page-break-after"></div>

          {/* SECTION 4: KONTROLLBLAD FLIK A - MOTTAGNINGSKONTROLL & KITTNING */}
          <div className="border-2 border-zinc-800 rounded p-4 mb-5">
            <div className="flex items-center justify-between border-b border-zinc-300 pb-2 mb-3">
              <h2 className="text-xs font-black uppercase tracking-wider text-zinc-900">
                KONTROLLBLAD A: Leveranskontroll Material & Förråd (Innan jobbstart)
              </h2>
              <span className="text-xs font-mono font-bold">
                Status: {currentOrder.gate3Approved ? 'GATE 3 GODKÄND' : 'SPÄRRAD / EJ KLAR'}
              </span>
            </div>

            <div className="space-y-1.5 text-xs mb-4">
              <div className="flex items-center space-x-2">
                {currentOrder.materialInspection.checkedAgainstDrawing ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                <span>1. Artikel kontrollerad mot ritning och teknisk specifikation</span>
              </div>
              <div className="flex items-center space-x-2">
                {currentOrder.materialInspection.transportUndamaged ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                <span>2. Okulärbesiktning utförd: Transportskadefri</span>
              </div>
              <div className="flex items-center space-x-2">
                {currentOrder.materialInspection.certificatesReceived ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                <span>3. Obligatoriska certifikat & provningsintyg (3.1/CE) mottagna</span>
              </div>
              <div className="flex items-center space-x-2">
                {currentOrder.materialInspection.physicallyKittedAndTagged ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                <span>4. Fysiskt kittad och uppmärkt med AO-nummer ({currentOrder.id})</span>
              </div>
              <div className="flex items-center space-x-2">
                {currentOrder.materialInspection.shelfLocationConfirmed ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                <span>5. Hyllplats i förråd/staging-area verifierad ({currentOrder.materialInspection.shelfLocation || '______'})</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-3 border-t border-zinc-300 text-xs">
              <div>
                <span className="text-[10px] text-zinc-500 uppercase font-bold block">Kontrollerad av (Förråd):</span>
                <div className="h-6 border-b border-zinc-400 font-semibold pt-1">
                  {currentOrder.materialInspection.inspectorName || '____________________'}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase font-bold block">Signatur:</span>
                <div className="h-6 border-b border-zinc-400"></div>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase font-bold block">Datum:</span>
                <div className="h-6 border-b border-zinc-400 font-mono pt-1">
                  {currentOrder.materialInspection.inspectionDate || '____________'}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 5: KONTROLLBLAD FLIK B - SLUTBESIKTNING & MEDIUS-ATTEST */}
          <div className="border-2 border-zinc-800 rounded p-4 mb-6">
            <div className="flex items-center justify-between border-b border-zinc-300 pb-2 mb-3">
              <h2 className="text-xs font-black uppercase tracking-wider text-zinc-900">
                KONTROLLBLAD B: Slutbesiktning & Medius-attest (Efter utfört jobb)
              </h2>
              <span className="text-xs font-mono font-bold">
                Medius PO: {currentOrder.serviceInspection.mediusPoNumber || '______'}
              </span>
            </div>

            <div className="space-y-1.5 text-xs mb-4">
              <div className="flex items-center space-x-2">
                {currentOrder.serviceInspection.physicalInspectionDone ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                <span>1. Fysisk besiktning utförd & montage godkänt</span>
              </div>
              <div className="flex items-center space-x-2">
                {currentOrder.serviceInspection.guardsRestoredLotoRevoked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                <span>2. Skydd återställda och LOTO formellt hävt</span>
              </div>
              <div className="flex items-center space-x-2">
                {currentOrder.serviceInspection.housekeepingApproved ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                <span>3. Städning & 5S godkänd på anläggningsplatsen</span>
              </div>
              <div className="flex items-center space-x-2">
                {currentOrder.serviceInspection.measurementProtocolsReceived ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                <span>4. Mätprotokoll (laser/vibration/tryck) mottagna och arkiverade</span>
              </div>
              <div className="flex items-center space-x-2">
                {currentOrder.serviceInspection.hoursAndMaterialReconciled ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                <span>5. Timmar och material avstämda för attest i Medius</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-3 border-t border-zinc-300 text-xs">
              <div>
                <span className="text-[10px] text-zinc-500 uppercase font-bold block">Besiktningsman / UH-ledare:</span>
                <div className="h-6 border-b border-zinc-400 font-semibold pt-1">
                  {currentOrder.serviceInspection.mediusApprover || '____________________'}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase font-bold block">Signatur (Medius attest):</span>
                <div className="h-6 border-b border-zinc-400"></div>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase font-bold block">Maximo Status:</span>
                <div className="h-6 border-b border-zinc-400 font-mono font-bold pt-1">
                  {currentOrder.serviceInspection.maximoStatusAfterInspection || 'TECO'}
                </div>
              </div>
            </div>
          </div>

          {/* Document Footer */}
          <div className="border-t border-zinc-300 pt-3 text-[10px] text-zinc-500 font-mono flex items-center justify-between">
            <span>Industriellt Underhållsstyrsystem • Version 2026.4</span>
            <span>AO-ID: {currentOrder.id} • Utskriven: {new Date().toISOString().slice(0, 10)}</span>
          </div>
        </div>
      ))}
    </div>
  );
};
