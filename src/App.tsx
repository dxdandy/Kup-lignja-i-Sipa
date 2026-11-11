import React, { useState, useEffect, useRef } from 'react';
import { CompetitionState, Member, CatchEntry } from './types';
import { Header } from './components/Header';
import { Leaderboard } from './components/Leaderboard';
import { DailyCatchForm } from './components/DailyCatchForm';
import { SolunarCalculator } from './components/SolunarCalculator';
import { AllEntriesLog } from './components/AllEntriesLog';
import { ApkGitHubModal } from './components/ApkGitHubModal';
import { LoginModal } from './components/LoginModal';
import { OrientationLockBanner } from './components/OrientationLockBanner';
import { PullToRefreshIndicator } from './components/PullToRefreshIndicator';
import { EdgeSwipeIndicator } from './components/EdgeSwipeIndicator';
import { ExitConfirmModal } from './components/ExitConfirmModal';
import { useOTAUpdate } from './hooks/useOTAUpdate';
import { useMobileGestures } from './hooks/useMobileGestures';
import {
  apiUrl,
  parseJsonIfValid,
  getLocalCompetitionState,
  saveLocalCompetitionState,
} from './utils/api';
import { Sparkles } from 'lucide-react';

export default function App() {
  const [competitionState, setCompetitionState] = useState<CompetitionState>(() =>
    getLocalCompetitionState()
  );
  const [currentUser, setCurrentUser] = useState<Member | null>(null);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'entry' | 'solunar' | 'log'>('leaderboard');
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isApkModalOpen, setIsApkModalOpen] = useState<boolean>(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState<boolean>(false);
  const [initialEntryMemberId, setInitialEntryMemberId] = useState<string | undefined>(undefined);
  const [liveToast, setLiveToast] = useState<string | null>(null);

  // Silent Background Live OTA Hook
  const {
    currentVersion,
    remoteVersionInfo,
    isChecking: isCheckingOTA,
    checkForUpdates,
    applyUpdate,
  } = useOTAUpdate();

  // Fetch state via REST or local storage fallback (for standalone APK)
  const fetchState = async () => {
    try {
      const res = await fetch(apiUrl('/api/state'), { cache: 'no-store' });
      const data = await parseJsonIfValid(res);
      if (data?.state) {
        setCompetitionState(data.state);
        saveLocalCompetitionState(data.state);
        setIsLiveConnected(true);
        return;
      }
    } catch {
      // Fallback to local persisted state inside standalone APK
    }
    setCompetitionState(getLocalCompetitionState());
  };

  // Mobile Gestures: Pull-to-refresh with silent OTA update & edge swipe navigation
  const handlePullRefresh = async () => {
    try {
      await fetchState();
      const updated = await checkForUpdates(true);
      if (!updated) {
        setLiveToast(`✅ Podaci osvježeni • v${currentVersion}`);
        setTimeout(() => setLiveToast(null), 2500);
      }
    } catch (err) {
      console.warn('Pull to refresh:', err);
    }
  };

  const handleBackStep = () => {
    if (isExitModalOpen) {
      setIsExitModalOpen(false);
      return;
    }
    if (isApkModalOpen) {
      setIsApkModalOpen(false);
      return;
    }
    if (isLoginModalOpen) {
      setIsLoginModalOpen(false);
      return;
    }
    if (activeTab !== 'leaderboard') {
      setActiveTab('leaderboard');
      return;
    }
  };

  const handleExitPrompt = () => {
    setIsExitModalOpen(true);
  };

  const handleConfirmExit = () => {
    setIsExitModalOpen(false);
    try {
      if ((navigator as any).app?.exitApp) {
        (navigator as any).app.exitApp();
      } else if ((window as any).Capacitor?.App?.exitApp) {
        (window as any).Capacitor.App.exitApp();
      } else {
        window.close();
      }
    } catch {
      // fallback
    }
  };

  const isAtHome = activeTab === 'leaderboard' && !isLoginModalOpen && !isApkModalOpen && !isExitModalOpen;
  const hasOpenModal = isLoginModalOpen || isApkModalOpen || isExitModalOpen;

  const { pullDistance, isRefreshing, edgeSwipe } = useMobileGestures({
    onRefresh: handlePullRefresh,
    onBackStep: handleBackStep,
    onExitApp: handleExitPrompt,
    isAtHome,
    hasOpenModal,
  });

  const eventSourceRef = useRef<EventSource | null>(null);

  // Load saved user from localStorage or set default to Daniel (admin)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('lignjolov_current_user');
      if (saved) {
        setCurrentUser(JSON.parse(saved));
      } else {
        const defaultAdmin: Member = {
          id: 'daniel',
          name: 'Daniel',
          role: 'admin',
          pin: '2026',
          avatarColor: 'from-cyan-500 to-blue-600',
          boatName: 'Kapetan / Admin',
        };
        setCurrentUser(defaultAdmin);
        localStorage.setItem('lignjolov_current_user', JSON.stringify(defaultAdmin));
      }
    } catch {
      // ignore storage error
    }
  }, []);

  // Real-time SSE synchronization + silent Live OTA listener
  useEffect(() => {
    fetchState();

    const connectSSE = () => {
      try {
        const es = new EventSource(apiUrl('/api/stream'));
        eventSourceRef.current = es;

        es.onopen = () => {
          setIsLiveConnected(true);
        };

        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'INIT_STATE' || data.type === 'UPDATE_STATE') {
              if (data.state) {
                setCompetitionState(data.state);
                saveLocalCompetitionState(data.state);
              }

              if (data.type === 'UPDATE_STATE') {
                setLiveToast('⚡ Rezultati ažurirani u stvarnom vremenu!');
                setTimeout(() => setLiveToast(null), 3500);
              }
            } else if (data.type === 'OTA_UPDATE_AVAILABLE') {
              // Silent background OTA update when broadcast received
              checkForUpdates(true);
            }
          } catch {
            // keep-alive heartbeat or comments
          }
        };

        es.onerror = () => {
          es.close();
        };
      } catch {
        // Standalone APK mode without SSE server
      }
    };

    connectSSE();

    const pollInterval = setInterval(fetchState, 6000);

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      clearInterval(pollInterval);
    };
  }, [checkForUpdates]);

  const handleLoginSuccess = (member: Member) => {
    setCurrentUser(member);
    try {
      localStorage.setItem('lignjolov_current_user', JSON.stringify(member));
    } catch {
      // ignore
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('lignjolov_current_user');
    } catch {
      // ignore
    }
    setIsLoginModalOpen(true);
  };

  const handleGoToEntry = (targetMemberId?: string) => {
    if (targetMemberId) {
      setInitialEntryMemberId(targetMemberId);
    }
    setActiveTab('entry');
  };

  const handleEditEntryFromLog = (entry: CatchEntry) => {
    setInitialEntryMemberId(entry.memberId);
    setActiveTab('entry');
  };

  return (
    <div className="min-h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      {/* Portrait orientation lock handler */}
      <OrientationLockBanner />

      {/* Pull down to refresh indicator */}
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
      />

      {/* Edge swipe back & exit gesture indicator */}
      <EdgeSwipeIndicator
        edgeSwipe={edgeSwipe}
        isAtHome={isAtHome}
      />

      {/* Top Header */}
      <Header
        currentUser={currentUser}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        onOpenApkModal={() => setIsApkModalOpen(true)}
        isLiveConnected={isLiveConnected}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Floating Live Sync Toast */}
      {liveToast && (
        <div className="fixed bottom-6 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-950/95 border border-cyan-400 text-cyan-200 text-xs sm:text-sm font-bold shadow-2xl animate-bounce">
          <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
          <span>{liveToast}</span>
        </div>
      )}

      {/* Main Responsive Fluid Container - Adapts to all phone screen sizes */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 safe-bottom">
        {activeTab === 'leaderboard' && (
          <Leaderboard
            state={competitionState}
            currentUser={currentUser}
            onGoToEntry={handleGoToEntry}
          />
        )}

        {activeTab === 'entry' && (
          <DailyCatchForm
            state={competitionState}
            currentUser={currentUser}
            initialMemberId={initialEntryMemberId}
            onSaveSuccess={() => {
              fetchState();
              setActiveTab('leaderboard');
            }}
            onOpenLogin={() => setIsLoginModalOpen(true)}
          />
        )}

        {activeTab === 'solunar' && <SolunarCalculator />}

        {activeTab === 'log' && (
          <AllEntriesLog
            state={competitionState}
            currentUser={currentUser}
            onEditEntry={handleEditEntryFromLog}
            onRefresh={fetchState}
          />
        )}
      </main>

      {/* Mobile-Adaptive Footer with prominent App Version at the very bottom */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950/95 py-3.5 px-4 text-center text-xs text-slate-400 safe-bottom">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400">⚓</span>
            <span className="font-semibold text-slate-300">
              Lignjolov • Kup Lignja & Sipa Novi Vinodolski (18.11. – 22.11.2026)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsApkModalOpen(true)}
              className="text-cyan-400 hover:text-cyan-300 underline font-mono text-[11px] flex items-center gap-1"
            >
              <span>Live OTA & APK</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </button>
            <span>•</span>
            <span className="font-mono text-xs font-bold text-cyan-300 bg-cyan-950/70 border border-cyan-800/60 px-2.5 py-0.5 rounded-full">
              Verzija aplikacije: v{currentVersion}
            </span>
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      {competitionState && (
        <LoginModal
          isOpen={isLoginModalOpen}
          members={competitionState.members}
          onClose={() => setIsLoginModalOpen(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {/* APK & Live OTA Modal */}
      <ApkGitHubModal
        isOpen={isApkModalOpen}
        currentUser={currentUser}
        remoteInfo={remoteVersionInfo}
        currentVersion={currentVersion}
        isChecking={isCheckingOTA}
        onCheckForUpdates={checkForUpdates}
        onApplyUpdate={() => applyUpdate()}
        onClose={() => setIsApkModalOpen(false)}
      />

      {/* Exit Confirmation Modal (triggered on edge swipe back at home) */}
      <ExitConfirmModal
        isOpen={isExitModalOpen}
        onClose={() => setIsExitModalOpen(false)}
        onConfirmExit={handleConfirmExit}
      />
    </div>
  );
}
