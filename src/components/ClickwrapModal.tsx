import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Lock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ChevronDown,
  X,
  ExternalLink,
  Scale,
  Sparkles,
  ShieldCheck,
  Building,
  Copyright
} from 'lucide-react';
import {
  LEGAL_SECTIONS,
  LEGAL_TERMS_VERSION,
  COPYRIGHT_NOTICE,
  RIGHTS_HOLDER,
} from '../utils/legalTerms.ts';
import { AuthenticatedUser, saveTermsAcceptance, hasAcceptedCurrentTerms } from '../utils/security.ts';

interface ClickwrapModalProps {
  user: AuthenticatedUser;
  isOpen: boolean;
  onAccept: () => void;
  onClose?: () => void;
  isMandatoryAcceptance?: boolean; // True when blocking access after login
}

export const ClickwrapModal: React.FC<ClickwrapModalProps> = ({
  user,
  isOpen,
  onAccept,
  onClose,
  isMandatoryAcceptance = true,
}) => {
  const [hasAgreed, setHasAgreed] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alreadyAccepted, setAlreadyAccepted] = useState(false);

  useEffect(() => {
    if (user?.email) {
      setAlreadyAccepted(hasAcceptedCurrentTerms(user.email));
    }
  }, [user]);

  if (!isOpen) return null;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 30) {
      setHasScrolledToBottom(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAgreed) return;

    setIsSubmitting(true);
    try {
      await saveTermsAcceptance(user);
      onAccept();
    } catch (err) {
      console.error('Error saving terms acceptance:', err);
      // Still allow accept if state was saved
      onAccept();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-zinc-950 border border-zinc-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-6 border-b border-zinc-800 bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                <Scale className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-black tracking-wide text-zinc-100 uppercase font-mono">
                    Jobbpaket och leveranskontroll
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    {RIGHTS_HOLDER}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Obligatoriskt Användarvillkor, Licensavtal & Ansvarsbegränsning (Version {LEGAL_TERMS_VERSION})
                </p>
                <div className="text-[11px] text-zinc-500 font-mono mt-1">
                  Inloggad användare: <strong className="text-zinc-300">{user.name}</strong> ({user.email}) • {user.role}
                </div>
              </div>
            </div>

            {/* Optional Close button (only when viewing terms in retrospect, not during mandatory login) */}
            {!isMandatoryAcceptance && onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                title="Stäng villkorsfönstret"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* KEY HIGHLIGHTS BOX (Obligatorisk punktlista med de viktigaste villkoren högst upp) */}
        <div className="p-4 sm:px-6 bg-zinc-900/60 border-b border-zinc-800 text-xs">
          <div className="flex items-center space-x-2 font-bold text-zinc-200 mb-2 uppercase tracking-wider text-[11px]">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Viktiga avtalsvillkor i sammandrag (läs noga):</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800">
              <span className="font-bold text-amber-400 block mb-0.5">1. Immateriella rättigheter (IP)</span>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                All källkod, metodik, AI-prompter och arkitektur tillhör oinskränkt <strong>Erik Trogen / Hillstas</strong>.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-red-900/40">
              <span className="font-bold text-red-400 block mb-0.5">2. Förbud mot kopiering & Vite</span>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Strikt förbud mot reverse engineering och kopiering. Brott medför avstängning och avtalsvite om <strong>250 000 SEK</strong>.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800">
              <span className="font-bold text-zinc-300 block mb-0.5">3. Befintligt skick (As-Is)</span>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Inga garantier. Erik Trogen / Hillstas ansvarar ej för produktionsbortfall, driftstopp eller ekonomisk skada.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-blue-900/40">
              <span className="font-bold text-blue-400 block mb-0.5">4. AI-friskrivning & Besiktning</span>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Användaren har alltid fullt eget ansvar att i verkligheten fysiskt kontrollera LOTO, säkerhet och material.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800">
              <span className="font-bold text-zinc-300 block mb-0.5">5. Användardata & GDPR</span>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Användaren ansvarar för att inmatad anläggnings- och personinformation följer gällande lag och sekretess.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800">
              <span className="font-bold text-zinc-300 block mb-0.5">6. Svensk lag & Domstol</span>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Svensk rätt tillämpas och tvister avgörs i svensk allmän domstol (Stockholms tingsrätt).
              </p>
            </div>
          </div>
        </div>

        {/* SCROLLABLE FULL LEGAL CONTRACT */}
        <div
          onScroll={handleScroll}
          className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-zinc-950/90 text-zinc-300 text-xs leading-relaxed border-b border-zinc-800 selection:bg-amber-500 selection:text-black"
        >
          <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 flex items-center justify-between">
            <span>Scrolla ned för att läsa den fullständiga avtalstexten i sin helhet.</span>
            <span className="text-zinc-500 font-mono">Senast uppdaterad: 2026-10-20</span>
          </div>

          {LEGAL_SECTIONS.map((sec) => (
            <div key={sec.id} className="space-y-2 border-b border-zinc-850 pb-5">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center space-x-2">
                <span className="text-amber-400 font-mono">{sec.number}.</span>
                <span>{sec.title.replace(`${sec.number}. `, '')}</span>
              </h3>
              <p className="text-zinc-400 italic text-[11px] bg-zinc-900/50 p-2 rounded border border-zinc-850">
                {sec.summary}
              </p>
              <div className="text-zinc-300 whitespace-pre-line text-xs font-serif leading-relaxed">
                {sec.content}
              </div>
            </div>
          ))}

          {/* Electronic signature notice */}
          <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 text-[11px] space-y-2">
            <h4 className="font-bold text-zinc-200 uppercase tracking-wider font-mono">
              Elektroniskt Klick-avtal (Clickwrap Agreement)
            </h4>
            <p className="text-zinc-400">
              Genom att klicka i kryssrutan nedan och bekräfta godkännandet ingår du ett juridiskt bindande avtal med Erik Trogen / Hillstas enligt svensk avtalslag (1915:218) och lag om elektronisk handel. Ditt godkännande loggas med användaridentitet, tidsstämpel och kryptografisk kontrollsumma.
            </p>
          </div>
        </div>

        {/* FOOTER FORM (MANDATORY CHECKBOX & SUBMIT BUTTON) */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 bg-zinc-900 border-t border-zinc-800 flex flex-col gap-4">
          {/* Mandatory Checkbox */}
          <label className="flex items-start space-x-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={hasAgreed}
              onChange={(e) => setHasAgreed(e.target.checked)}
              className="w-5 h-5 rounded text-amber-500 focus:ring-amber-400 mt-0.5 cursor-pointer shrink-0 accent-amber-500"
              required
            />
            <span className="text-xs sm:text-sm font-bold text-zinc-100 group-hover:text-amber-300 transition-colors">
              Jag har läst, förstått och godkänner användarvillkoren och licensavtalet från Erik Trogen, Hillstas.
            </span>
          </label>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center space-x-2 text-[11px] text-zinc-400 font-mono">
              <Copyright className="w-3.5 h-3.5 text-zinc-500" />
              <span>{COPYRIGHT_NOTICE}</span>
            </div>

            <div className="flex items-center space-x-3">
              {!isMandatoryAcceptance && onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Stäng
                </button>
              )}

              <button
                type="submit"
                disabled={!hasAgreed || isSubmitting}
                className={`flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-lg cursor-pointer ${
                  hasAgreed && !isSubmitting
                    ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-amber-500/20 active:scale-95'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-60'
                }`}
                title={!hasAgreed ? 'Du måste kryssa i godkännandet för att gå vidare' : 'Godkänn och öppna appen'}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Sparar godkännande...' : 'Godkänn och öppna appen'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
