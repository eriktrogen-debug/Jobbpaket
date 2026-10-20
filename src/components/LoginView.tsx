import React, { useState, useEffect } from 'react';
import {
  Lock,
  ShieldAlert,
  KeyRound,
  User,
  ArrowRight,
  AlertTriangle,
  Clock,
  CheckCircle2,
  HelpCircle,
  Wrench,
  ShieldCheck,
  Building,
  Copyright,
  Sparkles
} from 'lucide-react';
import {
  verifyCredentials,
  createSession,
  getRateLimitStatus,
  AuthenticatedUser,
} from '../utils/security.ts';
import { COPYRIGHT_NOTICE, RIGHTS_HOLDER } from '../utils/legalTerms.ts';

interface LoginViewProps {
  onLoginSuccess: (user: AuthenticatedUser) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [loginMode, setLoginMode] = useState<'pin' | 'password'>('pin');
  const [pinCode, setPinCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showRoleHelper, setShowRoleHelper] = useState(false);

  // Rate limit / Brute-force state
  const [rateLimit, setRateLimit] = useState(getRateLimitStatus());

  // Countdown timer for lockout
  useEffect(() => {
    const timer = setInterval(() => {
      const current = getRateLimitStatus();
      setRateLimit(current);
      if (!current.isLocked && errorMsg?.includes('spärrad')) {
        setErrorMsg(null);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [errorMsg]);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rateLimit.isLocked || !pinCode.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await verifyCredentials('pin', pinCode.trim());
      if (res.success && res.user) {
        createSession(res.user);
        onLoginSuccess(res.user);
      } else {
        setErrorMsg(res.error || 'Felaktig behörighetskod.');
        setRateLimit(getRateLimitStatus());
      }
    } catch {
      setErrorMsg('Ett oväntat fel uppstod vid verifiering.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rateLimit.isLocked || !username.trim() || !password.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await verifyCredentials('password', password.trim(), username.trim());
      if (res.success && res.user) {
        createSession(res.user);
        onLoginSuccess(res.user);
      } else {
        setErrorMsg(res.error || 'Felaktigt användarnamn eller lösenord.');
        setRateLimit(getRateLimitStatus());
      }
    } catch {
      setErrorMsg('Ett oväntat fel uppstod vid verifiering.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between selection:bg-amber-500 selection:text-zinc-950 font-sans">
      {/* BACKGROUND INDUSTRIAL ACCENTS */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950/20 via-zinc-950 to-zinc-950 pointer-events-none" />

      {/* TOP BRAND BAR */}
      <header className="relative z-10 px-4 sm:px-8 py-4 border-b border-zinc-900 bg-zinc-950/70 backdrop-blur">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-sm">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <span className="font-mono font-bold text-sm tracking-wider uppercase text-zinc-200 block">
                Jobbpaket och leveranskontroll
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">
                Rättighetsinnehavare: {RIGHTS_HOLDER}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono text-zinc-400">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Åtkomstkontroll med Brute-Force Skydd</span>
          </div>
        </div>
      </header>

      {/* MAIN LOGIN CARD */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur">
          {/* Card Title */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-blue-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 mb-3 shadow-inner">
              <KeyRound className="w-7 h-7" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase font-mono">
              Säker Inloggning
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
              Ange behörighetskod eller användaruppgifter för att låsa upp systemet.
            </p>
          </div>

          {/* BRUTE-FORCE LOCKOUT BANNER */}
          {rateLimit.isLocked && (
            <div className="mb-5 p-4 rounded-2xl bg-red-950/60 border border-red-700/80 text-red-200 text-xs animate-pulse">
              <div className="flex items-center space-x-2 font-bold mb-1">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                <span className="uppercase tracking-wider">Åtkomst tillfälligt spärrad</span>
              </div>
              <p className="text-[11px] text-red-300 leading-relaxed">
                Tre (3) felaktiga försök har detekterats. För att skydda mot brute-force-attacker är systemet låst i{' '}
                <strong className="text-white font-mono text-sm">{rateLimit.remainingSeconds}s</strong>.
              </p>
              <div className="mt-2 text-[10px] text-red-400/90 font-mono">
                Återupptas automatiskt när timern når 0.
              </div>
            </div>
          )}

          {/* NORMAL ERROR MESSAGE */}
          {errorMsg && !rateLimit.isLocked && (
            <div className="mb-5 p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMsg}</div>
            </div>
          )}

          {/* LOGIN MODE TABS */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-950 rounded-xl border border-zinc-800 mb-6 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setLoginMode('pin');
                setErrorMsg(null);
              }}
              className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                loginMode === 'pin'
                  ? 'bg-amber-500 text-zinc-950 shadow-sm font-black'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>6-siffrig PIN</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMode('password');
                setErrorMsg(null);
              }}
              className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                loginMode === 'password'
                  ? 'bg-amber-500 text-zinc-950 shadow-sm font-black'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Lösenord</span>
            </button>
          </div>

          {/* TAB 1: 6-DIGIT PIN CODE */}
          {loginMode === 'pin' && (
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5 font-mono uppercase tracking-wider">
                  Behörighetskod (6 siffror)
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                  disabled={rateLimit.isLocked || isLoading}
                  placeholder="••••••"
                  autoFocus
                  className="w-full text-center tracking-[0.5em] text-2xl font-mono py-3 px-4 rounded-xl bg-zinc-950 border border-zinc-800 text-amber-400 placeholder-zinc-700 focus:outline-hidden focus:border-amber-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="text-[11px] text-zinc-500 block text-center mt-1.5">
                  Industriell snabbinloggning för fälttekniker & beredare
                </span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={rateLimit.isLocked || isLoading || pinCode.length < 6}
                className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/10 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{isLoading ? 'Verifierar hash...' : 'Lås upp Jobbpaket'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* TAB 2: USERNAME / EMAIL + PASSWORD */}
          {loginMode === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1 font-mono uppercase tracking-wider">
                  Användarnamn / E-post
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={rateLimit.isLocked || isLoading}
                  placeholder="t.ex. erik.trogen@hillstas.se"
                  autoFocus
                  className="w-full text-xs font-mono py-2.5 px-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-hidden focus:border-amber-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1 font-mono uppercase tracking-wider">
                  Lösenord
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={rateLimit.isLocked || isLoading}
                  placeholder="••••••••••••"
                  className="w-full text-xs font-mono py-2.5 px-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-hidden focus:border-amber-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={rateLimit.isLocked || isLoading || !username.trim() || !password.trim()}
                className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/10 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{isLoading ? 'Verifierar hash...' : 'Logga in'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* ATTEMPTS STATUS COUNTER */}
          <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-500">
            <span>Misslyckade försök: {rateLimit.failedAttempts}/3</span>
            <span className="text-emerald-500 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>SHA-256 Saltad</span>
            </span>
          </div>

          {/* DEMO / TESTING CREDENTIALS HELPER */}
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowRoleHelper(!showRoleHelper)}
              className="w-full py-2 px-3 rounded-lg bg-zinc-950/80 hover:bg-zinc-800/80 border border-zinc-800 text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center justify-between font-mono transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Auktoriserade behörighetsroller</span>
              </span>
              <span>{showRoleHelper ? 'Dölj' : 'Visa roller'}</span>
            </button>

            {showRoleHelper && (
              <div className="mt-2.5 p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] space-y-2 font-mono">
                <div
                  onClick={() => {
                    setLoginMode('pin');
                    setPinCode('512088');
                  }}
                  className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 cursor-pointer transition-colors"
                >
                  <div className="font-bold text-amber-400">1. Erik Trogen (Licensinnehavare)</div>
                  <div className="text-zinc-400">PIN: <strong className="text-white">512088</strong> | E-post: erik.trogen@hillstas.se</div>
                </div>

                <div
                  onClick={() => {
                    setLoginMode('pin');
                    setPinCode('489201');
                  }}
                  className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 cursor-pointer transition-colors"
                >
                  <div className="font-bold text-blue-400">2. Underhållsplanerare</div>
                  <div className="text-zinc-400">PIN: <strong className="text-white">489201</strong> | E-post: planerare@hillstas.se</div>
                </div>

                <div
                  onClick={() => {
                    setLoginMode('pin');
                    setPinCode('476310');
                  }}
                  className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 cursor-pointer transition-colors"
                >
                  <div className="font-bold text-emerald-400">3. Drift- & Fälttekniker</div>
                  <div className="text-zinc-400">PIN: <strong className="text-white">476310</strong> | E-post: tekniker@hillstas.se</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* FOOTER COPYRIGHT */}
      <footer className="relative z-10 px-4 sm:px-8 py-4 border-t border-zinc-900 bg-zinc-950/70 text-center text-xs text-zinc-500 font-mono">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>{COPYRIGHT_NOTICE}</span>
          <span className="text-[11px] text-zinc-600">
            Skyddat system enligt svensk upphovsrättslag (1960:729) & brottsbalken
          </span>
        </div>
      </footer>
    </div>
  );
};
