import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  BookmarkCheck, 
  BookmarkPlus, 
  Trash2, 
  CheckCircle2, 
  HardHat, 
  Wrench, 
  FileText, 
  Package,
  Layers,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { JobTemplate, WorkOrder, WorkOrderLevel } from '../types.ts';
import { saveTemplates } from '../utils/storage.ts';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: JobTemplate[];
  onUpdateTemplates: (templates: JobTemplate[]) => void;
  onApplyTemplate: (template: JobTemplate) => void;
  currentOrderForSave?: WorkOrder | null;
}

export const TemplateModal: React.FC<TemplateModalProps> = ({
  isOpen,
  onClose,
  templates,
  onUpdateTemplates,
  onApplyTemplate,
  currentOrderForSave,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<JobTemplate | null>(
    templates[0] || null
  );
  const [isSavingNew, setIsSavingNew] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState(
    currentOrderForSave ? `Mall: ${currentOrderForSave.title}` : ''
  );
  const [newTemplateCategory, setNewTemplateCategory] = useState<JobTemplate['category']>('Mekanik');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveCurrentAsTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrderForSave || !newTemplateName.trim()) return;

    const newTemplate: JobTemplate = {
      id: `MALL-${Date.now().toString().slice(-4)}`,
      name: newTemplateName.trim(),
      description: newTemplateDesc.trim() || `Återanvändbar mall baserad på ${currentOrderForSave.id}: ${currentOrderForSave.title}`,
      category: newTemplateCategory,
      level: currentOrderForSave.level,
      safety: { ...currentOrderForSave.safety },
      resources: { ...currentOrderForSave.resources },
      documentation: { ...currentOrderForSave.documentation },
      materials: [...currentOrderForSave.materials],
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: currentOrderForSave.planner || 'Beredare',
    };

    const nextList = [newTemplate, ...templates];
    onUpdateTemplates(nextList);
    saveTemplates(nextList);
    setSelectedTemplate(newTemplate);
    setIsSavingNew(false);

    setSuccessToast(`Jobbpaketet sparades som mall "${newTemplate.name}"!`);
    setTimeout(() => setSuccessToast(null), 2500);
  };

  const handleDeleteTemplate = (id: string) => {
    if (window.confirm('Vill du ta bort denna mall?')) {
      const nextList = templates.filter((t) => t.id !== id);
      onUpdateTemplates(nextList);
      saveTemplates(nextList);
      if (selectedTemplate?.id === id) {
        setSelectedTemplate(nextList[0] || null);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <BookmarkCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                Jobbmallar & Beredningsbibliotek
              </h2>
              <p className="text-xs text-zinc-500">
                Spara färdiga jobbpaket och återanvänd säkerhetskrav, LOTO, moment och materiallistor
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

        {/* Success toast */}
        {successToast && (
          <div className="px-6 py-2.5 bg-emerald-50 dark:bg-emerald-950/50 border-b border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* Left Sidebar: Template list */}
          <div className="w-full md:w-80 border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto p-4 space-y-3 bg-zinc-50/50 dark:bg-zinc-950/20">
            {currentOrderForSave && (
              <button
                onClick={() => setIsSavingNew(true)}
                className="w-full p-2.5 rounded-xl border border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-900 dark:text-purple-200 text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-xs mb-3"
              >
                <BookmarkPlus className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Spara nuvarande jobb som mall</span>
              </button>
            )}

            <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-1">
              Tillgängliga Mallar ({templates.length})
            </div>

            <div className="space-y-2">
              {templates.map((tmpl) => {
                const isSelected = selectedTemplate?.id === tmpl.id && !isSavingNew;
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => {
                      setSelectedTemplate(tmpl);
                      setIsSavingNew(false);
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer select-none text-left ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 ring-1 ring-blue-500/20'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 bg-white dark:bg-zinc-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-mono">
                        {tmpl.category}
                      </span>
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 font-mono">
                        {tmpl.level}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                      {tmpl.name}
                    </h4>
                    <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2">
                      {tmpl.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Pane: Template Preview OR Save New Form */}
          <div className="flex-1 overflow-y-auto p-6 text-xs">
            {isSavingNew ? (
              /* FORM: SAVE CURRENT AS TEMPLATE */
              <form onSubmit={handleSaveCurrentAsTemplate} className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <BookmarkPlus className="w-4 h-4 text-purple-600" />
                    <span>Spara Jobbpaket som ny Mall</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsSavingNew(false)}
                    className="text-zinc-400 hover:text-zinc-600 text-xs cursor-pointer"
                  >
                    Avbryt
                  </button>
                </div>

                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                    Mallens Namn
                  </label>
                  <input
                    type="text"
                    required
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="t.ex. Mall: Kuggväxelbyte SEW KA-serien"
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                      Kategori
                    </label>
                    <select
                      value={newTemplateCategory}
                      onChange={(e) => setNewTemplateCategory(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 cursor-pointer"
                    >
                      <option value="Mekanik">Mekanik</option>
                      <option value="Ventiler/Rör">Ventiler / Rör</option>
                      <option value="Pumpar/Hydraulik">Pumpar / Hydraulik</option>
                      <option value="El & Instrument">El & Instrument</option>
                      <option value="Allmänt">Allmänt</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                      Kopplad Nivå
                    </label>
                    <input
                      type="text"
                      disabled
                      value={currentOrderForSave?.level || 'Nivå 2'}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                    Beskrivning av tillämpning
                  </label>
                  <textarea
                    rows={3}
                    value={newTemplateDesc}
                    onChange={(e) => setNewTemplateDesc(e.target.value)}
                    placeholder="Förklara när denna mall ska användas, t.ex. vid återkommande haveri, linjestopp eller planerat komponentbyte..."
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                  />
                </div>

                <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 space-y-1">
                  <div className="font-bold text-zinc-700 dark:text-zinc-300">Detta sparas i mallen:</div>
                  <div>• Säkerhetskrav & LOTO-instruktioner ({currentOrderForSave?.safety.lotoRequired ? 'LOTO aktiv' : 'Standard'})</div>
                  <div>• Resursberäkning ({currentOrderForSave?.resources.mechanicalHours}h mek, {currentOrderForSave?.resources.electricalHours}h el)</div>
                  <div>• Åtdragningsmoment: {currentOrderForSave?.documentation.tighteningTorqueNm || 'Ej angivet'}</div>
                  <div>• Smörjspecifikation & Arbetsinstruktioner</div>
                  <div>• {currentOrderForSave?.materials.length} st standardartiklar/reservdelar</div>
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsSavingNew(false)}
                    className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 cursor-pointer"
                  >
                    Avbryt
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold cursor-pointer"
                  >
                    Spara Mall
                  </button>
                </div>
              </form>
            ) : selectedTemplate ? (
              /* TEMPLATE DETAIL & APPLY */
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold">
                        {selectedTemplate.id}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-semibold text-zinc-600 dark:text-zinc-400">
                        {selectedTemplate.category}
                      </span>
                      <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        {selectedTemplate.level}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                      {selectedTemplate.name}
                    </h3>
                    <p className="text-zinc-500 mt-1">
                      {selectedTemplate.description}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleDeleteTemplate(selectedTemplate.id)}
                      className="p-2 text-zinc-400 hover:text-red-600 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                      title="Ta bort mall"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        onApplyTemplate(selectedTemplate);
                        onClose();
                      }}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Tillämpa denna mall på jobbet</span>
                    </button>
                  </div>
                </div>

                {/* Safety & LOTO Preview */}
                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40">
                  <div className="flex items-center space-x-2 font-bold mb-2 text-zinc-900 dark:text-zinc-100">
                    <HardHat className="w-4 h-4 text-red-500" />
                    <span>Förberedd Säkerhet & LOTO</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div>LOTO: <strong className="text-zinc-900 dark:text-zinc-100">{selectedTemplate.safety.lotoRequired ? 'JA' : 'NEJ'}</strong></div>
                    <div>Heta Arbeten: <strong className="text-zinc-900 dark:text-zinc-100">{selectedTemplate.safety.permitHotWork ? 'JA' : 'NEJ'}</strong></div>
                    <div>Slutet Rum: <strong className="text-zinc-900 dark:text-zinc-100">{selectedTemplate.safety.permitConfinedSpace ? 'JA' : 'NEJ'}</strong></div>
                    <div>Moment: <strong className="font-mono text-zinc-900 dark:text-zinc-100">{selectedTemplate.documentation.tighteningTorqueNm || 'Standard'}</strong></div>
                  </div>
                  {selectedTemplate.safety.safetyNotes && (
                    <div className="mt-2 text-[11px] text-zinc-600 dark:text-zinc-400 font-mono">
                      {selectedTemplate.safety.safetyNotes}
                    </div>
                  )}
                </div>

                {/* Instructions Preview */}
                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40">
                  <div className="font-bold mb-1.5 text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span>Arbetsinstruktion</span>
                  </div>
                  <p className="whitespace-pre-line text-zinc-700 dark:text-zinc-300 leading-relaxed text-[11px]">
                    {selectedTemplate.documentation.workInstructions}
                  </p>
                </div>

                {/* Materials List */}
                <div>
                  <div className="font-bold mb-2 text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-amber-500" />
                    <span>Standardmaterial i denna mall ({selectedTemplate.materials.length} st):</span>
                  </div>
                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-zinc-100 dark:bg-zinc-800 font-mono">
                        <tr>
                          <th className="p-2">Artikelnr</th>
                          <th className="p-2">Benämning</th>
                          <th className="p-2">Antal</th>
                          <th className="p-2">Kittplats</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {selectedTemplate.materials.map((m) => (
                          <tr key={m.id}>
                            <td className="p-2 font-mono font-bold">{m.partNumber}</td>
                            <td className="p-2">{m.description}</td>
                            <td className="p-2 font-mono">{m.quantity} {m.unit}</td>
                            <td className="p-2 font-mono">{m.shelfLocation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-zinc-400">
                Välj en mall i listan till vänster för att granska innehållet.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 flex items-center justify-between text-xs">
          <span className="text-zinc-500">
            När du tillämpar en mall fylls säkerhet, moment, timmar och artiklar i automatiskt.
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
