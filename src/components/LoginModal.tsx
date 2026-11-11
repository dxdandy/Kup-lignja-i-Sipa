import React, { useState } from 'react';
import { Member } from '../types';
import { apiUrl, parseJsonIfValid, verifyPinLocally } from '../utils/api';
import { X, Lock, Shield, UserCheck, AlertCircle, KeyRound, Sparkles } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  members: Member[];
  onClose: () => void;
  onLoginSuccess: (member: Member) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  members,
  onClose,
  onLoginSuccess,
}) => {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleMemberSelect = (member: Member) => {
    setSelectedMember(member);
    setErrorMsg(null);
    setPin('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) {
      setErrorMsg('Molimo odaberite svog člana.');
      return;
    }

    // If Dida is selected, explain that Daniel manages Dida
    if (selectedMember.id === 'dida') {
      const daniel = members.find((m) => m.id === 'daniel');
      if (daniel) {
        setSelectedMember(daniel);
        setErrorMsg('Dida nema pametni telefon. Prijavite se kao Daniel kako biste unosili za Didu i sebe.');
        return;
      }
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      let loggedInMember: Member | undefined;
      try {
        const res = await fetch(apiUrl('/api/login'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memberId: selectedMember.id,
            pin: pin.trim(),
          }),
        });
        const data = await parseJsonIfValid(res);
        if (data?.member) {
          loggedInMember = data.member;
        } else if (res.status === 401 || res.status === 404) {
          const errData = await res.json().catch(() => ({}));
          if (errData.error) {
            throw new Error(errData.error);
          }
        }
      } catch (fetchErr: any) {
        if (fetchErr?.message?.includes('Pogrešan PIN')) {
          throw fetchErr;
        }
      }

      if (!loggedInMember) {
        const localResult = verifyPinLocally(selectedMember.id, pin.trim());
        if (localResult.error || !localResult.member) {
          throw new Error(localResult.error || 'Pogrešan PIN kod.');
        }
        loggedInMember = localResult.member;
      }

      onLoginSuccess(loggedInMember);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Greška pri prijavi.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick 1-click test login
  const handleQuickLogin = async (member: Member, testPin: string) => {
    setSelectedMember(member);
    setPin(testPin);
    setIsLoading(true);
    setErrorMsg(null);

    try {
      let loggedInMember: Member | undefined;
      try {
        const res = await fetch(apiUrl('/api/login'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memberId: member.id,
            pin: testPin,
          }),
        });
        const data = await parseJsonIfValid(res);
        if (data?.member) {
          loggedInMember = data.member;
        }
      } catch {
        // fallback to local verification
      }

      if (!loggedInMember) {
        const localResult = verifyPinLocally(member.id, testPin);
        if (localResult.error || !localResult.member) {
          throw new Error(localResult.error || 'Greška pri brzoj prijavi.');
        }
        loggedInMember = localResult.member;
      }

      onLoginSuccess(loggedInMember);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Greška pri brzoj prijavi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-cyan-800/60 shadow-2xl p-5 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
              <Lock className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">Prijava Člana Tima</h3>
              <p className="text-xs text-slate-400">Odaberi svoje ime za pristup svojoj tablici</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Member Selector Grid */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
            1. Tko si ti?
          </label>
          <div className="grid grid-cols-2 gap-2">
            {members.map((m) => {
              const isSelected = selectedMember?.id === m.id;
              const isDida = m.id === 'dida';
              const isAdmin = m.id === 'daniel';

              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleMemberSelect(m)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-gradient-to-br from-cyan-950 to-blue-950 border-cyan-500 text-white shadow-md'
                      : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-lg bg-gradient-to-br ${m.avatarColor} flex items-center justify-center text-xs font-bold text-white shadow`}
                    >
                      {m.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm text-white truncate flex items-center gap-1">
                        <span>{m.name}</span>
                        {isAdmin && <Shield className="w-3 h-3 text-cyan-400" />}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {isDida ? 'Unosi Daniel' : isAdmin ? 'Admin' : 'Ribolovac'}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* PIN Input Form */}
        {selectedMember && (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-slate-800">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                  <span>PIN kod za {selectedMember.name}</span>
                </label>
                <span className="text-[11px] text-cyan-400 font-mono">
                  Zadani PIN: {selectedMember.id === 'daniel' ? '2026' : selectedMember.id === 'silvio' ? '9876' : '1234'}
                </span>
              </div>

              <input
                type="password"
                maxLength={6}
                autoFocus
                placeholder="Unesite 4-znamenkasti PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-center text-lg font-mono font-bold text-white tracking-widest focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !pin}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/25 transition-all"
            >
              {isLoading ? 'Provjera...' : `Prijavi se kao ${selectedMember.name}`}
            </button>
          </form>
        )}

        {/* 1-Click Fast Test Buttons */}
        <div className="pt-3 border-t border-slate-800/80">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold mb-2 flex items-center justify-between">
            <span>Brzi odabir za testiranje:</span>
            <Sparkles className="w-3 h-3 text-cyan-400" />
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => {
                const daniel = members.find((m) => m.id === 'daniel');
                if (daniel) handleQuickLogin(daniel, '2026');
              }}
              className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-cyan-900/60 text-xs text-cyan-300 font-semibold border border-slate-700 transition-colors"
            >
              Daniel (Admin)
            </button>
            <button
              type="button"
              onClick={() => {
                const tuna = members.find((m) => m.id === 'tuna');
                if (tuna) handleQuickLogin(tuna, '1234');
              }}
              className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-blue-900/60 text-xs text-blue-300 font-semibold border border-slate-700 transition-colors"
            >
              Tuna
            </button>
            <button
              type="button"
              onClick={() => {
                const silvio = members.find((m) => m.id === 'silvio');
                if (silvio) handleQuickLogin(silvio, '9876');
              }}
              className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-emerald-900/60 text-xs text-emerald-300 font-semibold border border-slate-700 transition-colors"
            >
              Silvio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
