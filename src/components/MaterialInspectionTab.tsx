import React from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Lock, 
  Unlock, 
  MapPin, 
  UserCheck, 
  FileText, 
  Sparkles,
  AlertOctagon,
  Package,
  Server
} from 'lucide-react';
import { WorkOrder, MaterialInspection } from '../types.ts';
import { checkGate3Requirements, logTaskCompletionToMaximo } from '../utils/storage.ts';

interface MaterialInspectionTabProps {
  order: WorkOrder;
  onChange: (updatedOrder: WorkOrder) => void;
}

export const MaterialInspectionTab: React.FC<MaterialInspectionTabProps> = ({
  order,
  onChange,
}) => {
  const mi = order.materialInspection;
  const validation = checkGate3Requirements(order);

  const updateMi = (fields: Partial<MaterialInspection>) => {
    const updatedMi = { ...mi, ...fields };
    
    // Check if new state satisfies requirements
    const testOrder: WorkOrder = {
      ...order,
      materialInspection: updatedMi,
    };
    const newValidation = checkGate3Requirements(testOrder);

    // Auto-update status if in Gate 3
    let newStatus = order.status;
    let newGate3Approved = order.gate3Approved;

    if (order.currentGate === 3) {
      if (newValidation.isSatisfied) {
        newStatus = 'Klar';
      } else {
        newStatus = 'Blockerad';
        newGate3Approved = false;
      }
    }

    let baseOrder: WorkOrder = {
      ...order,
      status: newStatus,
      gate3Approved: newGate3Approved,
      materialInspection: updatedMi,
    };

    // Requirement: Every time a task/checkpoint becomes completed, write to Maximo WORKLOG!
    const inspector = updatedMi.inspectorName || 'Förrådsansvarig';
    if (fields.checkedAgainstDrawing === true && !mi.checkedAgainstDrawing) {
      baseOrder = logTaskCompletionToMaximo(
        baseOrder,
        'Uppgift klar: Artikel kontrollerad mot ritning och teknisk specifikation',
        'LEVERANS',
        'Mått, anslutningar och materialkvalitet verifierade mot ritning utan anmärkning.',
        inspector
      ).updatedOrder;
    }

    if (fields.transportUndamaged === true && !mi.transportUndamaged) {
      baseOrder = logTaskCompletionToMaximo(
        baseOrder,
        'Uppgift klar: Transportskadekontroll godkänd (gods skadefritt)',
        'LEVERANS',
        'Emballage och komponenter okulärbesiktigade för fraktskador.',
        inspector
      ).updatedOrder;
    }

    if (fields.certificatesReceived === true && !mi.certificatesReceived) {
      baseOrder = logTaskCompletionToMaximo(
        baseOrder,
        'Uppgift klar: Material- och provningscertifikat (3.1) mottagna',
        'LEVERANS',
        'Giltigt 3.1 EN 10204 intyg kontrollerat och arkiverat under jobbpaketet.',
        inspector
      ).updatedOrder;
    }

    if (fields.physicallyKittedAndTagged === true && !mi.physicallyKittedAndTagged) {
      baseOrder = logTaskCompletionToMaximo(
        baseOrder,
        `Uppgift klar: Material fysiskt kittat och märkt med AO-nummer (${order.id})`,
        'LEVERANS',
        `Alla komponenter för arbetsorder ${order.id} samlade och uppmärkta.`,
        inspector
      ).updatedOrder;
    }

    if (fields.shelfLocationConfirmed === true && !mi.shelfLocationConfirmed) {
      baseOrder = logTaskCompletionToMaximo(
        baseOrder,
        `Uppgift klar: Förrådshylla bekräftad (${updatedMi.shelfLocation || 'FÖRRÅD'})`,
        'LEVERANS',
        `Kittat material placerat och registrerat på hyllplats ${updatedMi.shelfLocation || 'FÖRRÅD'}.`,
        inspector
      ).updatedOrder;
    }

    onChange(baseOrder);
  };

  const handleApproveGate3 = () => {
    if (!validation.isSatisfied) return;

    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const inspector = mi.inspectorName || 'Förrådsansvarig';

    let updatedOrder: WorkOrder = {
      ...order,
      gate3Approved: true,
      gate3ApprovedBy: inspector,
      gate3ApprovedDate: now,
      status: 'Klar',
      currentGate: order.currentGate === 3 ? 4 : order.currentGate, // Ready for execution!
      history: [
        ...order.history,
        {
          date: now,
          user: inspector,
          action: 'Gate 3 godkänd: Samtliga material- & kittningskrav verifierade. Arbetsorder frisläppt till Gate 4 (Utförande).',
        },
      ],
    };

    // Log Gate 3 release to Maximo WORKLOG
    updatedOrder = logTaskCompletionToMaximo(
      updatedOrder,
      'Gate 3 Godkänd: Material spärr hävd - Jobb frigivet för schemaläggning (SCHED)',
      'STATUS',
      `Samtliga 5 materialpunkter är godkända av ${inspector}. Hyllplats: ${mi.shelfLocation || 'FÖRRÅD'}. Arbetsorder klar för schemaläggning i Maximo.`,
      inspector
    ).updatedOrder;

    onChange(updatedOrder);
  };

  const handleRevokeGate3 = () => {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    onChange({
      ...order,
      gate3Approved: false,
      currentGate: 3,
      status: 'Blockerad',
      history: [
        ...order.history,
        {
          date: now,
          user: 'Underhållsledare',
          action: 'Gate 3-godkännande hävt. Jobbpaketet återfört till materialkontroll.',
        },
      ],
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner explaining the Gate 3 Hard Lock */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
        order.gate3Approved
          ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
          : validation.isSatisfied
          ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-100'
          : 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800 text-red-900 dark:text-red-100'
      }`}>
        <div className="flex items-start space-x-3">
          <div className={`p-2.5 rounded-lg shrink-0 ${
            order.gate3Approved
              ? 'bg-emerald-500 text-white'
              : validation.isSatisfied
              ? 'bg-amber-500 text-white'
              : 'bg-red-600 text-white animate-pulse'
          }`}>
            {order.gate3Approved ? (
              <Unlock className="w-5 h-5" />
            ) : (
              <Lock className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="font-bold text-sm tracking-wide uppercase">
                {order.gate3Approved
                  ? 'Gate 3 Godkänd & Frisläppt för Schemaläggning'
                  : validation.isSatisfied
                  ? 'Gate 3 Redo att Låsas (Samtliga krav uppfyllda)'
                  : 'SPÄRR AKTIV (Gate 3 Låst)'}
              </h4>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                order.gate3Approved
                  ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200'
                  : 'bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200'
              }`}>
                {order.gate3Approved ? 'LÅST & KLAR' : 'MATERIALSPÄRR'}
              </span>
            </div>
            <p className="text-xs mt-0.5 opacity-90">
              {order.gate3Approved
                ? `Arbetsordern godkändes ${order.gate3ApprovedDate} av ${order.gate3ApprovedBy}. Kittad på: ${mi.shelfLocation || 'Förråd'}.`
                : 'Spärrregel: Arbetsordern kan EJ planeras eller låsas för schemaläggning förrän alla 5 obligatoriska kontrollpunkter nedan är ikryssade och verifierade.'}
            </p>
          </div>
        </div>

        {/* The Mandatory Action Button */}
        <div className="shrink-0 flex items-center space-x-2 w-full md:w-auto">
          {order.gate3Approved ? (
            <button
              onClick={handleRevokeGate3}
              className="w-full md:w-auto px-4 py-2 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              Häv godkännande (Lås upp Gate 3)
            </button>
          ) : (
            <button
              onClick={handleApproveGate3}
              disabled={!validation.isSatisfied}
              className={`w-full md:w-auto px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer ${
                validation.isSatisfied
                  ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white cursor-pointer ring-2 ring-emerald-500/30'
                  : 'bg-red-100 dark:bg-red-950/60 text-red-400 dark:text-red-500 border border-red-300 dark:border-red-900 cursor-not-allowed opacity-80'
              }`}
              title={
                validation.isSatisfied
                  ? 'Klicka för att godkänna och låsa Gate 3'
                  : 'Kan inte godkännas förrän alla punkter är ikryssade'
              }
            >
              {validation.isSatisfied ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Godkänn för schemaläggning (Gate 3)</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Spärrad: Godkänn för schemaläggning</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Missing items warning box if not satisfied */}
      {!validation.isSatisfied && (
        <div className="p-3.5 rounded-lg bg-red-100/70 dark:bg-red-950/50 border border-red-300 dark:border-red-800 text-xs text-red-800 dark:text-red-200">
          <div className="flex items-center space-x-2 font-bold mb-1.5">
            <AlertOctagon className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <span>Följande punkter måste åtgärdas innan Gate 3 kan låsas:</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 ml-1 font-mono text-[11px]">
            {validation.missingItems.map((item, idx) => (
              <li key={idx} className="text-red-700 dark:text-red-300 font-medium">
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 5 Mandatory Inspection Checkpoints */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-500" />
              <span>Obligatorisk Leverans- & Kittningskontroll (Mottagningskontroll)</span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Samtliga fem kravpunkter nedan är obligatoriska för industriell godkännandeprocess.
            </p>
          </div>
        </div>

        <div className="space-y-3.5">
          {/* Checkpoint 1 */}
          <label className="flex items-start space-x-3.5 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer select-none">
            <input
              type="checkbox"
              checked={mi.checkedAgainstDrawing}
              onChange={(e) => updateMi({ checkedAgainstDrawing: e.target.checked })}
              className="mt-1 w-4 h-4 rounded text-blue-600 border-zinc-300 dark:border-zinc-700 focus:ring-blue-500"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  1. Artikel kontrollerad mot ritning & teknisk specifikation
                </span>
                {mi.checkedAgainstDrawing ? (
                  <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> OK
                  </span>
                ) : (
                  <span className="text-xs font-mono text-red-500 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Ej utförd
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Mått, flänsdimensioner, hålbild, materialkvalitet och spänningsnivå överensstämmer med AO-specifikation.
              </p>
            </div>
          </label>

          {/* Checkpoint 2 */}
          <label className="flex items-start space-x-3.5 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer select-none">
            <input
              type="checkbox"
              checked={mi.transportUndamaged}
              onChange={(e) => updateMi({ transportUndamaged: e.target.checked })}
              className="mt-1 w-4 h-4 rounded text-blue-600 border-zinc-300 dark:border-zinc-700 focus:ring-blue-500"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  2. Transportskadefri okulärbesiktning
                </span>
                {mi.transportUndamaged ? (
                  <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> OK
                  </span>
                ) : (
                  <span className="text-xs font-mono text-red-500 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Ej utförd
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Inga synliga deformationer, repor på tätningsytor, lackskador eller fuktpåverkan under transport.
              </p>
            </div>
          </label>

          {/* Checkpoint 3 */}
          <label className="flex items-start space-x-3.5 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer select-none">
            <input
              type="checkbox"
              checked={mi.certificatesReceived}
              onChange={(e) => updateMi({ certificatesReceived: e.target.checked })}
              className="mt-1 w-4 h-4 rounded text-blue-600 border-zinc-300 dark:border-zinc-700 focus:ring-blue-500"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  3. Certifikat och provningsintyg mottagna
                </span>
                {mi.certificatesReceived ? (
                  <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> OK
                  </span>
                ) : (
                  <span className="text-xs font-mono text-red-500 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Saknas (3.1/CE)
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Materialcertifikat EN 10204 3.1, provtryckningsprotokoll och CE-märkning arkiverade i dokumentarkivet.
              </p>
            </div>
          </label>

          {/* Checkpoint 4 */}
          <label className="flex items-start space-x-3.5 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer select-none">
            <input
              type="checkbox"
              checked={mi.physicallyKittedAndTagged}
              onChange={(e) => updateMi({ physicallyKittedAndTagged: e.target.checked })}
              className="mt-1 w-4 h-4 rounded text-blue-600 border-zinc-300 dark:border-zinc-700 focus:ring-blue-500"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  4. Fysiskt kittad och uppmärkt med AO-nummer
                </span>
                {mi.physicallyKittedAndTagged ? (
                  <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> OK
                  </span>
                ) : (
                  <span className="text-xs font-mono text-red-500 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Ej slutförd
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Alla komponenter samlade i kittningslåda eller på märkt pall med tydlig AO-etikett ({order.id}).
              </p>
            </div>
          </label>

          {/* Checkpoint 5 */}
          <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20">
            <div className="flex items-start space-x-3.5">
              <input
                type="checkbox"
                id="shelfLocationConfirmed"
                checked={mi.shelfLocationConfirmed}
                onChange={(e) => updateMi({ shelfLocationConfirmed: e.target.checked })}
                className="mt-1 w-4 h-4 rounded text-blue-600 border-zinc-300 dark:border-zinc-700 focus:ring-blue-500 cursor-pointer"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="shelfLocationConfirmed" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 cursor-pointer">
                    5. Hyllplats / Staging-område angiven och verifierad
                  </label>
                  {mi.shelfLocationConfirmed && mi.shelfLocation?.trim() ? (
                    <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Verifierad
                    </span>
                  ) : (
                    <span className="text-xs font-mono text-red-500 flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> Hyllplats saknas
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 mb-2.5">
                  Fysisk position där montör/mekaniker hämtar ut jobbpaketet innan fältstart.
                </p>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <div className="relative flex-1 w-full">
                    <MapPin className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="t.ex. KITT-B14-02 eller STAGING-PANNA4"
                      value={mi.shelfLocation}
                      onChange={(e) => updateMi({ shelfLocation: e.target.value })}
                      className="w-full pl-9 pr-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 uppercase"
                    />
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                    {mi.shelfLocation?.trim() ? 'Plats registrerad' : 'Måste anges'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Inspector metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-xs">
          <div>
            <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-zinc-400" />
              <span>Kontrollerad av (Förrådstekniker / Mottagningskontrollant)</span>
            </label>
            <input
              type="text"
              value={mi.inspectorName}
              onChange={(e) => updateMi({ inspectorName: e.target.value })}
              placeholder="Namn på förrådstekniker"
              className="w-full px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
              Datum för mottagningskontroll
            </label>
            <input
              type="date"
              value={mi.inspectionDate}
              onChange={(e) => updateMi({ inspectionDate: e.target.value })}
              className="w-full px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-zinc-400" />
              <span>Förrådsanteckningar & Avvikelser</span>
            </label>
            <textarea
              rows={2}
              value={mi.notes}
              onChange={(e) => updateMi({ notes: e.target.value })}
              placeholder="Eventuella restnoteringar, parti- eller batchnummer, transportör etc."
              className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
