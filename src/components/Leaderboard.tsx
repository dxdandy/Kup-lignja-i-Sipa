import React, { useState } from 'react';
import { CompetitionState, Member } from '../types';
import { Trophy, Award, Flame, Scale, Calendar, Sparkles, Plus, Fish, ChevronRight } from 'lucide-react';

interface LeaderboardProps {
  state: CompetitionState;
  currentUser: Member | null;
  onGoToEntry: (targetMemberId?: string) => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  state,
  currentUser,
  onGoToEntry,
}) => {
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('ALL');

  // Dates in the competition
  const competitionDates = [
    { date: '2026-11-18', label: '18.11. (Dan 1)' },
    { date: '2026-11-19', label: '19.11. (Dan 2)' },
    { date: '2026-11-20', label: '20.11. (Dan 3)' },
    { date: '2026-11-21', label: '21.11. (Dan 4)' },
    { date: '2026-11-22', label: '22.11. (Dan 5)' },
  ];

  // Filter entries
  const filteredEntries =
    selectedDateFilter === 'ALL'
      ? state.entries
      : state.entries.filter((e) => e.date === selectedDateFilter);

  // Aggregate stats per member
  const memberStats = state.members.map((member) => {
    const memberEntries = filteredEntries.filter((e) => e.memberId === member.id);
    const squidCount = memberEntries.reduce((sum, e) => sum + (e.squidCount || 0), 0);
    const cuttlefishCount = memberEntries.reduce((sum, e) => sum + (e.cuttlefishCount || 0), 0);
    const totalCatch = squidCount + cuttlefishCount;
    const squidWeightKg = memberEntries.reduce((sum, e) => sum + (e.squidWeightKg || 0), 0);
    const cuttlefishWeightKg = memberEntries.reduce((sum, e) => sum + (e.cuttlefishWeightKg || 0), 0);
    const totalWeightKg = Number((squidWeightKg + cuttlefishWeightKg).toFixed(2));
    const biggestCatchGrams = Math.max(0, ...memberEntries.map((e) => e.biggestCatchGrams || 0));

    // Days with catch
    const activeDays = new Set(memberEntries.filter((e) => e.totalCatch > 0).map((e) => e.date)).size;

    return {
      member,
      squidCount,
      cuttlefishCount,
      totalCatch,
      squidWeightKg: Number(squidWeightKg.toFixed(2)),
      cuttlefishWeightKg: Number(cuttlefishWeightKg.toFixed(2)),
      totalWeightKg,
      biggestCatchGrams,
      activeDays,
      entriesCount: memberEntries.length,
    };
  });

  // Sort by total catches descending, then total weight descending
  const sortedStats = [...memberStats].sort((a, b) => {
    if (b.totalCatch !== a.totalCatch) {
      return b.totalCatch - a.totalCatch;
    }
    return b.totalWeightKg - a.totalWeightKg;
  });

  const maxTotalCatch = Math.max(1, ...sortedStats.map((s) => s.totalCatch));

  // Overall competition totals
  const overallSquid = sortedStats.reduce((acc, s) => acc + s.squidCount, 0);
  const overallCuttlefish = sortedStats.reduce((acc, s) => acc + s.cuttlefishCount, 0);
  const overallAll = overallSquid + overallCuttlefish;
  const overallWeight = sortedStats.reduce((acc, s) => acc + s.totalWeightKg, 0).toFixed(1);

  // Find biggest catch of the tournament
  let tournamentBiggest = { grams: 0, memberName: '', date: '' };
  for (const entry of state.entries) {
    if (entry.biggestCatchGrams && entry.biggestCatchGrams > tournamentBiggest.grams) {
      tournamentBiggest = {
        grams: entry.biggestCatchGrams,
        memberName: entry.memberName,
        date: entry.date,
      };
    }
  }

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return {
          icon: '🥇',
          bg: 'from-amber-400 to-yellow-600',
          border: 'border-amber-400/60',
          text: 'text-amber-300',
          title: '1. Mjesto (Zlatna Lignja)',
        };
      case 1:
        return {
          icon: '🥈',
          bg: 'from-slate-300 to-slate-500',
          border: 'border-slate-300/60',
          text: 'text-slate-200',
          title: '2. Mjesto (Srebro)',
        };
      case 2:
        return {
          icon: '🥉',
          bg: 'from-amber-700 to-orange-800',
          border: 'border-amber-600/60',
          text: 'text-amber-400',
          title: '3. Mjesto (Bronca)',
        };
      default:
        return {
          icon: '🎖️',
          bg: 'from-slate-700 to-slate-800',
          border: 'border-slate-700',
          text: 'text-slate-400',
          title: '4. Mjesto',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Stats */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950/70 to-cyan-950/60 border border-cyan-800/40 p-4 sm:p-6 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-56 h-56 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-700/60 text-cyan-300 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Službena Tablica Natjecanja
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Kup Lignja & Sipa • Novi Vinodolski
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              Četiri ribolovca u borbi za naslov kralja Vinodolskog kanala: <span className="text-cyan-300 font-semibold">Dida</span>, <span className="text-blue-300 font-semibold">Tuna</span>, <span className="text-emerald-300 font-semibold">Silvio</span> i <span className="text-indigo-300 font-semibold">Daniel</span>.
            </p>
          </div>

          {/* Quick Log Button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onGoToEntry(currentUser?.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Unesi Današnji Ulov</span>
            </button>
          </div>
        </div>

        {/* Global Catch Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-cyan-900/40">
          <div className="bg-slate-950/60 border border-cyan-900/40 rounded-xl p-3">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Lignje ukupno</span>
              <span className="text-base">🦑</span>
            </div>
            <div className="text-2xl font-black text-cyan-400 font-mono mt-1">{overallSquid}</div>
            <div className="text-[11px] text-slate-400">komada ulovljeno</div>
          </div>

          <div className="bg-slate-950/60 border border-cyan-900/40 rounded-xl p-3">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Sipe ukupno</span>
              <span className="text-base">🦐</span>
            </div>
            <div className="text-2xl font-black text-emerald-400 font-mono mt-1">{overallCuttlefish}</div>
            <div className="text-[11px] text-slate-400">komada ulovljeno</div>
          </div>

          <div className="bg-slate-950/60 border border-cyan-900/40 rounded-xl p-3">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Ukupno ulova</span>
              <Flame className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono mt-1">{overallAll}</div>
            <div className="text-[11px] text-slate-400">ukupno komada ({overallWeight} kg)</div>
          </div>

          <div className="bg-slate-950/60 border border-cyan-900/40 rounded-xl p-3">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Kapitalac turnira</span>
              <Trophy className="w-4 h-4 text-yellow-400" />
            </div>
            <div className="text-2xl font-black text-amber-300 font-mono mt-1">
              {tournamentBiggest.grams > 0 ? `${tournamentBiggest.grams}g` : '—'}
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              {tournamentBiggest.memberName ? `Drži: ${tournamentBiggest.memberName}` : 'Čeka se ulov'}
            </div>
          </div>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 no-scrollbar">
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 rounded-xl border border-slate-800">
          <button
            onClick={() => setSelectedDateFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedDateFilter === 'ALL'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Ukupno (Svi Dani)
          </button>
          {competitionDates.map((d) => (
            <button
              key={d.date}
              onClick={() => setSelectedDateFilter(d.date)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                selectedDateFilter === d.date
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-400 hidden md:inline font-mono">
          Ažurirano: {new Date(state.lastUpdate).toLocaleTimeString('hr-HR')}
        </span>
      </div>

      {/* Top 3 Podium (Visual Representation) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4">
        {sortedStats.map((item, index) => {
          const badge = getRankBadge(index);
          const percent = maxTotalCatch > 0 ? Math.round((item.totalCatch / maxTotalCatch) * 100) : 0;
          const isCurrentUser = currentUser?.id === item.member.id;
          const isDidaManaged = currentUser?.id === 'daniel' && item.member.id === 'dida';

          return (
            <div
              key={item.member.id}
              className={`relative overflow-hidden rounded-2xl bg-slate-900/90 border transition-all duration-300 hover:border-cyan-500/50 p-4 sm:p-5 flex flex-col justify-between ${
                index === 0
                  ? 'border-amber-500/60 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/30'
                  : 'border-slate-800'
              } ${isCurrentUser ? 'bg-cyan-950/20' : ''}`}
            >
              {/* Leader Ribbon for 1st place */}
              {index === 0 && (
                <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-yellow-600 text-slate-950 font-black text-[10px] uppercase px-3 py-0.5 rounded-bl-lg flex items-center gap-1 shadow">
                  <Flame className="w-3 h-3 fill-slate-950" />
                  Vodeći
                </div>
              )}

              <div>
                {/* Header: Rank + Avatar + Name */}
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg font-black shadow-md border ${badge.border} bg-gradient-to-br ${badge.bg} text-white shrink-0`}
                  >
                    {badge.icon}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-extrabold text-base text-white truncate">
                        {item.member.name}
                      </h3>
                      {item.member.id === 'dida' && (
                        <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800 px-1.5 py-0.2 rounded font-mono">
                          Dida
                        </span>
                      )}
                      {isCurrentUser && (
                        <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-1.5 py-0.2 rounded font-bold">
                          Ti
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate">
                      {item.member.boatName || 'Ribolovac'}
                    </p>
                  </div>
                </div>

                {/* Big Score Number */}
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-baseline justify-between">
                  <div>
                    <div className="text-3xl sm:text-4xl font-black font-mono text-white tracking-tight">
                      {item.totalCatch}
                    </div>
                    <div className="text-[11px] font-semibold text-cyan-300 uppercase tracking-wider">
                      Ukupno komada
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-bold font-mono text-slate-300">
                      {item.totalWeightKg} kg
                    </div>
                    <div className="text-[11px] text-slate-500">težina ulova</div>
                  </div>
                </div>

                {/* Visual Progress Bar relative to leader */}
                <div className="mt-3">
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        index === 0
                          ? 'bg-gradient-to-r from-amber-400 to-yellow-500'
                          : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                      }`}
                      style={{ width: `${Math.max(5, percent)}%` }}
                    />
                  </div>
                </div>

                {/* Breakdown: Squid vs Cuttlefish */}
                <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                  <div className="bg-slate-950/80 rounded-xl p-2.5 border border-slate-800/80">
                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span>Lignje</span>
                      <span>🦑</span>
                    </div>
                    <div className="text-lg font-bold font-mono text-cyan-400 mt-0.5">
                      {item.squidCount}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {item.squidWeightKg} kg
                    </div>
                  </div>

                  <div className="bg-slate-950/80 rounded-xl p-2.5 border border-slate-800/80">
                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span>Sipe</span>
                      <span>🦐</span>
                    </div>
                    <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                      {item.cuttlefishCount}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {item.cuttlefishWeightKg} kg
                    </div>
                  </div>
                </div>

                {/* Capital Catch Grams */}
                {item.biggestCatchGrams > 0 && (
                  <div className="mt-3 px-2.5 py-1.5 rounded-lg bg-amber-950/30 border border-amber-800/40 flex items-center justify-between text-xs">
                    <span className="text-amber-300 font-medium flex items-center gap-1">
                      <Trophy className="w-3 h-3 text-amber-400" />
                      Najveći primjerak:
                    </span>
                    <span className="font-mono font-bold text-amber-300">
                      {item.biggestCatchGrams} g
                    </span>
                  </div>
                )}
              </div>

              {/* Action Button: Edit / Unos */}
              <div className="mt-4 pt-3 border-t border-slate-800">
                {(isCurrentUser || isDidaManaged || currentUser?.role === 'admin') ? (
                  <button
                    onClick={() => onGoToEntry(item.member.id)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-cyan-600 text-slate-200 hover:text-white font-semibold text-xs transition-colors"
                  >
                    <span>Uredi / Dodaj ulov</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <div className="text-center text-[11px] text-slate-500 py-1">
                    Samo {item.member.name} može uređivati
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Comparative Table */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="px-4 py-3 sm:px-6 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm sm:text-base text-white">
              Pojedinačna tablica i detalji ulova
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            {selectedDateFilter === 'ALL' ? 'Ukupni podaci turnira' : `Za datum: ${selectedDateFilter}`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-950/40 text-slate-400 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Pozicija</th>
                <th className="py-3 px-4">Ribolovac</th>
                <th className="py-3 px-4 text-center">Lignje (kom)</th>
                <th className="py-3 px-4 text-center">Sipe (kom)</th>
                <th className="py-3 px-4 text-center">Ukupno komada</th>
                <th className="py-3 px-4 text-center">Težina</th>
                <th className="py-3 px-4 text-center">Kapitalac</th>
                <th className="py-3 px-4 text-right">Upravljanje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {sortedStats.map((item, index) => {
                const badge = getRankBadge(index);
                const canEdit =
                  currentUser?.id === item.member.id ||
                  (currentUser?.id === 'daniel' && item.member.id === 'dida') ||
                  currentUser?.role === 'admin';

                return (
                  <tr
                    key={item.member.id}
                    className={`hover:bg-slate-800/50 transition-colors ${
                      currentUser?.id === item.member.id ? 'bg-cyan-950/20' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-mono font-bold">
                      <span className="inline-flex items-center gap-1">
                        <span>{badge.icon}</span>
                        <span>#{index + 1}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-lg bg-gradient-to-br ${item.member.avatarColor} flex items-center justify-center text-xs font-bold text-white shadow`}
                        >
                          {item.member.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            {item.member.name}
                            {item.member.id === 'dida' && (
                              <span className="text-[10px] text-amber-400 bg-amber-950/80 px-1 rounded">
                                Unosi Daniel
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">{item.member.boatName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-cyan-400">
                      {item.squidCount} kom
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-emerald-400">
                      {item.cuttlefishCount} kom
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-mono font-black text-white text-base">
                        {item.totalCatch}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-300">
                      {item.totalWeightKg} kg
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-amber-300">
                      {item.biggestCatchGrams > 0 ? `${item.biggestCatchGrams} g` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {canEdit ? (
                        <button
                          onClick={() => onGoToEntry(item.member.id)}
                          className="px-2.5 py-1 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-300 hover:bg-cyan-900 font-semibold text-xs"
                        >
                          Unesi
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500">Zaključano</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
