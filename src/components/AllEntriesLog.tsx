import React, { useState } from 'react';
import { CompetitionState, Member, CatchEntry } from '../types';
import { apiUrl, parseJsonIfValid, deleteCatchEntryLocally, saveLocalCompetitionState } from '../utils/api';
import { Calendar, Trash2, Edit3, MapPin, Anchor, Filter, Clock, AlertCircle } from 'lucide-react';

interface AllEntriesLogProps {
  state: CompetitionState;
  currentUser: Member | null;
  onEditEntry: (entry: CatchEntry) => void;
  onRefresh: () => void;
}

export const AllEntriesLog: React.FC<AllEntriesLogProps> = ({
  state,
  currentUser,
  onEditEntry,
  onRefresh,
}) => {
  const [filterMember, setFilterMember] = useState<string>('ALL');
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const filteredEntries = [...state.entries]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .filter((e) => (filterMember === 'ALL' ? true : e.memberId === filterMember));

  const handleDelete = async (entryId: string) => {
    if (!currentUser) return;

    setIsDeletingId(entryId);
    try {
      let deletedViaServer = false;
      try {
        const res = await fetch(apiUrl(`/api/entry/${entryId}?currentUserId=${currentUser.id}`), {
          method: 'DELETE',
        });
        const data = await parseJsonIfValid(res);
        if (data?.success && data?.state) {
          saveLocalCompetitionState(data.state);
          deletedViaServer = true;
        }
      } catch {
        // fallback to local delete
      }

      if (!deletedViaServer) {
        deleteCatchEntryLocally(entryId, currentUser.id);
      }

      onRefresh();
    } catch (err) {
      console.warn('Greška pri brisanju zapisa:', err);
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header and Filter */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
            <span>📜</span>
            <span>Dnevnik Svih Zabilježenih Ulova</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Kronološki pregled svih unosa za sve članove tima u stvarnom vremenu
          </p>
        </div>

        {/* Member filter */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs font-semibold overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilterMember('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterMember === 'ALL' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Svi članovi ({state.entries.length})
          </button>
          {state.members.map((m) => {
            const count = state.entries.filter((e) => e.memberId === m.id).length;
            return (
              <button
                key={m.id}
                onClick={() => setFilterMember(m.id)}
                className={`px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                  filterMember === m.id ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {m.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Entries List */}
      {filteredEntries.length === 0 ? (
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-12 text-center text-slate-400">
          <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
          <p className="font-semibold text-slate-300">Nema unosa za odabrani filter.</p>
          <p className="text-xs mt-1">Unesite novi ulov putem taba "Dnevni Unos Ulova".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEntries.map((entry) => {
            const member = state.members.find((m) => m.id === entry.memberId);
            const canManage =
              currentUser?.id === entry.memberId ||
              (currentUser?.id === 'daniel' && entry.memberId === 'dida') ||
              currentUser?.role === 'admin';

            return (
              <div
                key={entry.id}
                className="rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-4 sm:p-5 flex flex-col justify-between shadow-lg transition-all"
              >
                <div>
                  {/* Top: Member name + Date + Manage buttons */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-lg bg-gradient-to-br ${
                          member?.avatarColor || 'from-cyan-500 to-blue-600'
                        } flex items-center justify-center text-xs font-bold text-white shadow`}
                      >
                        {entry.memberName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                          {entry.memberName}
                          {entry.memberId === 'dida' && (
                            <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800 px-1 rounded">
                              Dida
                            </span>
                          )}
                        </h4>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-cyan-400" />
                          <span>{entry.date}</span>
                        </div>
                      </div>
                    </div>

                    {canManage && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onEditEntry(entry)}
                          className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Uredi ovaj ulov"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          disabled={isDeletingId === entry.id}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Obriši ovaj ulov"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Catch stats numbers */}
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-cyan-900/40">
                      <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                        <span>🦑 Lignje</span>
                      </div>
                      <div className="text-xl font-black font-mono text-cyan-400 mt-0.5">
                        {entry.squidCount}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {entry.squidWeightKg ? `${entry.squidWeightKg} kg` : '—'}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-emerald-900/40">
                      <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                        <span>🦐 Sipe</span>
                      </div>
                      <div className="text-xl font-black font-mono text-emerald-400 mt-0.5">
                        {entry.cuttlefishCount}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {entry.cuttlefishWeightKg ? `${entry.cuttlefishWeightKg} kg` : '—'}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                      <div className="text-[11px] text-slate-400">Ukupno</div>
                      <div className="text-xl font-black font-mono text-white mt-0.5">
                        {entry.totalCatch}
                      </div>
                      <div className="text-[10px] text-amber-300">
                        {entry.biggestCatchGrams ? `Top: ${entry.biggestCatchGrams}g` : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Notes & Location */}
                  <div className="mt-3 space-y-1.5 text-xs text-slate-300">
                    {entry.locationNotes && (
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                        <span className="text-slate-300">{entry.locationNotes}</span>
                      </div>
                    )}
                    {entry.lureNotes && (
                      <div className="flex items-start gap-1.5">
                        <Anchor className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                        <span className="text-slate-400 italic">{entry.lureNotes}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer metadata: Updated By */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>Zabilježio: {entry.updatedBy}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(entry.updatedAt).toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
