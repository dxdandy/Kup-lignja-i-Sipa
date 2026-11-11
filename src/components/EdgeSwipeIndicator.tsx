import React from 'react';
import { ChevronRight, ChevronLeft, ArrowLeft, LogOut } from 'lucide-react';

interface EdgeSwipeIndicatorProps {
  edgeSwipe: {
    side: 'left' | 'right';
    distance: number;
    active: boolean;
  } | null;
  isAtHome: boolean;
}

export const EdgeSwipeIndicator: React.FC<EdgeSwipeIndicatorProps> = ({
  edgeSwipe,
  isAtHome,
}) => {
  if (!edgeSwipe || edgeSwipe.distance < 12) return null;

  const { side, distance, active } = edgeSwipe;
  const clampedDistance = Math.min(70, distance);
  const opacity = Math.min(1, distance / 40);

  return (
    <div
      className={`fixed top-1/2 -translate-y-1/2 z-50 pointer-events-none transition-transform duration-75 ease-out flex items-center ${
        side === 'left' ? 'left-0 flex-row' : 'right-0 flex-row-reverse'
      }`}
      style={{
        transform: `translateY(-50%) translateX(${
          side === 'left' ? clampedDistance * 0.7 : -clampedDistance * 0.7
        }px)`,
        opacity,
      }}
    >
      {/* Curved Edge Bubble like modern Android 14/15 back gesture */}
      <div
        className={`flex items-center gap-2 px-3 py-2.5 rounded-full shadow-2xl backdrop-blur-md border ${
          active
            ? isAtHome
              ? 'bg-rose-950/95 border-rose-500 shadow-rose-500/50 scale-110'
              : 'bg-cyan-950/95 border-cyan-400 shadow-cyan-500/50 scale-110'
            : 'bg-slate-900/90 border-slate-700 shadow-black/60 scale-95'
        } transition-all duration-150`}
      >
        {isAtHome ? (
          <>
            <LogOut
              className={`w-4 h-4 ${
                active ? 'text-rose-400 animate-pulse' : 'text-slate-400'
              }`}
            />
            {active && (
              <span className="text-[11px] font-bold text-rose-300 whitespace-nowrap">
                Izlaz
              </span>
            )}
          </>
        ) : (
          <>
            {side === 'left' ? (
              <ChevronRight
                className={`w-5 h-5 ${
                  active ? 'text-cyan-300 animate-pulse' : 'text-slate-400'
                }`}
              />
            ) : (
              <ChevronLeft
                className={`w-5 h-5 ${
                  active ? 'text-cyan-300 animate-pulse' : 'text-slate-400'
                }`}
              />
            )}
            {active && (
              <span className="text-[11px] font-bold text-cyan-300 whitespace-nowrap flex items-center gap-1">
                <ArrowLeft className="w-3 h-3" /> Nazad
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
};
