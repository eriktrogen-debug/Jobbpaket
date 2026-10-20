import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// In-memory server-side brute-force protection
interface RateLimitRecord {
  attempts: number;
  lockoutUntil: number;
}
const ipRateLimits = new Map<string, RateLimitRecord>();

const MAX_ATTEMPTS = 3;
const LOCKOUT_MS = 60 * 1000; // 60 seconds

function checkBruteForce(ip: string): { isLocked: boolean; remainingSeconds: number } {
  const record = ipRateLimits.get(ip);
  if (!record) return { isLocked: false, remainingSeconds: 0 };
  const now = Date.now();
  if (record.lockoutUntil > now) {
    return { isLocked: true, remainingSeconds: Math.ceil((record.lockoutUntil - now) / 1000) };
  }
  if (record.lockoutUntil <= now && record.attempts >= MAX_ATTEMPTS) {
    ipRateLimits.delete(ip);
    return { isLocked: false, remainingSeconds: 0 };
  }
  return { isLocked: false, remainingSeconds: 0 };
}

function recordServerFailedAttempt(ip: string): { isLocked: boolean; remainingSeconds: number } {
  const record = ipRateLimits.get(ip) || { attempts: 0, lockoutUntil: 0 };
  record.attempts += 1;
  let isLocked = false;
  let remainingSeconds = 0;
  if (record.attempts >= MAX_ATTEMPTS) {
    record.lockoutUntil = Date.now() + LOCKOUT_MS;
    isLocked = true;
    remainingSeconds = Math.ceil(LOCKOUT_MS / 1000);
  }
  ipRateLimits.set(ip, record);
  return { isLocked, remainingSeconds };
}

function clearServerAttempts(ip: string) {
  ipRateLimits.delete(ip);
}

// In-memory terms acceptance audit log on server
const termsAuditLog: any[] = [];

// ==========================================
// 1. AUTHENTICATION & ACCESS CONTROL API
// ==========================================
app.post('/api/auth/login', (req: Request, res: Response): any => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const rateLimit = checkBruteForce(ip);

  if (rateLimit.isLocked) {
    return res.status(429).json({
      success: false,
      error: `Systemet är tillfälligt spärrat för denna IP. Vänta ${rateLimit.remainingSeconds} sekunder.`,
      lockout: true,
      remainingSeconds: rateLimit.remainingSeconds,
    });
  }

  const { mode, credential, usernameOrEmail } = req.body;
  const cleanCred = (credential || '').trim();

  // Valid credentials verified on server side (No plaintext credentials sent to client)
  let matchedUser = null;

  if (mode === 'pin') {
    if (cleanCred === '512088') {
      matchedUser = {
        id: 'USR-ET-01',
        name: 'Erik Trogen',
        email: 'erik.trogen@hillstas.se',
        role: 'Licensinnehavare & Beredningsledare',
        initials: 'ET',
        badgeLevel: 'Master Admin / Behörighet 1',
      };
    } else if (cleanCred === '489201') {
      matchedUser = {
        id: 'USR-PLAN-02',
        name: 'Underhållsplanerare',
        email: 'planerare@hillstas.se',
        role: 'Underhållsplanerare & Beredare',
        initials: 'UP',
        badgeLevel: 'Beredare / Behörighet 2',
      };
    } else if (cleanCred === '476310') {
      matchedUser = {
        id: 'USR-TEK-03',
        name: 'Drift- & Fälttekniker',
        email: 'tekniker@hillstas.se',
        role: 'Fältutförare & Kontrollrumsoperatör',
        initials: 'FT',
        badgeLevel: 'Fälttekniker / Behörighet 3',
      };
    }
  } else if (mode === 'password') {
    const query = (usernameOrEmail || '').trim().toLowerCase();
    if (
      (query === 'erik.trogen@hillstas.se' || query === 'erik') &&
      cleanCred === 'Hillstas2026!'
    ) {
      matchedUser = {
        id: 'USR-ET-01',
        name: 'Erik Trogen',
        email: 'erik.trogen@hillstas.se',
        role: 'Licensinnehavare & Beredningsledare',
        initials: 'ET',
        badgeLevel: 'Master Admin / Behörighet 1',
      };
    } else if (
      (query === 'planerare@hillstas.se' || query === 'planerare') &&
      cleanCred === 'Planerare2026!'
    ) {
      matchedUser = {
        id: 'USR-PLAN-02',
        name: 'Underhållsplanerare',
        email: 'planerare@hillstas.se',
        role: 'Underhållsplanerare & Beredare',
        initials: 'UP',
        badgeLevel: 'Beredare / Behörighet 2',
      };
    } else if (
      (query === 'tekniker@hillstas.se' || query === 'tekniker') &&
      cleanCred === 'Tekniker2026!'
    ) {
      matchedUser = {
        id: 'USR-TEK-03',
        name: 'Drift- & Fälttekniker',
        email: 'tekniker@hillstas.se',
        role: 'Fältutförare & Kontrollrumsoperatör',
        initials: 'FT',
        badgeLevel: 'Fälttekniker / Behörighet 3',
      };
    }
  }

  if (matchedUser) {
    clearServerAttempts(ip);
    return res.json({
      success: true,
      user: matchedUser,
      rightsNotice: '© Erik Trogen, Hillstas. Alla rättigheter förbehållna.',
    });
  }

  const failedStatus = recordServerFailedAttempt(ip);
  if (failedStatus.isLocked) {
    return res.status(429).json({
      success: false,
      error: `Tre (3) felaktiga inloggningsförsök. Systemet är spärrat i ${failedStatus.remainingSeconds} sekunder.`,
      lockout: true,
      remainingSeconds: failedStatus.remainingSeconds,
    });
  }

  return res.status(401).json({
    success: false,
    error: 'Felaktig behörighetskod eller lösenord.',
    failedAttempts: ipRateLimits.get(ip)?.attempts || 1,
    remainingAttempts: MAX_ATTEMPTS - (ipRateLimits.get(ip)?.attempts || 1),
  });
});

// ==========================================
// 2. TERMS & CLICKWRAP AUDIT TRAIL
// ==========================================
app.post('/api/terms/accept', (req: Request, res: Response) => {
  const { userId, userName, userEmail, version, acceptedAt, clientSignatureHash } = req.body;
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  const entry = {
    userId,
    userName,
    userEmail,
    version,
    acceptedAt: acceptedAt || new Date().toISOString(),
    clientSignatureHash,
    ip,
    serverVerifiedAt: new Date().toISOString(),
  };

  termsAuditLog.unshift(entry);
  console.log(`[TERMS CLICKWRAP AUDIT] User ${userName} (${userEmail}) accepted version ${version} from IP ${ip}`);

  res.json({
    success: true,
    message: 'Avtalsgodkännande registrerat i audit-logg.',
    rightsHolder: 'Erik Trogen / Hillstas',
  });
});

// ==========================================
// 3. SECURE SERVER-SIDE AI EVALUATION (GEMINI API)
// PRIVATE API KEY IS KEPT STRICTLY ON SERVER (process.env.GEMINI_API_KEY)
// SYSTEM PROMPT & METHODOLOGY REMAIN PROTECTED ON SERVER
// ==========================================
app.post('/api/ai/analyze-jobbpaket', async (req: Request, res: Response): Promise<any> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      success: false,
      error: 'GEMINI_API_KEY är inte konfigurerad i servermiljön. Konfigurera miljövariabeln på servern.',
    });
  }

  const { order } = req.body;
  if (!order) {
    return res.status(400).json({ success: false, error: 'Ingen arbetsorder skickades med i förfrågan.' });
  }

  try {
    const ai = new GoogleGenAI({});

    // Proprietary industrial system prompt authored by Erik Trogen / Hillstas
    // Stored exclusively on the server, never exposed in client bundles or network requests
    const systemPrompt = `Du är en svensk certifierad underhållsingenjör och säkerhetsexpert som granskar industriella Jobbpaket och Leveranskontroller enligt metodiken utvecklad av Erik Trogen / Hillstas.

Upphovsrätt & Rättighetsinnehavare: Erik Trogen / Hillstas.
Ditt uppdrag är att göra en opartisk, teknisk granskning av jobbpaketet:
1. Identifiera eventuella säkerhetsluckor i LOTO (Lockout/Tagout), heta arbeten, slutet utrymme och arbete på höjd.
2. Analysera om material och reservdelar är tillräckligt specificerade med certifikatkrav (t.ex. 3.1-intyg) och kitting.
3. Granska om Gate 3 (Hård materialspärr) kan passeras säkert.
4. Granska om Gate 4 arbetsmoment (Maximo Tasks) är logiska och i rätt ordning.
5. Påminn alltid om att operatören har eget fysiskt besiktningsansvar och att AI-analysen endast är rådgivande stöd.

Svara på professionell teknisk svenska i ett strukturerat JSON-format med följande fält:
- overallStatus: "GODKÄND" | "VARNING_SPÄRR" | "KRÄVER_KOMPLETTERING"
- safetyAssessment: string (sammanfattning av LOTO och skyddsåtgärder)
- materialAssessment: string (granskning av reservdelar, 3.1-certifikat och kitting)
- criticalRecommendations: string[] (1-4 punkter med prioriterade åtgärder)
- disclaimer: "OBS: Denna analys är rådgivande AI-stöd. Erik Trogen / Hillstas friskriver sig från ansvar. Fysisk verifiering och kontroll av anläggning och LOTO är alltid användarens eget ansvar."`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `${systemPrompt}\n\nGranska följande jobbpaket:\n${JSON.stringify(
                {
                  id: order.id,
                  title: order.title,
                  level: order.level,
                  facility: order.facility,
                  position: order.position,
                  currentGate: order.currentGate,
                  safety: order.safety,
                  materials: order.materials,
                  materialInspection: order.materialInspection,
                  tasks: order.tasks,
                },
                null,
                2
              )}`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    let parsedResult;
    try {
      parsedResult = JSON.parse(text);
    } catch {
      parsedResult = { raw: text };
    }

    return res.json({
      success: true,
      analysis: parsedResult,
      evaluatedAt: new Date().toISOString(),
      rightsNotice: '© Erik Trogen, Hillstas. Alla rättigheter förbehållna.',
    });
  } catch (error: any) {
    console.error('Server AI evaluation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Ett fel uppstod vid serversidig AI-granskning: ' + (error.message || 'Okänt fel'),
    });
  }
});

// ==========================================
// VITE MIDDLEWARES / STATIC ASSETS
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Jobbpaket & Leveranskontroll] Server running at http://0.0.0.0:${PORT}`);
    console.log(`[Rättighetsinnehavare] Erik Trogen / Hillstas. Alla rättigheter förbehållna.`);
  });
}

startServer();
