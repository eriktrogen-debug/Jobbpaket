import React from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Receipt, 
  ShieldCheck, 
  Sparkles, 
  Building2, 
  Clock, 
  FileCheck,
  CheckCheck
} from 'lucide-react';
import { WorkOrder, ServiceInspection } from '../types.ts';
import { checkGate5Requirements, logTaskCompletionToMaximo } from '../utils/storage.ts';

interface ServiceInspectionTabProps {
  order: WorkOrder;
  onChange: (updatedOrder: WorkOrder) => void;
}

export const ServiceInspectionTab: React.FC<ServiceInspectionTabProps> = ({
  order,
  onChange,
}) => {
  const si = order.serviceInspection;
  const validation = checkGate5Requirements(order);

  const updateSi = (fields: Partial<ServiceInspection>) => {
    const updatedSi = { ...si, ...fields };
    let baseOrder: WorkOrder = {
      ...order,
      serviceInspection: updatedSi,
    };

    const approver = updatedSi.mediusApprover || 'Underhållsledare';

    // Requirement: Every time a task becomes completed, write to Maximo WORKLOG!
    if (fields.physicalInspectionDone === true && !si.physicalInspectionDone) {
      baseOrder = logTaskCompletionToMaximo(
        baseOrder,
        'Uppgift klar: Fysisk besiktning utförd & godkänd utan anmärkning',
        'INSPEKTION',
        'Montage, mekanisk montering och funktion verifierade på plats.',
        approver
      ).updatedOrder;
    }

    if (fields.guardsRestoredLotoRevoked === true && !si.guardsRestoredLotoRevoked) {
      baseOrder = logTaskCompletionToMaximo(
        baseOrder,
        'Uppgift klar: Alla skydd återställda och LOTO formellt hävd',
        'SÄKERHET',
        `Skyddsplåtar återmonterade, LOTO-brytning kvitterad och energitillförsel återställd.`,
        approver
      ).updatedOrder;
    }

    if (fields.housekeepingApproved === true && !si.housekeepingApproved) {
      baseOrder = logTaskCompletionToMaximo(
        baseOrder,
        'Uppgift klar: Städning och 5S-kontroll godkänd',
        'INSPEKTION',
        'Spill, verktyg och restmaterial bortforslade från maskinplats.',
        approver
      ).updatedOrder;
    }

    if (fields.measurementProtocolsReceived === true && !si.measurementProtocolsReceived) {
      baseOrder = logTaskCompletionToMaximo(
        baseOrder,
        'Uppgift klar: Mätprotokoll, provkörning & dokumentation mottagna',
        'INSPEKTION',
        'Protokoll för uppriktning/vibration/provtryckning arkiverade i ärendet.',
        approver
      ).updatedOrder;
    }

    if (fields.hoursAndMaterialReconciled === true && !si.hoursAndMaterialReconciled) {
      baseOrder = logTaskCompletionToMaximo(
        baseOrder,
        `Uppgift klar: Timmar och material avstämda för Medius-attest (${updatedSi.mediusPoNumber || 'PO'})`,
        'MEDIUS',
        `Entreprenörtidssedlar och materialuttag avstämda mot inköpsorder ${updatedSi.mediusPoNumber || 'PO'} för attest i Medius.`,
        approver
      ).updatedOrder;
    }

    onChange(baseOrder);
  };

  const handleCompleteGate5 = () => {
    if (!validation.isSatisfied) return;

    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const approver = si.mediusApprover || 'Underhållsledare';

    let updatedOrder: WorkOrder = {
      ...order,
      currentGate: 5,
      status: 'Klar',
      serviceInspection: {
        ...si,
        approvalDate: now.split(' ')[0],
        maximoStatusAfterInspection: 'TECO',
      },
      history: [
        ...order.history,
        {
          date: now,
          user: approver,
          action: `Gate 5 slutförd: Slutbesiktning godkänd, Medius PO ${si.mediusPoNumber} attesterad och Maximo-status satt till TECO.`,
        },
      ],
    };

    // Log completion to Maximo WORKLOG
    updatedOrder = logTaskCompletionToMaximo(
      updatedOrder,
      'Gate 5 Fullföljd: Slutbesiktning & Medius-attest klar - Maximo TECO',
      'STATUS',
      `Slutbesiktning godkänd av ${approver}. Inköpsorder ${si.mediusPoNumber} attesterad för betalning i Medius. Teknisk status i Maximo satt till TECO (Slutförd).`,
      approver
    ).updatedOrder;

    onChange(updatedOrder);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-gradient-to-r from-blue-50/60 to-indigo-50/40 dark:from-zinc-900 dark:to-zinc-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3">
          <div className="p-2.5 rounded-lg bg-indigo-600 text-white shrink-0 shadow-sm">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="font-bold text-sm tracking-wide uppercase text-zinc-900 dark:text-zinc-100">
                Gate 5: Slutbesiktning & Ekonomi (Maximo / Medius)
              </h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                MEDIUS ATTESTFLÖDE
              </span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Efter utfört underhåll ska fysisk kontroll genomföras, säkerhet återställas och fakturaunderlag stämmas av innan teknisk klarmarkering i Maximo.
            </p>
          </div>
        </div>

        {/* Complete button */}
        <div className="shrink-0 w-full md:w-auto">
          <button
            onClick={handleCompleteGate5}
            disabled={!validation.isSatisfied}
            className={`w-full md:w-auto px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer ${
              validation.isSatisfied
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer ring-2 ring-emerald-500/30'
                : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
            }`}
          >
            <CheckCheck className="w-4 h-4" />
            <span>Godkänn & Attestera i Medius</span>
          </button>
        </div>
      </div>

      {/* 5 Service Inspection Checkpoints */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Slutbesiktning & Fältavstämning (Efter utfört jobb)</span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Måste godkännas av anläggningsansvarig eller underhållsledare innan driftstart och attest.
            </p>
          </div>
        </div>

        <div className="space-y-3.5">
          {/* Checkpoint 1 */}
          <label className="flex items-start space-x-3.5 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer select-none">
            <input
              type="checkbox"
              checked={si.physicalInspectionDone}
              onChange={(e) => updateSi({ physicalInspectionDone: e.target.checked })}
              className="mt-1 w-4 h-4 rounded text-blue-600 border-zinc-300 dark:border-zinc-700 focus:ring-blue-500"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  1. Fysisk besiktning utförd & godkänd
                </span>
                {si.physicalInspectionDone ? (
                  <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Godkänd
                  </span>
                ) : (
                  <span className="text-xs font-mono text-zinc-400 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Ej utförd
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Okulär kontroll av montage, bultförband, flänsar, packningar och provkörning utan onormala vibrationer eller läckage.
              </p>
            </div>
          </label>

          {/* Checkpoint 2 */}
          <label className="flex items-start space-x-3.5 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer select-none">
            <input
              type="checkbox"
              checked={si.guardsRestoredLotoRevoked}
              onChange={(e) => updateSi({ guardsRestoredLotoRevoked: e.target.checked })}
              className="mt-1 w-4 h-4 rounded text-blue-600 border-zinc-300 dark:border-zinc-700 focus:ring-blue-500"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  2. Skydd återställda & LOTO formellt hävt
                </span>
                {si.guardsRestoredLotoRevoked ? (
                  <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Hävt & Säkert
                  </span>
                ) : (
                  <span className="text-xs font-mono text-zinc-400 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Ej hävt
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Kopplingsskydd, galler och kåpor monterade. Hänglås och brytskydd borttagna. Spänning återställd i ställverk.
              </p>
            </div>
          </label>

          {/* Checkpoint 3 */}
          <label className="flex items-start space-x-3.5 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer select-none">
            <input
              type="checkbox"
              checked={si.housekeepingApproved}
              onChange={(e) => updateSi({ housekeepingApproved: e.target.checked })}
              className="mt-1 w-4 h-4 rounded text-blue-600 border-zinc-300 dark:border-zinc-700 focus:ring-blue-500"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  3. Städning & 5S godkänd på arbetsplats
                </span>
                {si.housekeepingApproved ? (
                  <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 5S Godkänd
                  </span>
                ) : (
                  <span className="text-xs font-mono text-zinc-400 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Ej godkänd
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Gamla utbytta komponenter skrotade/returnerade till förråd, spill upptorkat, verktyg och byggställning bortforslade.
              </p>
            </div>
          </label>

          {/* Checkpoint 4 */}
          <label className="flex items-start space-x-3.5 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer select-none">
            <input
              type="checkbox"
              checked={si.measurementProtocolsReceived}
              onChange={(e) => updateSi({ measurementProtocolsReceived: e.target.checked })}
              className="mt-1 w-4 h-4 rounded text-blue-600 border-zinc-300 dark:border-zinc-700 focus:ring-blue-500"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  4. Mätprotokoll & teknisk dokumentation mottagen
                </span>
                {si.measurementProtocolsReceived ? (
                  <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Mottagen
                  </span>
                ) : (
                  <span className="text-xs font-mono text-zinc-400 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Saknas
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Laseruppriktningsprotokoll, isolationsmätning (meggning), provtryckningsintyg eller kalibreringsrapport.
              </p>
            </div>
          </label>

          {/* Checkpoint 5 */}
          <label className="flex items-start space-x-3.5 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer select-none">
            <input
              type="checkbox"
              checked={si.hoursAndMaterialReconciled}
              onChange={(e) => updateSi({ hoursAndMaterialReconciled: e.target.checked })}
              className="mt-1 w-4 h-4 rounded text-blue-600 border-zinc-300 dark:border-zinc-700 focus:ring-blue-500"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  5. Timmar & material avstämda mot inköpsorder för attest i Medius
                </span>
                {si.hoursAndMaterialReconciled ? (
                  <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Avstämd
                  </span>
                ) : (
                  <span className="text-xs font-mono text-zinc-400 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Ej avstämd
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Entreprenörens tidssedlar och materialuttag överensstämmer med godkänd beställning och är klara för Medius-fakturamatchning.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Medius Integration & Attest Details */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 flex items-center gap-2 pb-3 mb-4 border-b border-zinc-100 dark:border-zinc-800">
          <Building2 className="w-4 h-4 text-blue-500" />
          <span>Ekonomisk Avstämning & Medius-attest</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
              Medius Inköpsorder (PO)
            </label>
            <input
              type="text"
              value={si.mediusPoNumber}
              onChange={(e) => updateSi({ mediusPoNumber: e.target.value })}
              placeholder="t.ex. PO-984421"
              className="w-full px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 uppercase"
            />
          </div>

          <div>
            <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
              Fakturareferens / Faktura-nr
            </label>
            <input
              type="text"
              value={si.mediusInvoiceRef}
              onChange={(e) => updateSi({ mediusInvoiceRef: e.target.value })}
              placeholder="t.ex. FAKT-2026-904"
              className="w-full px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
              Maximo Teknisk Status
            </label>
            <select
              value={si.maximoStatusAfterInspection}
              onChange={(e) => updateSi({ maximoStatusAfterInspection: e.target.value as any })}
              className="w-full px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="VÄNTAR">VÄNTAR (Väntar på besiktning)</option>
              <option value="PÅG">PÅG (Pågående arbete)</option>
              <option value="TECO">TECO (Tekniskt färdigrapporterad)</option>
              <option value="AVSL">AVSL (Slutavslutad i Maximo)</option>
            </select>
          </div>

          <div>
            <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
              Attestant (Underhållschef / Ledare)
            </label>
            <input
              type="text"
              value={si.mediusApprover}
              onChange={(e) => updateSi({ mediusApprover: e.target.value })}
              placeholder="Namn på attestör"
              className="w-full px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
              Attestdatum
            </label>
            <input
              type="date"
              value={si.approvalDate}
              onChange={(e) => updateSi({ approvalDate: e.target.value })}
              className="w-full px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
              Totala Debiterbara Entreprenörtimmar
            </label>
            <input
              type="number"
              value={order.resources.contractorHours}
              onChange={(e) => {
                const hours = parseFloat(e.target.value) || 0;
                onChange({
                  ...order,
                  resources: {
                    ...order.resources,
                    contractorHours: hours,
                  },
                });
              }}
              className="w-full px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="sm:col-span-2 md:col-span-3">
            <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
              Besiktningsprotokoll & Kommentarer
            </label>
            <textarea
              rows={2}
              value={si.notes}
              onChange={(e) => updateSi({ notes: e.target.value })}
              placeholder="Anteckningar om utfört arbete, eventuella kvarstående punkter eller uppföljning till nästa UH-intervall..."
              className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
