import React, { useState, useEffect } from 'react';
import { CompetitionState, Member, CatchEntry } from '../types';
import { apiUrl, parseJsonIfValid, saveCatchEntryLocally, saveLocalCompetitionState } from '../utils/api';
import confetti from 'canvas-confetti';
import {
  Save,
  Plus,
  Minus,
  Sparkles,
  Calendar,
  MapPin,
  Anchor,
  Scale,
  CheckCircle,
  AlertTriangle,
  Lock,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';

interface DailyCatchFormProps {
  state: CompetitionState;
  currentUser: Member | null;
  initialMemberId?: string;
  onSaveSuccess: () => void;
  onOpenLogin: () => void;
}

export const DailyCatchForm: React.FC<DailyCatchFormProps> = ({
  state,
  currentUser,
  initialMemberId,
  onSaveSuccess,
  onOpenLogin,
}) => {
  // Pre-configured tournament dates
  const competitionDates = [
    { date: '2026-11-18', label: '18.11.2026 (Dan 1 - Srijeda)' },
    { date: '2026-11-19', label: '19.11.2026 (Dan 2 - Četvrtak)' },
    { date: '2026-11-20', label: '20.11.2026 (Dan 3 - Petak)' },
    { date: '2026-11-21', label: '21.11.2026 (Dan 4 - Subota)' },
    { date: '2026-11-22', label: '22.11.2026 (Dan 5 - Nedjelja)' },
  ];

  // Default target member:
  // If currentUser is Daniel and initialMemberId is passed (e.g. 'dida'), use it, otherwise currentUser.id
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    initialMemberId || currentUser?.id || 'daniel'
  );

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date().toISOString().split('T')[0];
    const isTournament = competitionDates.some((d) => d.date === today);
    return isTournament ? today : '2026-11-18';
  });

  const [squidCount, setSquidCount] = useState<number>(0);
  const [cuttlefishCount, setCuttlefishCount] = useState<number>(0);
  const [squidWeightKg, setSquidWeightKg] = useState<string>('');
  const [cuttlefishWeightKg, setCuttlefishWeightKg] = useState<string>('');
  const [biggestCatchGrams, setBiggestCatchGrams] = useState<string>('');
  const [locationNotes, setLocationNotes] = useState<string>('Novi Vinodolski - vanjski lukobran');
  const [lureNotes, setLureNotes] = useState<string>('Peškafondo + crvena DTD skosa');

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync with currentUser when user changes
  useEffect(() => {
    if (currentUser) {
      if (initialMemberId && (currentUser.id === 'daniel' || currentUser.id === initialMemberId)) {
        setSelectedMemberId(initialMemberId);
      } else {
        setSelectedMemberId(currentUser.id);
      }
    }
  }, [currentUser, initialMemberId]);

  // Load existing entry for this member and date if already present
  useEffect(() => {
    const existing = state.entries.find(
      (e) => e.memberId === selectedMemberId && e.date === selectedDate
    );

    if (existing) {
      setSquidCount(existing.squidCount || 0);
      setCuttlefishCount(existing.cuttlefishCount || 0);
      setSquidWeightKg(existing.squidWeightKg ? existing.squidWeightKg.toString() : '');
      setCuttlefishWeightKg(existing.cuttlefishWeightKg ? existing.cuttlefishWeightKg.toString() : '');
      setBiggestCatchGrams(existing.biggestCatchGrams ? existing.biggestCatchGrams.toString() : '');
      if (existing.locationNotes) setLocationNotes(existing.locationNotes);
      if (existing.lureNotes) setLureNotes(existing.lureNotes);
    } else {
      // Clear for new entry
      setSquidCount(0);
      setCuttlefishCount(0);
      setSquidWeightKg('');
      setCuttlefishWeightKg('');
      setBiggestCatchGrams('');
    }
  }, [selectedMemberId, selectedDate, state.entries]);

  // Permission validation
  const canEditSelected = (() => {
    if (!currentUser) return false;
    if (currentUser.id === 'daniel') return true; // Daniel is admin and can edit himself and Dida (and all)
    return currentUser.id === selectedMemberId; // Tuna can only edit Tuna, Silvio only Silvio
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenLogin();
      return;
    }

    if (!canEditSelected) {
      setFeedbackMessage({
        type: 'error',
        text: 'Nemate ovlasti uređivati tuđe unose! Svatko može uređivati samo svoju tablicu.',
      });
      return;
    }

    setIsSaving(true);
    setFeedbackMessage(null);

    const payload = {
      currentUserId: currentUser.id,
      targetMemberId: selectedMemberId,
      date: selectedDate,
      squidCount,
      cuttlefishCount,
      squidWeightKg: squidWeightKg ? parseFloat(squidWeightKg) : 0,
      cuttlefishWeightKg: cuttlefishWeightKg ? parseFloat(cuttlefishWeightKg) : 0,
      biggestCatchGrams: biggestCatchGrams ? parseInt(biggestCatchGrams, 10) : 0,
      locationNotes,
      lureNotes,
    };

    try {
      let savedViaServer = false;
      try {
        const response = await fetch(apiUrl('/api/entry'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await parseJsonIfValid(response);
        if (data?.success && data?.state) {
          saveLocalCompetitionState(data.state);
          savedViaServer = true;
        } else if (response.status === 403 || response.status === 400) {
          const errData = await response.json().catch(() => ({}));
          if (errData.error) {
            throw new Error(errData.error);
          }
        }
      } catch (fetchErr: any) {
        if (fetchErr?.message?.includes('ovlasti')) {
          throw fetchErr;
        }
      }

      if (!savedViaServer) {
        const localRes = saveCatchEntryLocally(payload);
        if (localRes.error) {
          throw new Error(localRes.error);
        }
      }

      // Trigger celebration confetti
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#06b6d4', '#3b82f6', '#10b981', '#f59e0b'],
        });
      } catch {
        // ignore if canvas-confetti fails
      }

      setFeedbackMessage({
        type: 'success',
        text: `Ulov za ${state.members.find((m) => m.id === selectedMemberId)?.name} (${selectedDate}) je uspješno spremljen!`,
      });

      onSaveSuccess();
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Greška pri spremanju ulova.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const currentMemberObj = state.members.find((m) => m.id === selectedMemberId);
  const totalCatches = squidCount + cuttlefishCount;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Login Requirement Banner if not logged in */}
      {!currentUser && (
        <div className="rounded-2xl bg-gradient-to-r from-cyan-950 via-slate-900 to-blue-950 border border-cyan-800 p-5 text-center shadow-xl">
          <Lock className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
          <h3 className="text-lg font-bold text-white">Prijava je obavezna za unos ulova</h3>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-md mx-auto">
            Svatko unosi isključivo svoje podatke. Daniel unosi i za Didu jer Dida nema pametni telefon.
          </p>
          <button
            onClick={onOpenLogin}
            className="mt-4 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/30 transition-transform active:scale-95"
          >
            Odaberi svoj profil i prijavi se
          </button>
        </div>
      )}

      {/* Main Entry Card */}
      <div className="relative rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl p-4 sm:p-7 overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
              <span>🎣</span>
              <span>Dnevni Unos Ulova</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Unesi broj liganja i sipa na kraju ribolovnog dana
            </p>
          </div>

          {currentUser && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-cyan-300 text-xs font-semibold">
              <UserCheck className="w-3.5 h-3.5" />
              <span>{currentUser.name}</span>
            </div>
          )}
        </div>

        {/* Member Selector: Daniel has permission to switch between Daniel and Dida */}
        {currentUser && (
          <div className="mt-5">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Kome unosiš ulov?
            </label>

            {currentUser.id === 'daniel' ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {state.members.map((m) => {
                  const isSelected = selectedMemberId === m.id;
                  const isDida = m.id === 'dida';
                  const isDaniel = m.id === 'daniel';

                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMemberId(m.id)}
                      className={`relative p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-gradient-to-br from-cyan-950 to-blue-950 border-cyan-500 text-white shadow-md shadow-cyan-500/20'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-sm">{m.name}</div>
                        {isDida && (
                          <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800 px-1 rounded">
                            Bez mobitela
                          </span>
                        )}
                        {isDaniel && (
                          <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-1 rounded">
                            Ti (Admin)
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {isDida ? 'Unos u ime Dide' : m.boatName}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg bg-gradient-to-br ${currentUser.avatarColor} flex items-center justify-center text-xs font-bold text-white`}
                  >
                    {currentUser.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white">{currentUser.name}</div>
                    <div className="text-xs text-slate-400">
                      Svatko uređuje samo svoju tablicu (prava zaključana za tvoj račun)
                    </div>
                  </div>
                </div>
                <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Tvoj profil</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Date Selection */}
        <div className="mt-5">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <span>Datum ribolovnog dana</span>
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {competitionDates.map((d) => (
              <button
                key={d.date}
                type="button"
                onClick={() => setSelectedDate(d.date)}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                  selectedDate === d.date
                    ? 'bg-cyan-600 border-cyan-400 text-white shadow-md'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <div>{d.date.split('-').slice(1).reverse().join('.')}</div>
                <div className="text-[10px] opacity-80">{d.label.split('(')[1]?.replace(')', '')}</div>
              </button>
            ))}
          </div>

          <div className="mt-2 flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 font-mono"
            />
            <span className="text-[11px] text-slate-500">Ili odaberi proizvoljan datum / danas</span>
          </div>
        </div>

        {/* Catch Counters: Big Boat-Friendly Touch UI */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. LIGNJE (Squid) */}
            <div className="rounded-2xl bg-gradient-to-br from-cyan-950/40 to-slate-950 border border-cyan-800/60 p-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🦑</span>
                  <div>
                    <h3 className="font-extrabold text-white text-base">Lignje</h3>
                    <span className="text-[11px] text-cyan-300">Broj ulovljenih komada</span>
                  </div>
                </div>
              </div>

              {/* Big Touch Controls */}
              <div className="mt-4 flex items-center justify-between bg-slate-900/90 rounded-2xl p-2 border border-cyan-900/60">
                <button
                  type="button"
                  onClick={() => setSquidCount((prev) => Math.max(0, prev - 1))}
                  className="w-12 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 flex items-center justify-center font-bold transition-all shadow"
                >
                  <Minus className="w-5 h-5" />
                </button>

                <div className="text-center px-4">
                  <input
                    type="number"
                    min="0"
                    value={squidCount}
                    onChange={(e) => setSquidCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-20 text-center font-mono font-black text-3xl sm:text-4xl text-cyan-400 bg-transparent focus:outline-none"
                  />
                  <div className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                    komada
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSquidCount((prev) => prev + 1)}
                  className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:scale-95 text-white flex items-center justify-center font-bold transition-all shadow-lg shadow-cyan-500/25"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Jump Buttons (+5, +10) */}
              <div className="flex items-center gap-1.5 mt-2 justify-end">
                <button
                  type="button"
                  onClick={() => setSquidCount((prev) => prev + 5)}
                  className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-cyan-300 hover:bg-slate-700 font-mono"
                >
                  +5 kom
                </button>
                <button
                  type="button"
                  onClick={() => setSquidCount((prev) => prev + 10)}
                  className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-cyan-300 hover:bg-slate-700 font-mono"
                >
                  +10 kom
                </button>
              </div>

              {/* Optional Squid Weight */}
              <div className="mt-3 pt-3 border-t border-cyan-950/80 flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5 text-cyan-400" />
                  Ukupna težina liganja:
                </span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="npr. 1.8"
                    value={squidWeightKg}
                    onChange={(e) => setSquidWeightKg(e.target.value)}
                    className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-right text-xs text-white font-mono"
                  />
                  <span className="text-slate-400">kg</span>
                </div>
              </div>
            </div>

            {/* 2. SIPE (Cuttlefish) */}
            <div className="rounded-2xl bg-gradient-to-br from-emerald-950/40 to-slate-950 border border-emerald-800/60 p-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🦐</span>
                  <div>
                    <h3 className="font-extrabold text-white text-base">Sipe</h3>
                    <span className="text-[11px] text-emerald-300">Broj ulovljenih komada</span>
                  </div>
                </div>
              </div>

              {/* Big Touch Controls */}
              <div className="mt-4 flex items-center justify-between bg-slate-900/90 rounded-2xl p-2 border border-emerald-900/60">
                <button
                  type="button"
                  onClick={() => setCuttlefishCount((prev) => Math.max(0, prev - 1))}
                  className="w-12 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 flex items-center justify-center font-bold transition-all shadow"
                >
                  <Minus className="w-5 h-5" />
                </button>

                <div className="text-center px-4">
                  <input
                    type="number"
                    min="0"
                    value={cuttlefishCount}
                    onChange={(e) =>
                      setCuttlefishCount(Math.max(0, parseInt(e.target.value, 10) || 0))
                    }
                    className="w-20 text-center font-mono font-black text-3xl sm:text-4xl text-emerald-400 bg-transparent focus:outline-none"
                  />
                  <div className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                    komada
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setCuttlefishCount((prev) => prev + 1)}
                  className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:scale-95 text-white flex items-center justify-center font-bold transition-all shadow-lg shadow-emerald-500/25"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Jump Buttons */}
              <div className="flex items-center gap-1.5 mt-2 justify-end">
                <button
                  type="button"
                  onClick={() => setCuttlefishCount((prev) => prev + 3)}
                  className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-emerald-300 hover:bg-slate-700 font-mono"
                >
                  +3 kom
                </button>
                <button
                  type="button"
                  onClick={() => setCuttlefishCount((prev) => prev + 5)}
                  className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-emerald-300 hover:bg-slate-700 font-mono"
                >
                  +5 kom
                </button>
              </div>

              {/* Optional Cuttlefish Weight */}
              <div className="mt-3 pt-3 border-t border-emerald-950/80 flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5 text-emerald-400" />
                  Ukupna težina sipa:
                </span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="npr. 0.9"
                    value={cuttlefishWeightKg}
                    onChange={(e) => setCuttlefishWeightKg(e.target.value)}
                    className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-right text-xs text-white font-mono"
                  />
                  <span className="text-slate-400">kg</span>
                </div>
              </div>
            </div>
          </div>

          {/* Combined Total Preview */}
          <div className="rounded-xl bg-slate-950 p-4 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400">Ukupan broj ulova za dan:</span>
              <div className="text-2xl font-black text-white font-mono">
                {totalCatches} <span className="text-sm font-normal text-slate-400">komada</span>
              </div>
            </div>

            {/* Biggest catch */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-300">Najveći komad (Kapitalac):</span>
              <input
                type="number"
                placeholder="npr. 480"
                value={biggestCatchGrams}
                onChange={(e) => setBiggestCatchGrams(e.target.value)}
                className="w-24 bg-slate-900 border border-amber-900/60 rounded-lg px-2.5 py-1.5 text-right text-sm text-amber-300 font-mono font-bold"
              />
              <span className="text-xs text-amber-400">grama</span>
            </div>
          </div>

          {/* Additional details: Location & Lures */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                Pozicija u Novom Vinodolskom
              </label>
              <input
                type="text"
                value={locationNotes}
                onChange={(e) => setLocationNotes(e.target.value)}
                placeholder="npr. Glavica, Povile, lukobran, 25m dubina"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1 flex items-center gap-1">
                <Anchor className="w-3.5 h-3.5 text-cyan-400" />
                Korištena varalica / peškafondo
              </label>
              <input
                type="text"
                value={lureNotes}
                onChange={(e) => setLureNotes(e.target.value)}
                placeholder="npr. DTD crveni cawboy, fosfor skosa"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Feedback Alerts */}
          {feedbackMessage && (
            <div
              className={`p-3.5 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2.5 ${
                feedbackMessage.type === 'success'
                  ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-200'
                  : 'bg-rose-950/80 border border-rose-800 text-rose-200'
              }`}
            >
              {feedbackMessage.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{feedbackMessage.text}</span>
            </div>
          )}

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isSaving || !canEditSelected}
              className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl transition-all ${
                canEditSelected
                  ? 'bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-cyan-500/25 active:scale-[0.99]'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Save className="w-5 h-5" />
              <span>
                {isSaving
                  ? 'Sinkronizacija u tijeku...'
                  : `Spremi ulov za: ${currentMemberObj?.name || 'člana'}`}
              </span>
            </button>

            {!canEditSelected && (
              <p className="text-center text-xs text-rose-400 mt-2 flex items-center justify-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Možete uređivati samo svoje podatke. Prijavite se s ispravnim računom.</span>
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
