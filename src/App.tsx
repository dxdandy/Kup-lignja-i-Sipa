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
import { OTAUpdateBanner } from './components/OTAUpdateBanner';
import { PullToRefreshIndicator } from './components/PullToRefreshIndicator';
import { EdgeSwipeIndicator } from './components/EdgeSwipeIndicator';
import { ExitConfirmModal } from './components/ExitConfirmModal';
import { useOTAUpdate } from './hooks/useOTAUpdate';
import { useMobileGestures } from './hooks/useMobileGestures';
import { apiUrl } from './utils/api';
import { RefreshCw, Sparkles, WifiOff } from 'lucide-react';

const DEFAULT_COMPETITION_STATE: CompetitionState = {
  competitionName: 'Kup Lignja & Sipa Novi Vinodolski 2026',
  location: 'Novi Vinodolski (Kvarner, Hrvatska)',
  startDate: '2026-11-18',
  endDate: '2026-11-22',
  members: [
    {
      id: 'daniel',
      name: 'Daniel',
      role: 'admin',
      pin: '2026',
      avatarColor: 'from-cyan-500 to-blue-600',
      boatName: 'Kapetan / Admin',
    },
    {
      id: 'dida',
      name: 'Dida',
      role: 'member',
      pin: '0000',
      hasNoSmartphone: true,
      managedBy: 'daniel',
      avatarColor: 'from-amber-500 to-orange-600',
      boatName: 'Stari morski vuk',
    },
    {
      id: 'tuna',
      name: 'Tuna',
      role: 'member',
      pin: '1234',
      avatarColor: 'from-blue-600 to-indigo-700',
      boatName: 'Lovac na kapitalce',
    },
    {
      id: 'silvio',
      name: 'Silvio',
      role: 'member',
      pin: '9876',
      avatarColor: 'from-emerald-500 to-teal-700',
      boatName: 'Majstor za peškafondo',
    },
  ],
  entries: [],
  lastUpdate: new Date().toISOString(),
};

export default function App() {
  const [competitionState, setCompetitionState] = useState<CompetitionState>(() => {
    try {
      const cached = localStorage.getItem('lignjolov_competition_state');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.members) && parsed.members.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_COMPETITION_STATE;
  });
  const [currentUser, setCurrentUser] = useState<Member | null>(null);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'entry' | 'solunar' | 'log'>('leaderboard');
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isApkModalOpen, setIsApkModalOpen] = useState<boolean>(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState<boolean>(false);
  const [initialEntryMemberId, setInitialEntryMemberId] = useState<string | undefined>(undefined);
  const [liveToast, setLiveToast] = useState<string | null>(null);

  // Live OTA Hook
  const {
    currentVersion,
    remoteVersionInfo,
    isUpdateAvailable,
    isChecking: isCheckingOTA,
    showUpdateModal,
    setShowUpdateModal,
    checkForUpdates,
    applyUpdate,
  } = useOTAUpdate();

  // Mobile Gestures: Pull-to-refresh with instant OTA update & edge swipe navigation
  const handlePullRefresh = async () => {
    try {
      await fetchState();
      // Check for OTA updates per user request: if available, apply immediately!
      const hasNewer = await checkForUpdates(true);
      if (hasNewer) {
        setLiveToast('🚀 Pronađeno novije OTA ažuriranje! Automatska instalacija...');
        setTimeout(() => {
          applyUpdate();
        }, 350);
      } else {
        setLiveToast('✅ Podaci osvježeni • Najnovija verzija');
        setTimeout(() => setLiveToast(null), 2500);
      }
    } catch (err) {
      console.error('Pull to refresh failed:', err);
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
    if (showUpdateModal) {
      setShowUpdateModal(false);
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
  const hasOpenModal = isLoginModalOpen || isApkModalOpen || isExitModalOpen || showUpdateModal;

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

  // Fetch initial state via REST
  const fetchState = async () => {
    try {
      const res = await fetch(apiUrl('/api/state'));
      if (res.ok) {
        const data = await res.json();
        if (data.state) {
          setCompetitionState(data.state);
          try {
            localStorage.setItem('lignjolov_competition_state', JSON.stringify(data.state));
          } catch {
            // ignore
          }
        }
      }
    } catch (err) {
      console.warn('Greška pri dohvaćanju stanja (korištenje lokalnih podataka):', err);
    }
  };

  // Real-time SSE synchronization + Live OTA listener
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
              setCompetitionState(data.state);

              if (data.type === 'UPDATE_STATE') {
                setLiveToast('⚡ Rezultati ažurirani u stvarnom vremenu!');
                setTimeout(() => setLiveToast(null), 3500);
              }
            } else if (data.type === 'OTA_UPDATE_AVAILABLE') {
              // Real-time OTA broadcast received from server!
              checkForUpdates(true);
              setLiveToast(`🚀 Novo Live OTA ažuriranje (v${data.version || '1.0'})!`);
              setTimeout(() => setLiveToast(null), 4000);
            }
          } catch {
            // keep-alive heartbeat or other comments
          }
        };

        es.onerror = () => {
          setIsLiveConnected(false);
          es.close();
          setTimeout(connectSSE, 4000);
        };
      } catch (err) {
        console.error('SSE connect failed:', err);
        setIsLiveConnected(false);
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

      {/* Floating OTA Update Banner if newer version is available */}
      <OTAUpdateBanner
        isUpdateAvailable={isUpdateAvailable && showUpdateModal}
        remoteInfo={remoteVersionInfo}
        currentVersion={currentVersion}
        onApplyUpdate={applyUpdate}
        onDismiss={() => setShowUpdateModal(false)}
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

      {/* Mobile-Adaptive Footer with OTA link */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950/90 py-3.5 px-4 text-center text-xs text-slate-500 safe-bottom">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400">⚓</span>
            <span className="font-semibold text-slate-400">
              Kup Lignja & Sipa Novi Vinodolski (18.11. – 22.11.2026)
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
            <span className="font-mono text-[11px] text-slate-400">v{currentVersion}</span>
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
        onApplyUpdate={applyUpdate}
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
