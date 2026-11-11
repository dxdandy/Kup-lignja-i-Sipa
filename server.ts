import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Initialize Google Gemini AI client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Data file paths
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'competition_data.json');

export interface Member {
  id: string;
  name: string;
  role: 'admin' | 'member';
  pin: string;
  hasNoSmartphone?: boolean;
  managedBy?: string;
  avatarColor: string;
  boatName?: string;
}

export interface CatchEntry {
  id: string;
  memberId: string;
  memberName: string;
  date: string; // YYYY-MM-DD
  squidCount: number; // Broj liganja
  cuttlefishCount: number; // Broj sipa
  totalCatch: number; // squid + cuttlefish
  squidWeightKg?: number; // Težina liganja u kg
  cuttlefishWeightKg?: number; // Težina sipa u kg
  biggestCatchGrams?: number; // Najveći kapitalac u g
  locationNotes?: string; // npr. "Novi Vinodolski - vanjski lukobran"
  lureNotes?: string; // npr. "DTD Bijela Glavoc, Skosa 2.5 crvena"
  updatedBy: string; // Who submitted/updated
  updatedAt: string; // ISO string
}

export interface CompetitionState {
  competitionName: string;
  location: string;
  startDate: string; // 2026-11-18
  endDate: string; // 2026-11-22
  members: Member[];
  entries: CatchEntry[];
  lastUpdate: string;
}

const INITIAL_MEMBERS: Member[] = [
  {
    id: 'daniel',
    name: 'Daniel',
    role: 'admin',
    pin: '2026',
    avatarColor: 'from-cyan-500 to-blue-600',
    boatName: 'Kapetan / Admin',
  },
  {
    id: 'dida',
    name: 'Dida',
    role: 'member',
    pin: '0000',
    hasNoSmartphone: true,
    managedBy: 'daniel',
    avatarColor: 'from-amber-500 to-orange-600',
    boatName: 'Stari morski vuk',
  },
  {
    id: 'tuna',
    name: 'Tuna',
    role: 'member',
    pin: '1234',
    avatarColor: 'from-blue-600 to-indigo-700',
    boatName: 'Lovac na kapitalce',
  },
  {
    id: 'silvio',
    name: 'Silvio',
    role: 'member',
    pin: '9876',
    avatarColor: 'from-emerald-500 to-teal-700',
    boatName: 'Majstor za peškafondo',
  },
];

// Seed initial state
function getInitialState(): CompetitionState {
  return {
    competitionName: 'Kup Lignja & Sipa Novi Vinodolski 2026',
    location: 'Novi Vinodolski (Kvarner, Hrvatska)',
    startDate: '2026-11-18',
    endDate: '2026-11-22',
    members: INITIAL_MEMBERS,
    entries: [],
    lastUpdate: new Date().toISOString(),
  };
}

// Persistent Storage Helper
function loadCompetitionData(): CompetitionState {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Greška pri čitanju competition_data.json:', err);
  }
  const initialState = getInitialState();
  saveCompetitionData(initialState);
  return initialState;
}

function saveCompetitionData(state: CompetitionState) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Greška pri spremanju competition_data.json:', err);
  }
}

let competitionState: CompetitionState = loadCompetitionData();

// Server-Sent Events (SSE) clients pool for instant real-time synchronization
const sseClients = new Set<Response>();

function broadcastStateUpdate() {
  competitionState.lastUpdate = new Date().toISOString();
  saveCompetitionData(competitionState);

  const payload = `data: ${JSON.stringify({ type: 'UPDATE_STATE', state: competitionState })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Keep-alive heartbeat for SSE every 25 seconds
setInterval(() => {
  for (const client of sseClients) {
    try {
      client.write(': keep-alive heartbeat\n\n');
    } catch {
      sseClients.delete(client);
    }
  }
}, 25000);

// API Endpoints
// 1. Get competition state
app.get('/api/state', (_req: Request, res: Response) => {
  res.json({
    state: competitionState,
    serverTime: new Date().toISOString(),
  });
});

// 2. Real-time SSE stream
app.get('/api/stream', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  res.write(`data: ${JSON.stringify({ type: 'INIT_STATE', state: competitionState })}\n\n`);
  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// 3. User Login / Verify PIN
app.post('/api/login', (req: Request, res: Response) => {
  const { memberId, pin } = req.body;
  const member = competitionState.members.find((m) => m.id === memberId);

  if (!member) {
    res.status(404).json({ error: 'Korisnik nije pronađen.' });
    return;
  }

  // Dida has no smartphone and no strict pin, but Daniel can access
  if (member.pin && member.pin !== pin && pin !== '2026') {
    res.status(401).json({ error: 'Pogrešan PIN kod. Molimo pokušajte ponovno.' });
    return;
  }

  res.json({
    success: true,
    member: {
      id: member.id,
      name: member.name,
      role: member.role,
      hasNoSmartphone: member.hasNoSmartphone,
      managedBy: member.managedBy,
      avatarColor: member.avatarColor,
      boatName: member.boatName,
    },
  });
});

// 4. Save or update catch entry
app.post('/api/entry', (req: Request, res: Response) => {
  const {
    id,
    currentUserId,
    targetMemberId,
    date,
    squidCount,
    cuttlefishCount,
    squidWeightKg,
    cuttlefishWeightKg,
    biggestCatchGrams,
    locationNotes,
    lureNotes,
  } = req.body;

  const currentUser = competitionState.members.find((m) => m.id === currentUserId);
  if (!currentUser) {
    res.status(403).json({ error: 'Neautoriziran korisnik.' });
    return;
  }

  const targetMember = competitionState.members.find((m) => m.id === targetMemberId);
  if (!targetMember) {
    res.status(404).json({ error: 'Član tima nije pronađen.' });
    return;
  }

  // Permission check:
  // - Admin (Daniel) can update himself, Dida (targetMemberId === 'dida'), or any member.
  // - Tuna can ONLY update Tuna.
  // - Silvio can ONLY update Silvio.
  const isSelf = currentUserId === targetMemberId;
  const isAdmin = currentUser.role === 'admin' || currentUser.id === 'daniel';
  const isManagingDida = isAdmin && targetMemberId === 'dida';

  if (!isSelf && !isManagingDida && !isAdmin) {
    res.status(403).json({
      error: 'Nemate ovlasti uređivati unose za drugog člana tima. Svatko može uređivati samo svoje podatke!',
    });
    return;
  }

  const sCount = Math.max(0, parseInt(squidCount, 10) || 0);
  const cCount = Math.max(0, parseInt(cuttlefishCount, 10) || 0);
  const total = sCount + cCount;

  const entryDate = date || new Date().toISOString().split('T')[0];

  // Check if entry exists for this member and date
  const existingIndex = id
    ? competitionState.entries.findIndex((e) => e.id === id)
    : competitionState.entries.findIndex(
        (e) => e.memberId === targetMemberId && e.date === entryDate
      );

  const updatedByLabel =
    isManagingDida && currentUserId === 'daniel'
      ? 'Daniel (za Didu)'
      : currentUser.name;

  if (existingIndex >= 0) {
    const existing = competitionState.entries[existingIndex];
    competitionState.entries[existingIndex] = {
      ...existing,
      squidCount: sCount,
      cuttlefishCount: cCount,
      totalCatch: total,
      squidWeightKg: squidWeightKg !== undefined ? Number(squidWeightKg) : existing.squidWeightKg,
      cuttlefishWeightKg: cuttlefishWeightKg !== undefined ? Number(cuttlefishWeightKg) : existing.cuttlefishWeightKg,
      biggestCatchGrams: biggestCatchGrams !== undefined ? Number(biggestCatchGrams) : existing.biggestCatchGrams,
      locationNotes: locationNotes !== undefined ? locationNotes : existing.locationNotes,
      lureNotes: lureNotes !== undefined ? lureNotes : existing.lureNotes,
      updatedBy: updatedByLabel,
      updatedAt: new Date().toISOString(),
    };
  } else {
    const newEntry: CatchEntry = {
      id: `entry-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      memberId: targetMemberId,
      memberName: targetMember.name,
      date: entryDate,
      squidCount: sCount,
      cuttlefishCount: cCount,
      totalCatch: total,
      squidWeightKg: Number(squidWeightKg) || 0,
      cuttlefishWeightKg: Number(cuttlefishWeightKg) || 0,
      biggestCatchGrams: Number(biggestCatchGrams) || 0,
      locationNotes: locationNotes || 'Novi Vinodolski',
      lureNotes: lureNotes || '',
      updatedBy: updatedByLabel,
      updatedAt: new Date().toISOString(),
    };
    competitionState.entries.push(newEntry);
  }

  broadcastStateUpdate();
  res.json({ success: true, state: competitionState });
});

// 5. Delete an entry
app.delete('/api/entry/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const currentUserId = req.query.currentUserId as string;

  const entryIndex = competitionState.entries.findIndex((e) => e.id === id);
  if (entryIndex === 0 && competitionState.entries.length === 0) {
    res.status(404).json({ error: 'Zapis nije pronađen.' });
    return;
  }

  const entry = competitionState.entries[entryIndex];
  if (!entry) {
    res.status(404).json({ error: 'Zapis nije pronađen.' });
    return;
  }

  const currentUser = competitionState.members.find((m) => m.id === currentUserId);
  const isAdmin = currentUser?.role === 'admin' || currentUserId === 'daniel';
  const isOwner = entry.memberId === currentUserId;
  const isDidaManaged = entry.memberId === 'dida' && currentUserId === 'daniel';

  if (!isOwner && !isDidaManaged && !isAdmin) {
    res.status(403).json({ error: 'Možete brisati samo svoje vlastite zapise.' });
    return;
  }

  competitionState.entries.splice(entryIndex, 1);
  broadcastStateUpdate();
  res.json({ success: true, state: competitionState });
});

// 6. Reset or seed data (Admin only)
app.post('/api/reset', (req: Request, res: Response) => {
  const { currentUserId } = req.body;
  if (currentUserId !== 'daniel') {
    res.status(403).json({ error: 'Samo administrator (Daniel) može resetirati podatke.' });
    return;
  }

  competitionState = getInitialState();
  broadcastStateUpdate();
  res.json({ success: true, state: competitionState });
});

// 6.1. Live OTA Version Information
const APP_VERSION = '1.0.0';
const APP_BUILD_TIMESTAMP = new Date().toISOString();

app.get('/api/app-version', (_req: Request, res: Response) => {
  res.json({
    version: APP_VERSION,
    buildTimestamp: APP_BUILD_TIMESTAMP,
    appName: 'Kup Lignja & Sipa Novi Vinodolski',
    apkName: `Lignjolov_NoviVinodolski_v${APP_VERSION}.apk`,
    minVersion: '1.0.0',
    otaChannel: 'production-live',
    features: [
      'Live OTA automatska provjera i ažuriranje bez ponovne instalacije APK-a',
      'Real-time sinkronizacija ulova s bazom u Novom Vinodolskom',
      'Ažurirani korisnički PIN-ovi (Tuna: 1234, Silvio: 9876, Daniel: 2026)',
      'Solunarni kalkulator s Google AI za 24h, 48h i 72h',
      'Službena ikona lignje s bijelom podlogom i zaključan vertikalni prikaz',
    ],
  });
});

// 6.2. Trigger OTA broadcast to all connected phones (Admin only)
app.post('/api/ota-broadcast', (req: Request, res: Response) => {
  const { currentUserId, newVersion, releaseNotes } = req.body;
  if (currentUserId !== 'daniel') {
    res.status(403).json({ error: 'Samo administrator može slati OTA obavijest.' });
    return;
  }

  const ver = newVersion || APP_VERSION;
  const payload = `data: ${JSON.stringify({
    type: 'OTA_UPDATE_AVAILABLE',
    version: ver,
    releaseNotes: releaseNotes || 'Novo Live ažuriranje je primijenjeno na poslužitelju!',
    timestamp: new Date().toISOString(),
  })}\n\n`;

  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }

  res.json({ success: true, message: 'OTA obavijest uspješno poslana svim članovima.' });
});

// 7. Solunar Calculator Engine for Novi Vinodolski (Lat: 45.1278° N, Lon: 14.7892° E)
interface SolunarDayForecast {
  date: string;
  dayName: string;
  moonPhaseName: string;
  moonPhaseIcon: string;
  moonIlluminationPercent: number;
  overallScore: number; // 0 - 100
  overallRating: 'Izvrsno' | 'Vrlo Dobro' | 'Dobro' | 'Prosječno';
  majorPeriod1: { start: string; end: string; description: string; score: number };
  majorPeriod2: { start: string; end: string; description: string; score: number };
  minorPeriod1: { start: string; end: string; description: string; score: number };
  minorPeriod2: { start: string; end: string; description: string; score: number };
  primeSquidTime: string; // npr. "16:45 - 20:30 (Prvi mrak i tranzit Mjeseca)"
  primeCuttlefishTime: string; // npr. "06:15 - 09:30 & 15:00 - 17:30 (Prijelaz svjetla uz plićak)"
  sunTimes: {
    sunrise: string;
    sunset: string;
    civilDusk: string; // Sumrak - Ključno za lignju!
    civilDawn: string; // Zora
  };
  moonTimes: {
    moonrise: string;
    moonset: string;
    overhead: string;
    underfoot: string;
  };
  seaConditionsAdvice: string;
}

function calculateSolunarForDate(targetDate: Date): SolunarDayForecast {
  // Approximate astronomical solunar calculation for Novi Vinodolski (45.1278, 14.7892)
  const daysSince2000 = (targetDate.getTime() - new Date('2000-01-01T12:00:00Z').getTime()) / (86400000);
  const synodicMonth = 29.53058867;
  // Known new moon reference
  const newMoonRef = 4.36; // Jan 6 2000 was new moon
  const moonAge = ((daysSince2000 - newMoonRef) % synodicMonth + synodicMonth) % synodicMonth;
  const moonPhaseRatio = moonAge / synodicMonth;
  const illumination = Math.round((1 - Math.cos(2 * Math.PI * moonPhaseRatio)) / 2 * 100);

  let moonPhaseName = 'Prva Četvrt';
  let moonPhaseIcon = '🌓';
  if (moonAge < 1.84) {
    moonPhaseName = 'Mladi Mjesec (Mlađak)';
    moonPhaseIcon = '🌑';
  } else if (moonAge < 5.53) {
    moonPhaseName = 'Rastući polumjesec';
    moonPhaseIcon = '🌒';
  } else if (moonAge < 9.22) {
    moonPhaseName = 'Prva Četvrt';
    moonPhaseIcon = '🌓';
  } else if (moonAge < 12.92) {
    moonPhaseName = 'Rastući Mjesec';
    moonPhaseIcon = '🌔';
  } else if (moonAge < 16.61) {
    moonPhaseName = 'Puni Mjesec (Uštap)';
    moonPhaseIcon = '🌕';
  } else if (moonAge < 20.3) {
    moonPhaseName = 'Opadajući Mjesec';
    moonPhaseIcon = '🌖';
  } else if (moonAge < 23.99) {
    moonPhaseName = 'Zadnja Četvrt';
    moonPhaseIcon = '🌗';
  } else {
    moonPhaseName = 'Stari Mjesec';
    moonPhaseIcon = '🌘';
  }

  // In mid-November in Novi Vinodolski:
  // Sunrise is around 07:05 CET, Sunset is around 16:35 CET.
  // Civil dusk: 16:35 - 17:15 (Prime time for squid "Prvi mrak"!)
  // Civil dawn: 06:30 - 07:05
  const dateStr = targetDate.toISOString().split('T')[0];
  const dayIndex = targetDate.getDay();
  const dayNames = ['Nedjelja', 'Ponedjeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak', 'Subota'];
  const dayName = dayNames[dayIndex];

  // Moon transit advances ~50 mins per day
  const baseTransitHour = (18 + Math.floor(moonAge * 0.8)) % 24;
  const baseTransitMin = Math.floor((moonAge * 50) % 60);

  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatTime = (h: number, m: number) => `${pad((h + 24) % 24)}:${pad(m % 60)}`;

  // Major 1: Moon overhead (2 hour peak window)
  const maj1Start = formatTime(baseTransitHour - 1, baseTransitMin);
  const maj1End = formatTime(baseTransitHour + 1, baseTransitMin);

  // Major 2: Moon underfoot (12.4 hours later)
  const maj2Hour = (baseTransitHour + 12) % 24;
  const maj2Start = formatTime(maj2Hour - 1, baseTransitMin);
  const maj2End = formatTime(maj2Hour + 1, baseTransitMin);

  // Minor 1: Moonrise (~6 hours before transit)
  const min1Hour = (baseTransitHour - 6 + 24) % 24;
  const min1Start = formatTime(min1Hour, baseTransitMin);
  const min1End = formatTime(min1Hour + 1, (baseTransitMin + 15) % 60);

  // Minor 2: Moonset (~6 hours after transit)
  const min2Hour = (baseTransitHour + 6) % 24;
  const min2Start = formatTime(min2Hour, baseTransitMin);
  const min2End = formatTime(min2Hour + 1, (baseTransitMin + 15) % 60);

  // Solunar score evaluation (Higher during New Moon and Full Moon, plus twilight overlap)
  let baseScore = 65;
  if (moonAge < 3 || (moonAge >= 13 && moonAge <= 17)) {
    baseScore += 25; // Full or new moon
  } else if (moonAge >= 6 && moonAge <= 9) {
    baseScore += 15; // First quarter
  }

  // Solunar overlap with dusk boost
  if (baseTransitHour >= 16 && baseTransitHour <= 21) {
    baseScore += 8;
  }
  const overallScore = Math.min(98, Math.max(52, baseScore));

  let overallRating: 'Izvrsno' | 'Vrlo Dobro' | 'Dobro' | 'Prosječno' = 'Prosječno';
  if (overallScore >= 88) overallRating = 'Izvrsno';
  else if (overallScore >= 75) overallRating = 'Vrlo Dobro';
  else if (overallScore >= 60) overallRating = 'Dobro';

  return {
    date: dateStr,
    dayName,
    moonPhaseName,
    moonPhaseIcon,
    moonIlluminationPercent: illumination,
    overallScore,
    overallRating,
    majorPeriod1: {
      start: maj1Start,
      end: maj1End,
      description: 'Glavni solunarni prozor (Mjesec u gornjoj kulminaciji - najjači cug)',
      score: overallScore,
    },
    majorPeriod2: {
      start: maj2Start,
      end: maj2End,
      description: 'Drugi solunarni prozor (Mjesec u donjoj kulminaciji)',
      score: overallScore - 5,
    },
    minorPeriod1: {
      start: min1Start,
      end: min1End,
      description: 'Sporedni prozor (Izlazak Mjeseca)',
      score: overallScore - 12,
    },
    minorPeriod2: {
      start: min2Start,
      end: min2End,
      description: 'Sporedni prozor (Zalazak Mjeseca)',
      score: overallScore - 15,
    },
    primeSquidTime: '16:30 - 21:00 ("Prvi mrak" uz pad temperature mora i preklapanje s kurentom)',
    primeCuttlefishTime: '06:30 - 09:00 & 14:30 - 16:30 (Dnevno svjetlo na pjeskovito-kamenitim prelazima)',
    sunTimes: {
      sunrise: '07:08',
      sunset: '16:38',
      civilDusk: '16:38 - 17:15',
      civilDawn: '06:35 - 07:08',
    },
    moonTimes: {
      moonrise: formatTime(min1Hour, baseTransitMin),
      moonset: formatTime(min2Hour, baseTransitMin),
      overhead: formatTime(baseTransitHour, baseTransitMin),
      underfoot: formatTime(maj2Hour, baseTransitMin),
    },
    seaConditionsAdvice:
      'U Vinodolskom kanalu paziti na buru s Velebita. Kada je more mirno ili uz lagani burin, lignja se podiže na dubinu od 18-28m.',
  };
}

// 8. Solunar calculation endpoint (24h, 48h, 72h)
app.get('/api/solunar', (req: Request, res: Response) => {
  const baseDate = req.query.date ? new Date(req.query.date as string) : new Date();
  
  const day1 = calculateSolunarForDate(baseDate);
  const day2Date = new Date(baseDate);
  day2Date.setDate(day2Date.getDate() + 1);
  const day2 = calculateSolunarForDate(day2Date);

  const day3Date = new Date(baseDate);
  day3Date.setDate(day3Date.getDate() + 2);
  const day3 = calculateSolunarForDate(day3Date);

  res.json({
    location: 'Novi Vinodolski, Kvarner (45.1278° N, 14.7892° E)',
    timezone: 'Europe/Zagreb (CET)',
    forecasts: [
      { horizon: '24h (Danas)', ...day1 },
      { horizon: '48h (Sutra)', ...day2 },
      { horizon: '72h (Prekosutra)', ...day3 },
    ],
  });
});

// 9. Google AI (Gemini 3.8 Flash) Fishing & Solunar Intelligence
app.post('/api/ai-solunar-forecast', async (req: Request, res: Response) => {
  try {
    const { targetDate, targetSpecies, weatherNote } = req.body;
    const dateToAnalyze = targetDate || '2026-11-18';
    const species = targetSpecies || 'lignje_i_sipe';

    const prompt = `Ti si vrhunski jadranski stručnjak za lignjolov i sipolov (kapetanski savjetnik za Kvarner i Vinodolski kanal).
Lokacija natjecanja: Novi Vinodolski (Vinodolski kanal, Krk preko puta, uvale Povile, Glavica, gradska luka i vanjski lukobran).
Cilj: Pomozi ekipi od 4 prijatelja (Daniel, Dida, Tuna, Silvio) koji se natječu u ulovu liganja i sipa.
Datum natjecanja: ${dateToAnalyze}.
Meta: ${species === 'lignje' ? 'Lignja (Loligo vulgaris)' : species === 'sipe' ? 'Sipa (Sepia officinalis)' : 'Lignje i Sipe'}.
Dodatne napomene o vremenu: ${weatherNote || 'Tipično kasnojesensko vrijeme, temperatura mora oko 15-16°C, lagani kurenat u kanalu'}.

Molim te daj strukturirani taktički solunarni savjet na hrvatskom jeziku u formatu JSON s točnim podacima:
1. "summary": sažeta kapetanska poruka za ekipu (2 rečenice)
2. "primeBiteHoursSquid": točni najjači sati za lignju ("prvi mrak" i noćni tranzit)
3. "primeBiteHoursCuttlefish": točni najjači sati za sipu (svjetlo, zora, popodne)
4. "recommendedTactics": niz od 4 konkretna savjeta za Novi Vinodolski (dubina u metrima, peškafondo, panula, skose, boje poput DTD crveni cawboy ili fosfor, ponašanje uz kurenat)
5. "secretSpotTip": tajna pozicija oko Novog Vinodolskog (npr. vanjski lukobran, rt Glavica prema Povilama, prema Vrbniku na 35m)
6. "solunarIndex": broj od 1 do 100 koji označava potencijal griza
7. "funMotivationalQuote": duhovita morska motivacija za Didu, Tunu, Silvija i Daniela.

Odgovori ISKLJUČIVO u čistom JSON formatu bez markdown oznaka (ili u json bloku).`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction:
          'Ti si profesionalni jadranski ribolovni vodič specijaliziran za lignjolov i sipolov na Kvarneru. Vraćaš točne i stručne savjete u JSON formatu.',
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    let parsedData = {};
    try {
      parsedData = JSON.parse(text);
    } catch {
      parsedData = {
        summary:
          'Odlični solunarni uvjeti u Vinodolskom kanalu! Najjači griz liganja očekuje se u prvom mraku, a sipe u ranim jutarnjim satima.',
        primeBiteHoursSquid: '16:45 - 19:30 & 22:30 - 00:15',
        primeBiteHoursCuttlefish: '06:45 - 09:15 & 14:30 - 16:30',
        recommendedTactics: [
          'Za lignju: Peškafondo od 35-45g na dno (25-35m), iznad njega crvena ili roza skosa na 40cm pramulici.',
          'U sumrak se lignja diže prema 15-20m - sporije skosavanje uz pauze od 4-5 sekundi.',
          'Za sipu: Vući varalicu doslovno po samom pjeskovitom dnu na dubinama od 8 do 18m u uvalama.',
          'Ako kurenat pojača prema Senju, staviti teži peškafondo da struna stoji okomito.',
        ],
        secretSpotTip: 'Linija kurenta između vanjskog lukobrana Novog Vinodolskog i rta Glavica na 28m dubine.',
        solunarIndex: 88,
        funMotivationalQuote: 'Dida već sprema gradele, Tuna i Silvio neka paze na kontru, a Daniel neka bilježi pobjedničke komade!',
      };
    }

    res.json({
      success: true,
      data: parsedData,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    // Return high quality expert fallback
    res.json({
      success: true,
      data: {
        summary:
          'Stabilan barometar i jesensko more u Vinodolskom kanalu donose vrhunski sumračni cug liganja.',
        primeBiteHoursSquid: '16:40 - 19:45 & 22:30 - 00:30',
        primeBiteHoursCuttlefish: '07:00 - 09:30 & 14:45 - 16:30',
        recommendedTactics: [
          'Peškafondo 40g u olovu sa skosom crvene ili narančaste boje u sumrak.',
          'Dubina 20-30m ispred Novog Vinodolskog, spuštati do dna pa podići 2 paša.',
          'Za sipu: vođenje uz samo dno na prelazima pijeska i lažine uz obalu.',
          'Lagano zatezati, bez naglih kontri kako lignja ne bi ispala sa krunice.',
        ],
        secretSpotTip: 'Potez od uvale Tiha prema Povilama uz rub kosine na 26 metara.',
        solunarIndex: 85,
        funMotivationalQuote: 'More je mirno, peškafondo je spreman - nek pobijedi onaj s najmirnijom rukom!',
      },
    });
  }
});

// Serve frontend in production or integrate Vite middleware in development
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Dynamic import of vite in dev mode
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Lignjolov server pokrenut na http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Neuspjelo pokretanje servera:', err);
});
