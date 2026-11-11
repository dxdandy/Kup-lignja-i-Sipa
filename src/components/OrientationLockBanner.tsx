import React, { useEffect, useState } from 'react';
import { Smartphone, RotateCcw } from 'lucide-react';

export const OrientationLockBanner: React.FC = () => {
  const [isLandscapeMobile, setIsLandscapeMobile] = useState<boolean>(false);
  const [userDismissed, setUserDismissed] = useState<boolean>(false);

  useEffect(() => {
    // Attempt standard Screen Orientation API lock
    const attemptOrientationLock = async () => {
      try {
        if (typeof window !== 'undefined' && window.screen?.orientation) {
          // @ts-ignore
          if (window.screen.orientation.lock) {
            // @ts-ignore
            await window.screen.orientation.lock('portrait');
          }
        }
      } catch {
        // Many mobile browsers allow lock only in standalone/fullscreen mode
      }
    };

    attemptOrientationLock();

    // Orientation checker for mobile/touch screens
    const checkOrientation = () => {
      if (typeof window === 'undefined') return;
      
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isLandscape = window.innerWidth > window.innerHeight;
      // Trigger if screen is mobile-sized in height (under 600px when rotated)
      const isMobileHeight = window.innerHeight <= 560;

      if (isTouch && isLandscape && isMobileHeight) {
        setIsLandscapeMobile(true);
      } else {
        setIsLandscapeMobile(false);
      }
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!isLandscapeMobile || userDismissed) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-lg text-white">
      <div className="max-w-sm w-full text-center space-y-4 p-6 rounded-2xl bg-slate-900 border border-cyan-800 shadow-2xl">
        {/* Squid Icon with Rotation indicator */}
        <div className="relative w-20 h-20 mx-auto">
          <img
            src="/icon.png"
            alt="Lignjolov Ikona"
            className="w-20 h-20 rounded-2xl object-cover bg-white p-1 border-2 border-cyan-400 shadow-xl mx-auto animate-pulse"
          />
          <div className="absolute -bottom-2 -right-2 bg-cyan-600 rounded-full p-1.5 shadow-md">
            <RotateCcw className="w-4 h-4 text-white animate-spin" />
          </div>
        </div>

        <div>
          <h3 className="text-base sm:text-lg font-black text-white">
            Vertikalni položaj zaključan 🔒
          </h3>
          <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
            Aplikacija za unos liganja i sipa dizajnirana je isključivo za vertikalni (uspravni) položaj mobitela radi lakšeg unosa na barci.
          </p>
        </div>

        <div className="pt-2 flex flex-col gap-2">
          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-cyan-300 flex items-center justify-center gap-2">
            <Smartphone className="w-4 h-4 animate-bounce" />
            <span>Okrenite mobitel uspravno (Portrait)</span>
          </div>

          <button
            onClick={() => setUserDismissed(true)}
            className="text-[11px] text-slate-500 hover:text-slate-400 underline pt-1"
          >
            Ipak nastavi u ovom položaju
          </button>
        </div>
      </div>
    </div>
  );
};
