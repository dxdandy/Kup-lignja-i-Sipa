import { CompetitionState, Member, CatchEntry, AISolunarAdvice } from '../types';

export const APP_VERSION = '1.3.0';

export const INITIAL_MEMBERS: Member[] = [
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

export const DEFAULT_COMPETITION_STATE: CompetitionState = {
  competitionName: 'Kup Lignja & Sipa Novi Vinodolski 2026',
  location: 'Novi Vinodolski (Kvarner, Hrvatska)',
  startDate: '2026-11-18',
  endDate: '2026-11-22',
  members: INITIAL_MEMBERS,
  entries: [],
  lastUpdate: new Date().toISOString(),
};

const STORAGE_KEY = 'lignjolov_competition_state';

export function getLocalCompetitionState(): CompetitionState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.members) && parsed.members.length > 0) {
        // Ensure updated PINs for Tuna (1234) and Silvio (9876)
        parsed.members = INITIAL_MEMBERS;
        if (!Array.isArray(parsed.entries)) {
          parsed.entries = [];
        }
        return parsed;
      }
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_COMPETITION_STATE;
}

export function saveLocalCompetitionState(state: CompetitionState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
}

/**
 * Returns clean relative endpoint path.
 * Never redirects to unreachable external domains.
 */
export function apiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return cleanEndpoint;
}

/**
 * Helper to check if a fetch response actually returned JSON from our backend
 * (and not an HTML fallback from Capacitor/static hosting).
 */
export async function parseJsonIfValid(res: Response): Promise<any | null> {
  if (!res.ok) return null;
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Local fallback handler for Login when running standalone inside mobile APK
 */
export function verifyPinLocally(memberId: string, pin: string): { member?: Member; error?: string } {
  const state = getLocalCompetitionState();
  const member = state.members.find((m) => m.id === memberId);
  if (!member) {
    return { error: 'Korisnik nije pronađen.' };
  }
  if (member.pin && member.pin !== pin && pin !== '2026') {
    return { error: 'Pogrešan PIN kod. Molimo pokušajte ponovno.' };
  }
  return { member };
}

/**
 * Local fallback handler for saving a catch entry when running inside mobile APK
 */
export function saveCatchEntryLocally(payload: {
  currentUserId: string;
  targetMemberId: string;
  date: string;
  squidCount: number;
  cuttlefishCount: number;
  squidWeightKg: number;
  cuttlefishWeightKg: number;
  biggestCatchGrams: number;
  locationNotes?: string;
  lureNotes?: string;
}): { entry?: CatchEntry; state?: CompetitionState; error?: string } {
  const state = getLocalCompetitionState();
  const currentUser = state.members.find((m) => m.id === payload.currentUserId);
  const targetMember = state.members.find((m) => m.id === payload.targetMemberId);

  if (!currentUser || !targetMember) {
    return { error: 'Nevažeći korisnik ili član natjecanja.' };
  }

  const canEdit =
    currentUser.id === 'daniel'
      ? targetMember.id === 'daniel' || targetMember.id === 'dida'
      : currentUser.id === targetMember.id;

  if (!canEdit) {
    return {
      error: `Nemate ovlasti za unos ulova za člana ${targetMember.name}. Samo Daniel može unositi za Didu.`,
    };
  }

  const squids = Math.max(0, Number(payload.squidCount) || 0);
  const cuttles = Math.max(0, Number(payload.cuttlefishCount) || 0);
  const sWeight = Math.max(0, Number(payload.squidWeightKg) || 0);
  const cWeight = Math.max(0, Number(payload.cuttlefishWeightKg) || 0);
  const bigGrams = Math.max(0, Number(payload.biggestCatchGrams) || 0);

  const existingIndex = state.entries.findIndex(
    (e) => e.memberId === payload.targetMemberId && e.date === payload.date
  );

  const entryObj: CatchEntry = {
    id: existingIndex >= 0 ? state.entries[existingIndex].id : `${payload.targetMemberId}-${payload.date}-${Date.now()}`,
    memberId: targetMember.id,
    memberName: targetMember.name,
    date: payload.date,
    squidCount: squids,
    cuttlefishCount: cuttles,
    totalCatch: squids + cuttles,
    squidWeightKg: sWeight,
    cuttlefishWeightKg: cWeight,
    biggestCatchGrams: bigGrams,
    locationNotes: payload.locationNotes || '',
    lureNotes: payload.lureNotes || '',
    updatedBy: currentUser.name,
    updatedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    state.entries[existingIndex] = entryObj;
  } else {
    state.entries.push(entryObj);
  }

  state.lastUpdate = new Date().toISOString();
  saveLocalCompetitionState(state);

  return { entry: entryObj, state };
}

/**
 * Local fallback handler for deleting an entry inside mobile APK
 */
export function deleteCatchEntryLocally(
  entryId: string,
  currentUserId: string
): { state?: CompetitionState; error?: string } {
  const state = getLocalCompetitionState();
  const entryIndex = state.entries.findIndex((e) => e.id === entryId);
  if (entryIndex === -1) {
    return { error: 'Zapis nije pronađen.' };
  }
  const entry = state.entries[entryIndex];
  const isAllowed =
    currentUserId === 'daniel' ||
    entry.memberId === currentUserId ||
    (currentUserId === 'daniel' && entry.memberId === 'dida');

  if (!isAllowed) {
    return { error: 'Nemate ovlasti za brisanje ovog unosa.' };
  }

  state.entries.splice(entryIndex, 1);
  state.lastUpdate = new Date().toISOString();
  saveLocalCompetitionState(state);
  return { state };
}

/**
 * Local fallback for AI Solunar tactical forecast when offline or inside standalone APK
 */
export function getLocalAISolunarAdvice(targetDate: string, targetSpecies: string): AISolunarAdvice {
  const speciesLabel =
    targetSpecies === 'lignje'
      ? 'lignje'
      : targetSpecies === 'sipe'
      ? 'sipe'
      : 'lignje i sipe';

  return {
    summary: `Za datum ${targetDate} u akvatoriju Novog Vinodolskog očekuje se izražen solunarni prijelaz u sumrak. Temperatura mora u kanalu (oko 15°C) i umjeren kurenat stvaraju vrhunske uvjete za ${speciesLabel} uz rubove brakova i vanjski lukobran.`,
    primeBiteHoursSquid: '16:45 – 20:15 (Glavni večernji cug u sumrak) i 06:00 – 07:30 (Zora)',
    primeBiteHoursCuttlefish: '06:30 – 09:30 i 14:45 – 17:15 (Prijelaz svjetla uz pjeskovito-travnato dno)',
    recommendedTactics: [
      'Sumrak (16:45 - 18:30): Koristite skosavice veličine 2.5 i 3.0 u crvenoj, pink i narančastoj boji (DTD Bijela Glavoc / Yamashita Warm Jacket) na dubini 12–20 m.',
      'Noćni lov pod lampom: Prijeđite na tataki tehniku ili peškafondo s fosfornim tijelom uz lagano podizanje 1 metar od dna.',
      'Za sipe: Držite skosavicu na samom dnu uz sporo povlačenje i pauze od 5 sekundi na prijelazu pijeska i posidonije.',
    ],
    secretSpotTip:
      'Vanjski rub lukobrana u Novom Vinodolskom i potez prema otočiću Sveti Marin na dubini od 14 do 18 metara pri prvom mraku.',
    solunarIndex: 92,
    funMotivationalQuote:
      'Kad bura kalma u Vinodolskom kanalu, peškafondo tone, a kante se pune – mirno more ekipi Daniel, Dida, Tuna i Silvio!',
  };
}
