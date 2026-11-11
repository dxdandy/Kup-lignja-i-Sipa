import React, { useState, useEffect } from 'react';
import { SolunarDayForecast, AISolunarAdvice } from '../types';
import { apiUrl } from '../utils/api';
import {
  Moon,
  Sun,
  Clock,
  Compass,
  Sparkles,
  MapPin,
  RefreshCw,
  Waves,
  Zap,
  Info,
  Calendar,
  CheckCircle,
} from 'lucide-react';

const FALLBACK_FORECASTS: SolunarDayForecast[] = [
  {
    horizon: '24h',
    date: '2026-11-18',
    dayName: 'Srijeda (Dan 1)',
    moonPhaseName: 'Prva četvrt (Rastući mjesec)',
    moonPhaseIcon: '🌓',
    moonIlluminationPercent: 52,
    overallScore: 88,
    overallRating: 'Izvrsno',
    majorPeriod1: { start: '05:45', end: '07:45', description: 'Glavni period 1 (Major)', score: 92 },
    majorPeriod2: { start: '17:15', end: '19:30', description: 'Glavni period 2 (Major)', score: 96 },
    minorPeriod1: { start: '11:30', end: '12:45', description: 'Sporedni period 1 (Minor)', score: 70 },
    minorPeriod2: { start: '23:30', end: '00:45', description: 'Sporedni period 2 (Minor)', score: 78 },
    primeSquidTime: '16:45 - 20:30 (Prvi mrak i tranzit Mjeseca)',
    primeCuttlefishTime: '06:15 - 09:30 & 15:00 - 17:30 (Prijelaz svjetla uz plićak)',
    sunTimes: { sunrise: '07:05', sunset: '16:38', civilDusk: '17:10', civilDawn: '06:32' },
    moonTimes: { moonrise: '12:45', moonset: '01:10', overhead: '18:50', underfoot: '06:25' },
    seaConditionsAdvice: 'Vinodolski kanal miran do umjerena bura u opadanju, idealna prozirnost mora za skosavice.',
  },
  {
    horizon: '48h',
    date: '2026-11-19',
    dayName: 'Četvrtak (Dan 2)',
    moonPhaseName: 'Izbočeni mjesec',
    moonPhaseIcon: '🌔',
    moonIlluminationPercent: 64,
    overallScore: 94,
    overallRating: 'Izvrsno',
    majorPeriod1: { start: '06:30', end: '08:30', description: 'Glavni period 1 (Major)', score: 94 },
    majorPeriod2: { start: '18:00', end: '20:15', description: 'Glavni period 2 (Major)', score: 98 },
    minorPeriod1: { start: '12:15', end: '13:30', description: 'Sporedni period 1 (Minor)', score: 75 },
    minorPeriod2: { start: '00:15', end: '01:30', description: 'Sporedni period 2 (Minor)', score: 82 },
    primeSquidTime: '17:15 - 21:00 (Najjači večernji skok liganja)',
    primeCuttlefishTime: '07:00 - 10:00 & 15:30 - 18:00 (Obala i plićak)',
    sunTimes: { sunrise: '07:07', sunset: '16:37', civilDusk: '17:09', civilDawn: '06:33' },
    moonTimes: { moonrise: '13:20', moonset: '02:15', overhead: '19:40', underfoot: '07:15' },
    seaConditionsAdvice: 'Stabilan zračni pritisak, izvrstan cug pri smiraju dana (sumrak).',
  },
  {
    horizon: '72h',
    date: '2026-11-20',
    dayName: 'Petak (Dan 3)',
    moonPhaseName: 'Rastući izbočeni mjesec',
    moonPhaseIcon: '🌔',
    moonIlluminationPercent: 75,
    overallScore: 91,
    overallRating: 'Izvrsno',
    majorPeriod1: { start: '07:15', end: '09:15', description: 'Glavni period 1 (Major)', score: 90 },
    majorPeriod2: { start: '18:45', end: '21:00', description: 'Glavni period 2 (Major)', score: 95 },
    minorPeriod1: { start: '13:00', end: '14:15', description: 'Sporedni period 1 (Minor)', score: 72 },
    minorPeriod2: { start: '01:00', end: '02:15', description: 'Sporedni period 2 (Minor)', score: 80 },
    primeSquidTime: '17:45 - 21:30 (Večernji lov pod mjesečinom)',
    primeCuttlefishTime: '07:30 - 10:30 & 16:00 - 18:15 (Travnati brakovi)',
    sunTimes: { sunrise: '07:08', sunset: '16:36', civilDusk: '17:08', civilDawn: '06:35' },
    moonTimes: { moonrise: '13:55', moonset: '03:20', overhead: '20:30', underfoot: '08:05' },
    seaConditionsAdvice: 'Odlična vidljivost, preporučuju se tamnije i prirodne boje skosavica.',
  },
];

export const SolunarCalculator: React.FC = () => {
  const [selectedHorizon, setSelectedHorizon] = useState<number>(0); // 0 = 24h, 1 = 48h, 2 = 72h
  const [forecasts, setForecasts] = useState<SolunarDayForecast[]>(FALLBACK_FORECASTS);
  const [isLoadingForecast, setIsLoadingForecast] = useState<boolean>(false);

  // AI Advice state
  const [aiAdvice, setAiAdvice] = useState<AISolunarAdvice | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState<boolean>(false);
  const [aiSpeciesFocus, setAiSpeciesFocus] = useState<'lignje_i_sipe' | 'lignje' | 'sipe'>('lignje_i_sipe');

  // Fetch Solunar data
  const fetchSolunar = async () => {
    setIsLoadingForecast(true);
    try {
      const res = await fetch(apiUrl('/api/solunar'));
      if (res.ok) {
        const data = await res.json();
        if (data.forecasts && data.forecasts.length > 0) {
          setForecasts(data.forecasts);
        }
      }
    } catch (err) {
      console.warn('Greška pri dohvaćanju solunarnih podataka (koriste se lokalni izračuni):', err);
    } finally {
      setIsLoadingForecast(false);
    }
  };

  // Fetch Google AI Gemini advice
  const fetchAiAdvice = async () => {
    setIsLoadingAI(true);
    try {
      const currentForecast = forecasts[selectedHorizon];
      const res = await fetch(apiUrl('/api/ai-solunar-forecast'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetDate: currentForecast?.date || '2026-11-18',
          targetSpecies: aiSpeciesFocus,
          weatherNote: 'Jesensko more u Vinodolskom kanalu, temperatura 15°C, umjeren kurenat',
        }),
      });
      const data = await res.json();
      if (data.data) {
        setAiAdvice(data.data);
      }
    } catch (err) {
      console.warn('Greška pri dohvaćanju AI analize:', err);
    } finally {
      setIsLoadingAI(false);
    }
  };

  useEffect(() => {
    fetchSolunar();
  }, []);

  // Fetch initial AI advice once solunar loads
  useEffect(() => {
    if (forecasts.length > 0 && !aiAdvice) {
      fetchAiAdvice();
    }
  }, [forecasts]);

  const activeForecast = forecasts[selectedHorizon];

  return (
    <div className="space-y-6">
      {/* Location & Title Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/70 to-slate-950 border border-indigo-900/40 p-4 sm:p-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 text-xs font-semibold mb-2">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              Novi Vinodolski • 45.1278° N, 14.7892° E
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>🌙</span>
              <span>Solunarni Kalkulator za Lignje i Sipe</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Solunarna teorija (John Alden Knight) u kombinaciji s astronomskim položajem Mjeseca u Vinodolskom kanalu i Google AI analizom za optimalne sate griza.
            </p>
          </div>

          {/* Quick AI Trigger */}
          <button
            onClick={fetchAiAdvice}
            disabled={isLoadingAI}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-cyan-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] shrink-0"
          >
            <Sparkles className={`w-4 h-4 ${isLoadingAI ? 'animate-spin' : ''}`} />
            <span>{isLoadingAI ? 'Google AI Analizira...' : 'Osvježi Google AI Savjet'}</span>
          </button>
        </div>

        {/* 24h / 48h / 72h Horizon Switcher */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-indigo-950/80 overflow-x-auto no-scrollbar">
          {forecasts.map((fc, idx) => (
            <button
              key={fc.horizon}
              onClick={() => setSelectedHorizon(idx)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                selectedHorizon === idx
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25'
                  : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span>{fc.moonPhaseIcon}</span>
              <span>{fc.horizon}</span>
              <span className="text-[11px] opacity-80 font-mono">({fc.date.split('-').slice(1).reverse().join('.')})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Solunar Cards for Selected Day */}
      {activeForecast && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Column 1: Moon & Sun Astro Overview */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Moon className="w-5 h-5 text-cyan-400" />
                <h3 className="font-extrabold text-white text-base">Mjesečeve Mijene</h3>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                {activeForecast.overallRating}
              </span>
            </div>

            {/* Moon Phase Visual */}
            <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 text-center relative overflow-hidden">
              <div className="text-5xl my-2 animate-pulse">{activeForecast.moonPhaseIcon}</div>
              <div className="font-bold text-white text-sm">{activeForecast.moonPhaseName}</div>
              <div className="text-xs text-cyan-300 font-mono mt-1">
                Osvijetljenost Mjeseca: {activeForecast.moonIlluminationPercent}%
              </div>

              {/* Solunar Overall Score Gauge */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">Solunarni Index Griza:</span>
                <span className="text-xl font-black font-mono text-cyan-400">
                  {activeForecast.overallScore} / 100
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-1.5">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full rounded-full"
                  style={{ width: `${activeForecast.overallScore}%` }}
                />
              </div>
            </div>

            {/* Sun & Moon Times */}
            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Sun className="w-4 h-4 text-amber-400" />
                  Izlazak / Zalazak Sunca:
                </span>
                <span className="font-mono font-bold text-slate-200">
                  {activeForecast.sunTimes.sunrise} / {activeForecast.sunTimes.sunset}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-900/40 flex items-center justify-between">
                <span className="text-cyan-300 flex items-center gap-1.5 font-semibold">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  "Prvi mrak" (Sumrak za lignje):
                </span>
                <span className="font-mono font-bold text-cyan-300">
                  {activeForecast.sunTimes.civilDusk}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Moon className="w-4 h-4 text-indigo-400" />
                  Gornja kulminacija (Overhead):
                </span>
                <span className="font-mono font-bold text-slate-200">
                  {activeForecast.moonTimes.overhead}
                </span>
              </div>
            </div>
          </div>

          {/* Column 2: Solunar Windows & Peak Bite Hours */}
          <div className="lg:col-span-2 rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-400" />
                <h3 className="font-extrabold text-white text-base">
                  Glavni i Sporedni Solunarni Periodi ({activeForecast.dayName})
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">Novi Vinodolski</span>
            </div>

            {/* Targeted Squid vs Cuttlefish Highlight Boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* LIGNJA */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-950/70 to-slate-950 border border-cyan-700/60 shadow">
                <div className="flex items-center justify-between">
                  <span className="font-black text-white text-sm flex items-center gap-1.5">
                    <span>🦑</span>
                    <span>LIGNJA (Kalamar)</span>
                  </span>
                  <span className="text-[10px] bg-cyan-900/80 text-cyan-300 font-bold px-2 py-0.5 rounded-full">
                    Sumrak & Noć
                  </span>
                </div>
                <div className="text-base font-black font-mono text-cyan-300 mt-2">
                  {activeForecast.primeSquidTime}
                </div>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  Lignja kreće u napad čim padne prvi sumrak ("prvi mrak"). Koristiti lakše skose uz obalu i peškafondo na 25-35m dubine u kanalu.
                </p>
              </div>

              {/* SIPA */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/70 to-slate-950 border border-emerald-700/60 shadow">
                <div className="flex items-center justify-between">
                  <span className="font-black text-white text-sm flex items-center gap-1.5">
                    <span>🦐</span>
                    <span>SIPA (Sepia)</span>
                  </span>
                  <span className="text-[10px] bg-emerald-900/80 text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                    Jutro & Dan
                  </span>
                </div>
                <div className="text-base font-black font-mono text-emerald-300 mt-2">
                  {activeForecast.primeCuttlefishTime}
                </div>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  Sipa lovi uz samo dno po danjem svjetlu, u ranu zoru i prije sumraka. Vući varalicu po pjeskovito-kamenitom dnu na 10-18m uvale.
                </p>
              </div>
            </div>

            {/* 4 Solunar Time Windows */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-xs">
              {/* Major 1 */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-cyan-900/50">
                <div className="flex items-center justify-between text-cyan-400 font-bold">
                  <span>⭐ Glavni Period #1</span>
                  <span className="font-mono">{activeForecast.majorPeriod1.start} - {activeForecast.majorPeriod1.end}</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1">
                  {activeForecast.majorPeriod1.description}
                </p>
              </div>

              {/* Major 2 */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-cyan-900/50">
                <div className="flex items-center justify-between text-cyan-400 font-bold">
                  <span>⭐ Glavni Period #2</span>
                  <span className="font-mono">{activeForecast.majorPeriod2.start} - {activeForecast.majorPeriod2.end}</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1">
                  {activeForecast.majorPeriod2.description}
                </p>
              </div>

              {/* Minor 1 */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center justify-between text-slate-300 font-bold">
                  <span>🌙 Sporedni Period #1</span>
                  <span className="font-mono">{activeForecast.minorPeriod1.start} - {activeForecast.minorPeriod1.end}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {activeForecast.minorPeriod1.description}
                </p>
              </div>

              {/* Minor 2 */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center justify-between text-slate-300 font-bold">
                  <span>🌙 Sporedni Period #2</span>
                  <span className="font-mono">{activeForecast.minorPeriod2.start} - {activeForecast.minorPeriod2.end}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {activeForecast.minorPeriod2.description}
                </p>
              </div>
            </div>

            {/* Maritime Sea Conditions Advice */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2 text-xs text-slate-300">
              <Waves className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>{activeForecast.seaConditionsAdvice}</span>
            </div>
          </div>
        </div>
      )}

      {/* Google AI Gemini Intelligence Panel */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-950/50 via-slate-900 to-cyan-950/40 border border-indigo-700/50 p-5 sm:p-7 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-indigo-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-white text-base sm:text-lg flex items-center gap-2">
                <span>Google AI Kapetanski Savjetnik</span>
                <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded-full font-mono">
                  Gemini 3.8 Flash
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Stručni savjeti prilagođeni za Vinodolski kanal i ekipu (Daniel, Dida, Tuna, Silvio)
              </p>
            </div>
          </div>

          {/* Species toggle for AI prompt */}
          <div className="flex items-center gap-1 p-1 bg-slate-950/80 rounded-xl border border-slate-800 self-start sm:self-auto text-xs font-semibold">
            <button
              onClick={() => {
                setAiSpeciesFocus('lignje_i_sipe');
              }}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                aiSpeciesFocus === 'lignje_i_sipe' ? 'bg-indigo-600 text-white' : 'text-slate-400'
              }`}
            >
              Lignje & Sipe
            </button>
            <button
              onClick={() => {
                setAiSpeciesFocus('lignje');
              }}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                aiSpeciesFocus === 'lignje' ? 'bg-cyan-600 text-white' : 'text-slate-400'
              }`}
            >
              Samo Lignje
            </button>
            <button
              onClick={() => {
                setAiSpeciesFocus('sipe');
              }}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                aiSpeciesFocus === 'sipe' ? 'bg-emerald-600 text-white' : 'text-slate-400'
              }`}
            >
              Samo Sipe
            </button>
          </div>
        </div>

        {/* AI Results */}
        {isLoadingAI ? (
          <div className="py-12 text-center">
            <Sparkles className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-white">Google AI analizira solunarne podatke za Novi Vinodolski...</p>
            <p className="text-xs text-slate-400 mt-1">Usklađivanje položaja Mjeseca, dubina i kurenta u kanalu</p>
          </div>
        ) : aiAdvice ? (
          <div className="mt-5 space-y-5">
            {/* Captain's Summary */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-indigo-900/60">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 block mb-1">
                Kapetanska Poruka za Natjecanje:
              </span>
              <p className="text-sm sm:text-base text-slate-100 font-medium leading-relaxed">
                "{aiAdvice.summary}"
              </p>
            </div>

            {/* Prime Hours Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-cyan-900/50">
                <span className="text-xs text-cyan-300 font-semibold block">
                  🦑 AI Preporučeni sati za Lignju:
                </span>
                <span className="text-base font-black font-mono text-white mt-1 block">
                  {aiAdvice.primeBiteHoursSquid}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-emerald-900/50">
                <span className="text-xs text-emerald-300 font-semibold block">
                  🦐 AI Preporučeni sati za Sipu:
                </span>
                <span className="text-base font-black font-mono text-white mt-1 block">
                  {aiAdvice.primeBiteHoursCuttlefish}
                </span>
              </div>
            </div>

            {/* Tactics List */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-2">
                4 Ključne Taktike za Novi Vinodolski:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {aiAdvice.recommendedTactics.map((tactic, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 text-xs text-slate-200 flex items-start gap-2"
                  >
                    <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>{tactic}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Secret Spot Tip */}
            {aiAdvice.secretSpotTip && (
              <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-800/50 flex items-start gap-2.5 text-xs">
                <MapPin className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-cyan-300 block mb-0.5">Lokalna mikrolokacija (Novi Vinodolski):</strong>
                  <span className="text-slate-300">{aiAdvice.secretSpotTip}</span>
                </div>
              </div>
            )}

            {/* Motivational Quote */}
            {aiAdvice.funMotivationalQuote && (
              <div className="text-center pt-2 text-xs italic text-amber-300/90">
                ⚓ {aiAdvice.funMotivationalQuote}
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-400">
            Kliknite "Osvježi Google AI Savjet" za preuzimanje analize.
          </div>
        )}
      </div>
    </div>
  );
};
