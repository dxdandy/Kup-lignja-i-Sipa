import React from 'react';
import { Sparkles, RefreshCw, X, ArrowUpCircle, CheckCircle } from 'lucide-react';
import { OTAVersionInfo } from '../hooks/useOTAUpdate';

interface OTAUpdateBannerProps {
  isUpdateAvailable: boolean;
  remoteInfo: OTAVersionInfo | null;
  currentVersion: string;
  onApplyUpdate: () => void;
  onDismiss: () => void;
}

export const OTAUpdateBanner: React.FC<OTAUpdateBannerProps> = ({
  isUpdateAvailable,
  remoteInfo,
  currentVersion,
  onApplyUpdate,
  onDismiss,
}) => {
  if (!isUpdateAvailable || !remoteInfo) return null;

  return (
    <div className="fixed top-14 sm:top-16 inset-x-3 sm:inset-x-auto sm:right-6 sm:w-96 z-50 animate-bounce-short">
      <div className="rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-cyan-950 border-2 border-cyan-400 p-4 shadow-2xl shadow-cyan-500/30 text-white">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black uppercase tracking-wider text-cyan-300">
                  Live OTA Ažuriranje
                </span>
                <span className="text-[10px] bg-cyan-900/80 px-1.5 py-0.2 rounded font-mono font-bold text-cyan-200">
                  v{remoteInfo.version}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white leading-tight">
                Dostupna je nova verzija aplikacije!
              </h4>
            </div>
          </div>

          <button
            onClick={onDismiss}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-300 mt-2 leading-relaxed">
          Nove funkcije i ispravci su spremni. Ažuriranje se primjenjuje preko zraka (OTA) bez potrebe za ponovnom instalacijom APK datoteke.
        </p>

        {remoteInfo.features && remoteInfo.features.length > 0 && (
          <div className="mt-2.5 py-2 px-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300 space-y-1">
            <span className="font-semibold text-cyan-400 block text-[10px] uppercase">
              Novosti u verziji:
            </span>
            {remoteInfo.features.slice(0, 2).map((f, i) => (
              <div key={i} className="flex items-center gap-1 truncate">
                <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate">{f}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3.5 flex items-center gap-2">
          <button
            onClick={onApplyUpdate}
            className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/25 transition-transform active:scale-95"
          >
            <ArrowUpCircle className="w-4 h-4" />
            <span>Ažuriraj Uživo Sada</span>
          </button>

          <button
            onClick={onDismiss}
            className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            Kasnije
          </button>
        </div>
      </div>
    </div>
  );
};
