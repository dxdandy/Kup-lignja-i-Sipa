import React from 'react';
import { RefreshCw, Sparkles, ArrowDown } from 'lucide-react';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
}

export const PullToRefreshIndicator: React.FC<PullToRefreshIndicatorProps> = ({
  pullDistance,
  isRefreshing,
}) => {
  if (pullDistance <= 5 && !isRefreshing) return null;

  const threshold = 55;
  const isTriggered = pullDistance >= threshold || isRefreshing;
  const opacity = Math.min(1, pullDistance / threshold);

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center pointer-events-none transition-all duration-150"
      style={{
        transform: `translateY(${Math.min(90, pullDistance * 0.9)}px)`,
        opacity: isRefreshing ? 1 : opacity,
      }}
    >
      <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-900/95 border-2 border-cyan-400 text-white shadow-2xl shadow-cyan-500/40 backdrop-blur-md">
        {/* Squid Icon / Spinner */}
        <div className="relative w-7 h-7 rounded-lg bg-white p-0.5 border border-cyan-400 shrink-0 overflow-hidden flex items-center justify-center shadow">
          {isRefreshing ? (
            <RefreshCw className="w-4 h-4 text-cyan-600 animate-spin" />
          ) : (
            <img
              src="/icon.png"
              alt="Lignja"
              className={`w-full h-full object-cover rounded transition-transform duration-200 ${
                isTriggered ? 'scale-110' : 'scale-90'
              }`}
            />
          )}
        </div>

        {/* Status text */}
        <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
          {isRefreshing ? (
            <span className="text-cyan-300 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              <span>Osvježavanje & Live OTA provjera...</span>
            </span>
          ) : isTriggered ? (
            <span className="text-emerald-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Pustite za osvježenje i OTA ažuriranje!</span>
            </span>
          ) : (
            <span className="text-slate-300 flex items-center gap-1">
              <ArrowDown className="w-3 h-3 text-cyan-400 animate-bounce" />
              <span>Povucite prema dolje...</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
