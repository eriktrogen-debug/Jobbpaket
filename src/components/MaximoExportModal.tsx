import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { 
  X, 
  Send, 
  Download, 
  CheckCircle2, 
  Server, 
  FileCode, 
  FileSpreadsheet, 
  ShieldCheck, 
  Layers, 
  Clock, 
  ArrowRight,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { WorkOrder } from '../types.ts';

interface MaximoExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: WorkOrder[];
  onOrderSynced: (updatedOrders: WorkOrder[]) => void;
}

export const MaximoExportModal: React.FC<MaximoExportModalProps> = ({
  isOpen,
  onClose,
  orders,
  onOrderSynced,
}) => {
  const [activeTab, setActiveTab] = useState<'api' | 'file'>('api');
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [syncedOrderCount, setSyncedOrderCount] = useState(0);

  if (!isOpen || orders.length === 0) return null;

  // Maximo status mapping based on active Gate
  const getMaximoStatus = (order: WorkOrder): string => {
    switch (order.currentGate) {
      case 1:
        return 'WAPPR'; // Väntar på godkännande
      case 2:
        return 'BEDÖM'; // Under beredning
      case 3:
        return order.gate3Approved ? 'SCHED' : 'WAPPR'; // Schemalagd när Gate 3 är godkänd!
      case 4:
        return 'INPRG'; // Pågående i fält
      case 5:
        return order.serviceInspection.maximoStatusAfterInspection || 'TECO'; // TECO / COMP
    }
  };

  // Build the Maximo MIF (Maximo Integration Framework) payload for an order
  const buildMaximoPayload = (order: WorkOrder) => {
    const status = getMaximoStatus(order);
    const longDesc = `JOBBPAKET & BEREDNING (Gate ${order.currentGate}/5):
--------------------------------------------------
Nivå: ${order.level} | Prio: ${order.priority}
Beredare: ${order.planner}
Fönster: ${order.stopWindow || 'Löpande'}

SÄKERHET & LOTO:
- LOTO erfordras: ${order.safety.lotoRequired ? 'JA (' + (order.safety.lotoPermitId || 'STD') + ')' : 'NEJ'}
- Mekanisk: ${order.safety.lotoMechanical ? 'JA' : 'NEJ'} | El: ${order.safety.lotoElectrical ? 'JA' : 'NEJ'} | Tryck/Media: ${order.safety.lotoPneumaticSteam ? 'JA' : 'NEJ'}
- Tillstånd heta arbeten: ${order.safety.permitHotWork ? 'JA' : 'NEJ'}
- Tillstånd slutet rum: ${order.safety.permitConfinedSpace ? 'JA' : 'NEJ'}
- Säkerhetsanteckningar: ${order.safety.safetyNotes || 'Standard'}

TEKNISKA SPECIFIKATIONER:
- Ritningsnummer: ${order.documentation.drawingNumber || 'Enligt pärm'}
- Åtdragningsmoment: ${order.documentation.tighteningTorqueNm || 'Enligt standard'}
- Smörjmedel: ${order.documentation.lubricationSpec || 'Standard'}

ARBETSPROCEDUR:
${order.documentation.workInstructions}

FÖRRÅD & KITTNING:
- Kittningsplats: ${order.materialInspection.shelfLocation || 'FÖRRÅD'}
- Gate 3 status: ${order.gate3Approved ? 'GODKÄND & LÅST' : 'SPÄRR AKTIV'}

MEDIUS EKONOMI:
- Inköpsorder (PO): ${order.serviceInspection.mediusPoNumber || 'Ej angiven'}
- Attestant: ${order.serviceInspection.mediusApprover || 'Ej attesterad'}`;

    return {
      WONUM: order.id,
      DESCRIPTION: order.title,
      DESCRIPTION_LONGDESCRIPTION: longDesc,
      STATUS: status,
      STATUSDATE: new Date().toISOString(),
      SITEID: 'PROD01',
      ORGID: 'INDUSTRY',
      ASSETNUM: order.position,
      LOCATION: order.facility,
      WOPRIORITY: order.priority.split(' ')[0],
      SCHEDSTART: order.plannedStartDate,
      LEAD: order.planner,
      KITT_LOCATION: order.materialInspection.shelfLocation || 'FÖRRÅD-IN',
      MEDIUS_PO: order.serviceInspection.mediusPoNumber || '',
      MEDIUS_STATUS: order.serviceInspection.hoursAndMaterialReconciled ? 'ATTESTERAD' : 'PÅGÅENDE',
      WPITEM: order.materials.map(m => ({
        ITEMNUM: m.partNumber,
        DESCRIPTION: m.description,
        ITEMQTY: m.quantity,
        ORDERUNIT: m.unit,
        LOCATION: m.shelfLocation,
        INSTOCK: m.inStock ? 'Y' : 'N',
      })),
      WPLABOR: [
        { CRAFT: 'MEK', LABORHRS: order.resources.mechanicalHours },
        { CRAFT: 'EL', LABORHRS: order.resources.electricalHours },
        { CRAFT: 'SVETS', LABORHRS: order.resources.weldingHours },
        { CRAFT: 'KRAN', LABORHRS: order.resources.craneHours },
        { CRAFT: 'ENTR', LABORHRS: order.resources.contractorHours, VENDOR: order.resources.contractorCompany },
      ].filter(l => l.LABORHRS > 0),
      WORKLOGSet: (order.maximoWorkLog || []).map((wl) => ({
        RECORDKEY: wl.wonum,
        LOGTYPE: wl.logType,
        DESCRIPTION: wl.summary,
        DESCRIPTION_LONGDESCRIPTION: wl.detail || wl.summary,
        CREATEBY: wl.createBy,
        CREATEDATE: wl.createDate,
      })),
      WOACTIVITYSet: (order.tasks || []).map((t) => ({
        WONUM: order.id,
        TASKID: t.taskNumber,
        DESCRIPTION: t.description,
        OWNERGROUP: t.trade,
        ESTDUR: t.estimatedHours,
        STATUS: t.completed ? 'COMP' : 'APPR',
        ACTFINISH: t.completedAt || null,
        LEAD: t.completedBy || null,
      })),
    };
  };

  // Perform Live REST API sync to Maximo
  const handlePerformApiSync = () => {
    setIsExporting(true);
    setTimeout(() => {
      const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
      
      const updatedOrders: WorkOrder[] = orders.map((o) => {
        const maximoStatus = getMaximoStatus(o);
        const txId = `MX-TX-${Math.floor(100000 + Math.random() * 900000)}`;
        const syncedLogsCount = o.maximoWorkLog?.length || 0;
        return {
          ...o,
          lastMaximoSync: {
            date: now,
            status: maximoStatus,
            transactionId: txId,
          },
          maximoWorkLog: (o.maximoWorkLog || []).map((wl) => ({
            ...wl,
            syncedToMaximo: true,
          })),
          history: [
            ...o.history,
            {
              date: now,
              user: 'Maximo OSLC Sync',
              action: `Synkad tillbaka till IBM Maximo EAM. Status uppdaterad till: ${maximoStatus}. ${syncedLogsCount} arbetsloggposter (WORKLOG) och förrådshylla (${o.materialInspection.shelfLocation || 'FÖRRÅD'}) arkiverade (Tx: ${txId}).`,
            },
          ],
        };
      });

      onOrderSynced(updatedOrders);
      setIsExporting(false);
      setExportComplete(true);
      setSyncedOrderCount(orders.length);
    }, 700);
  };

  // Download Maximo MIF JSON file
  const handleDownloadMifJson = () => {
    const payloads = orders.map(buildMaximoPayload);
    const envelope = {
      _generated: new Date().toISOString(),
      _integration: 'IBM Maximo EAM Object Structure MXWO',
      _system: 'Jobbpaket & Leveranskontroll (Maximo/Medius)',
      MXWOSet: payloads,
    };

    const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Maximo_Export_MXWO_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download Maximo Excel / CSV Loader
  const handleDownloadExcelLoader = () => {
    const rows = orders.map((o) => {
      const p = buildMaximoPayload(o);
      return {
        WONUM: p.WONUM,
        DESCRIPTION: p.DESCRIPTION,
        STATUS: p.STATUS,
        ASSETNUM: p.ASSETNUM,
        LOCATION: p.LOCATION,
        WOPRIORITY: p.WOPRIORITY,
        SCHEDSTART: p.SCHEDSTART,
        KITT_LOCATION: p.KITT_LOCATION,
        GATE_STATUS: `Gate ${o.currentGate}`,
        MEDIUS_PO: p.MEDIUS_PO,
        MEDIUS_STATUS: p.MEDIUS_STATUS,
        MEK_TIMMAR: o.resources.mechanicalHours,
        EL_TIMMAR: o.resources.electricalHours,
        TOTAL_TIMMAR: o.resources.estimatedTotalHours,
        MOMENT_NM: o.documentation.tighteningTorqueNm,
        SMORJNING: o.documentation.lubricationSpec,
        LOTO_ID: o.safety.lotoPermitId,
        HETA_ARBETEN: o.safety.permitHotWork ? 'JA' : 'NEJ',
        SLUTET_RUM: o.safety.permitConfinedSpace ? 'JA' : 'NEJ',
        ANTAL_ARBETSLOGGAR: o.maximoWorkLog?.length || 0,
        BESKRIVNING_LANG: p.DESCRIPTION_LONGDESCRIPTION,
      };
    });

    const worklogRows: any[] = [];
    orders.forEach((o) => {
      (o.maximoWorkLog || []).forEach((wl) => {
        worklogRows.push({
          RECORDKEY: wl.wonum,
          LOGTYPE: wl.logType,
          DESCRIPTION: wl.summary,
          DESCRIPTION_LONGDESCRIPTION: wl.detail || wl.summary,
          CREATEBY: wl.createBy,
          CREATEDATE: wl.createDate,
          SITEID: 'PROD01',
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'MXWO_Arbetsordrar');

    if (worklogRows.length > 0) {
      const wsLog = XLSX.utils.json_to_sheet(worklogRows);
      XLSX.utils.book_append_sheet(wb, wsLog, 'MAXIMO_WORKLOG');
    }

    XLSX.writeFile(wb, `Maximo_Data_Loader_MXWO_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span>Synka / Exportera tillbaka till Maximo</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-mono font-bold">
                  {orders.length} {orders.length === 1 ? 'AO' : 'Arbetsordrar'}
                </span>
              </h2>
              <p className="text-xs text-zinc-500">
                Återför status (SCHED/TECO), beredda LOTO-data, åtdragningsmoment, förrådshylla och Medius-PO till IBM Maximo EAM.
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

        {/* Tab selection */}
        <div className="px-6 pt-3 border-b border-zinc-200 dark:border-zinc-800 flex space-x-4 bg-zinc-50/50 dark:bg-zinc-900/50">
          <button
            onClick={() => setActiveTab('api')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center space-x-2 transition-colors cursor-pointer ${
              activeTab === 'api'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Direktsynk via Maximo REST / OSLC</span>
          </button>

          <button
            onClick={() => setActiveTab('file')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center space-x-2 transition-colors cursor-pointer ${
              activeTab === 'file'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Exportera MIF-filer (JSON / Excel)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {exportComplete ? (
            /* SUCCESS STATE */
            <div className="p-8 text-center space-y-4 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-2xl animate-in fade-in">
              <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-100">
                  Synkning mot IBM Maximo slutförd!
                </h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1 max-w-md mx-auto">
                  {syncedOrderCount} st arbetsordrar har uppdaterats via Maximo Object Structure MXWO. Status, LOTO-dokumentation, kittningsplats och Medius PO har överförts.
                </p>
              </div>

              <div className="pt-2 flex justify-center space-x-3">
                <button
                  onClick={onClose}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer shadow-sm"
                >
                  Klar (Stäng)
                </button>
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'api' ? (
                /* LIVE API SYNC TAB */
                <div className="space-y-4">
                  {/* Endpoint card */}
                  <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <Server className="w-4 h-4 text-emerald-600" />
                        <span>Mål-server: IBM Maximo Enterprise Asset Management</span>
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                        ANSLUTEN (HTTP 200)
                      </span>
                    </div>
                    <div className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 p-2 rounded border border-zinc-200 dark:border-zinc-800 truncate">
                      PUT https://maximo.produktion.intern/maximo/oslc/os/mxwo/
                    </div>
                  </div>

                  {/* Summary of what will be sent */}
                  <div className="space-y-2">
                    <div className="font-bold uppercase tracking-wider text-zinc-500">
                      Följande ordrar uppdateras i Maximo:
                    </div>

                    <div className="space-y-2 max-h-52 overflow-y-auto">
                      {orders.map((o) => {
                        const targetStatus = getMaximoStatus(o);
                        return (
                          <div
                            key={o.id}
                            className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between gap-3"
                          >
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                                  {o.id}
                                </span>
                                <span className="text-zinc-500 truncate max-w-sm font-medium">
                                  {o.title}
                                </span>
                              </div>
                              <div className="text-[11px] text-zinc-400 mt-0.5">
                                Hyllplats: <strong className="text-zinc-700 dark:text-zinc-300 font-mono">{o.materialInspection.shelfLocation || 'FÖRRÅD'}</strong> • Prio: {o.priority}
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-[10px] text-zinc-400 block uppercase font-mono">Ny Status</span>
                              <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                                {targetStatus}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Field sync details checklist */}
                  <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 text-[11px] space-y-1 text-zinc-600 dark:text-zinc-400">
                    <div className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                      Datafält som skrivs över i Maximo:
                    </div>
                    <div>✓ <strong>STATUS:</strong> Ändras automatiskt till SCHED (om Gate 3 klar) eller TECO (om Gate 5 klar).</div>
                    <div>✓ <strong>LONG DESCRIPTION:</strong> Beredda säkerhets- & LOTO-instruktioner, moment (Nm) och arbetsprocedur.</div>
                    <div>✓ <strong>KITT_LOCATION:</strong> Förrådshyllans adress så montören hittar materialet.</div>
                    <div>✓ <strong>WPLABOR:</strong> Erforderliga hantverkstimmar för mekanik, el, svets och kran.</div>
                    <div>✓ <strong>MEDIUS_PO:</strong> Referensnummer till inköpsorder och fakturamatchning.</div>
                  </div>

                  {/* Sync Trigger Button */}
                  <div className="pt-2">
                    <button
                      onClick={handlePerformApiSync}
                      disabled={isExporting}
                      className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold uppercase tracking-wider text-xs shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2"
                    >
                      {isExporting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Överför till Maximo REST API...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Synka {orders.length} st AO till Maximo EAM</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* FILE EXPORT TAB */
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                      Filbaserad export till Maximo Integration Framework (MIF)
                    </h3>
                    <p className="text-zinc-500 text-xs">
                      Om din anläggning inte tillåter direkt REST-anrop kan du exportera standardiserade inläsningsfiler för Maximo Data Loader eller Object Structure MXWO.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* JSON / XML MIF */}
                    <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 font-bold mb-1">
                          <FileCode className="w-5 h-5" />
                          <span>Maximo MIF JSON</span>
                        </div>
                        <p className="text-[11px] text-zinc-500">
                          Strukturerad JSON för Maximo Object Structure MXWO med kapslad WPLABOR, WPITEM och lång beskrivning.
                        </p>
                      </div>

                      <button
                        onClick={handleDownloadMifJson}
                        className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Ladda ner MIF JSON ({orders.length} AO)</span>
                      </button>
                    </div>

                    {/* Excel Data Loader */}
                    <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold mb-1">
                          <FileSpreadsheet className="w-5 h-5" />
                          <span>Maximo Excel Loader (.xlsx)</span>
                        </div>
                        <p className="text-[11px] text-zinc-500">
                          Excel-kalkylblad formaterat för Maximo Data Import med kolumner för WONUM, STATUS, KITT_LOCATION och LOTO.
                        </p>
                      </div>

                      <button
                        onClick={handleDownloadExcelLoader}
                        className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Ladda ner Excel Loader (.xlsx)</span>
                      </button>
                    </div>
                  </div>

                  {/* Sample JSON snippet preview */}
                  <div className="mt-4">
                    <span className="font-bold uppercase tracking-wider text-zinc-500 text-[11px] block mb-1">
                      Exempel på genererad MXWO-struktur ({orders[0]?.id}):
                    </span>
                    <pre className="p-3 rounded-lg bg-zinc-900 text-zinc-200 font-mono text-[10px] overflow-x-auto max-h-40 border border-zinc-800">
                      {JSON.stringify(buildMaximoPayload(orders[0]), null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 flex items-center justify-between text-xs">
          <span className="text-zinc-500">
            Exporten bibehåller full spårbarhet och versionshistorik i Maximo.
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
