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
  biggestCatchGrams?: number; // Najveći primjerak / kapitalac u g
  locationNotes?: string;
  lureNotes?: string;
  updatedBy: string;
  updatedAt: string;
}

export interface CompetitionState {
  competitionName: string;
  location: string;
  startDate: string;
  endDate: string;
  members: Member[];
  entries: CatchEntry[];
  lastUpdate: string;
}

export interface SolunarPeriod {
  start: string;
  end: string;
  description: string;
  score: number;
}

export interface SolunarDayForecast {
  horizon: string;
  date: string;
  dayName: string;
  moonPhaseName: string;
  moonPhaseIcon: string;
  moonIlluminationPercent: number;
  overallScore: number;
  overallRating: 'Izvrsno' | 'Vrlo Dobro' | 'Dobro' | 'Prosječno';
  majorPeriod1: SolunarPeriod;
  majorPeriod2: SolunarPeriod;
  minorPeriod1: SolunarPeriod;
  minorPeriod2: SolunarPeriod;
  primeSquidTime: string;
  primeCuttlefishTime: string;
  sunTimes: {
    sunrise: string;
    sunset: string;
    civilDusk: string;
    civilDawn: string;
  };
  moonTimes: {
    moonrise: string;
    moonset: string;
    overhead: string;
    underfoot: string;
  };
  seaConditionsAdvice: string;
}

export interface AISolunarAdvice {
  summary: string;
  primeBiteHoursSquid: string;
  primeBiteHoursCuttlefish: string;
  recommendedTactics: string[];
  secretSpotTip: string;
  solunarIndex: number;
  funMotivationalQuote: string;
}
