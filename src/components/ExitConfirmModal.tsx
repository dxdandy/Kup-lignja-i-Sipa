import React from 'react';
import { LogOut, Check, X, ShieldAlert } from 'lucide-react';

interface ExitConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmExit: () => void;
}

export const ExitConfirmModal: React.FC<ExitConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirmExit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-rose-950/80 via-slate-900 to-slate-900 border-b border-rose-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Izlazak iz aplikacije</h3>
              <p className="text-[11px] text-slate-400">Lignjolov • Novi Vinodolski</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 text-center">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-white/5 border border-slate-700 flex items-center justify-center shadow-inner overflow-hidden">
            <img
              src="/icon.png"
              alt="Lignjolov"
              className="w-12 h-12 object-contain"
            />
          </div>

          <h4 className="text-sm font-semibold text-white mb-1.5">
            Želite li izaći iz aplikacije Lignjolov?
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            Prepoznali smo gestu slajdanja s ruba ekrana. Možete se vratiti praćenju ulova ili zatvoriti aplikaciju.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs sm:text-sm border border-slate-700 transition"
            >
              Nastavi lov
            </button>
            <button
              type="button"
              onClick={onConfirmExit}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-rose-900/40 transition flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              <span>Izađi</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
