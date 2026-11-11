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
import { useOTAUpdate } from './hooks/useOTAUpdate';
import { RefreshCw, Sparkles } from 'lucide-react';

export default function App() {
  const [competitionState, setCompetitionState] = useState<CompetitionState | null>(null);
  const [currentUser, setCurrentUser] = useState<Member | null>(null);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'entry' | 'solunar' | 'log'>('leaderboard');
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isApkModalOpen, setIsApkModalOpen] = useState<boolean>(false);
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
      const res = await fetch('/api/state');
      const data = await res.json();
      if (data.state) {
        setCompetitionState(data.state);
      }
    } catch (err) {
      console.error('Greška pri dohvaćanju stanja:', err);
    }
  };

  // Real-time SSE synchronization + Live OTA listener
  useEffect(() => {
    fetchState();

    const connectSSE = () => {
      try {
        const es = new EventSource('/api/stream');
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
        {!competitionState ? (
          <div className="py-24 text-center">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-3" />
            <h3 className="text-base font-bold text-white">Učitavanje podataka o natjecanju...</h3>
            <p className="text-xs text-slate-400 mt-1">Povezivanje s bazom u Novom Vinodolskom</p>
          </div>
        ) : (
          <>
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
          </>
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
    </div>
  );
}
