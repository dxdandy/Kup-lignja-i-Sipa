import React from 'react';
import { Member } from '../types';
import { Shield, User, LogOut, MapPin, Radio } from 'lucide-react';

interface HeaderProps {
  currentUser: Member | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  onOpenApkModal: () => void;
  isLiveConnected: boolean;
  activeTab: 'leaderboard' | 'entry' | 'solunar' | 'log';
  setActiveTab: (tab: 'leaderboard' | 'entry' | 'solunar' | 'log') => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onOpenLogin,
  onLogout,
  isLiveConnected,
  activeTab,
  setActiveTab,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-cyan-900/40 shadow-xl safe-top">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2">
        {/* Top row: Brand + Live status + User bar */}
        <div className="flex items-center justify-between gap-2">
          {/* Brand with the custom white-background red-pink squid icon */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-white p-0.5 border-2 border-cyan-400 shadow-lg shadow-cyan-500/20 shrink-0 overflow-hidden">
              <img
                src="/icon.png"
                alt="Lignja Ikona"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="font-extrabold text-sm sm:text-base md:text-lg tracking-tight text-white truncate">
                  Kup Lignja & Sipa
                </h1>
                <span className="hidden xs:inline-flex items-center text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-cyan-950/90 border border-cyan-800 text-cyan-300">
                  2026
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-400 truncate">
                <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                <span className="truncate">Novi Vinodolski • 18.–22.11.</span>
              </div>
            </div>
          </div>

          {/* Right actions: Live sync badge + User login/badge */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Live SSE status indicator */}
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                isLiveConnected
                  ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300'
                  : 'bg-amber-950/60 border-amber-800/60 text-amber-300'
              }`}
              title={isLiveConnected ? 'Uživo povezano s bazom (SSE)' : 'Povezivanje...'}
            >
              <Radio className={`w-3.5 h-3.5 ${isLiveConnected ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
              <span className="text-[11px] font-mono">{isLiveConnected ? 'UŽIVO' : 'POVEZIVANJE'}</span>
            </div>

            {/* User status */}
            {currentUser ? (
              <div className="flex items-center gap-1.5 bg-slate-900/90 border border-cyan-900/60 rounded-xl p-1 pl-2">
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-7 h-7 rounded-lg bg-gradient-to-br ${currentUser.avatarColor} flex items-center justify-center text-xs font-bold text-white shadow`}
                  >
                    {currentUser.name.charAt(0)}
                  </div>
                  <div className="text-left hidden xs:block">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-white leading-tight">
                        {currentUser.name}
                      </span>
                      {currentUser.role === 'admin' && (
                        <span title="Admin (Upravlja i Didinim unosom)">
                          <Shield className="w-3 h-3 text-cyan-400" />
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-cyan-300 block leading-none">
                      {currentUser.role === 'admin' ? 'Admin + Dida' : 'Član'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors ml-1"
                  title="Promijeni korisnika"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-md shadow-cyan-500/20 transition-all"
              >
                <User className="w-3.5 h-3.5" />
                <span>Prijava</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs (Fully Fluid & Responsive) */}
        <nav className="flex items-center gap-1 sm:gap-2 mt-2 pt-1.5 border-t border-slate-900 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'leaderboard'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <span>🏆</span>
            <span>Tablica Poretka</span>
          </button>

          <button
            onClick={() => setActiveTab('entry')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'entry'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <span>🎣</span>
            <span>Dnevni Unos</span>
          </button>

          <button
            onClick={() => setActiveTab('solunar')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'solunar'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <span>🌙</span>
            <span>Solunar & AI</span>
            <span className="text-[9px] bg-amber-400/20 text-amber-300 border border-amber-500/30 px-1 rounded font-mono">
              72h
            </span>
          </button>

          <button
            onClick={() => setActiveTab('log')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'log'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <span>📜</span>
            <span>Dnevnik Ulova</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
