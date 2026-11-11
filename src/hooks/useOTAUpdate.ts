import { useState, useEffect, useCallback } from 'react';

export interface OTAVersionInfo {
  version: string;
  buildTimestamp: string;
  appName: string;
  apkName: string;
  minVersion: string;
  otaChannel: string;
  features: string[];
}

export function useOTAUpdate() {
  const [currentVersion, setCurrentVersion] = useState<string>('1.0.0');
  const [remoteVersionInfo, setRemoteVersionInfo] = useState<OTAVersionInfo | null>(null);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date>(new Date());
  const [showUpdateModal, setShowUpdateModal] = useState<boolean>(false);

  // Compare semantic versions
  const compareVersions = (v1: string, v2: string) => {
    const parts1 = v1.split('.').map((p) => parseInt(p, 10) || 0);
    const parts2 = v2.split('.').map((p) => parseInt(p, 10) || 0);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const num1 = parts1[i] || 0;
      const num2 = parts2[i] || 0;
      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }
    return 0;
  };

  const checkForUpdates = useCallback(async (manual = false) => {
    setIsChecking(true);
    try {
      // Bust cache using query param
      const res = await fetch(`/api/app-version?t=${Date.now()}`);
      if (!res.ok) throw new Error('Neuspjelo dohvaćanje verzije.');

      const data: OTAVersionInfo = await res.json();
      setRemoteVersionInfo(data);
      setLastCheckedAt(new Date());

      const localVer = localStorage.getItem('lignjolov_installed_version') || '1.0.0';
      setCurrentVersion(localVer);

      const hasNewer = compareVersions(data.version, localVer) > 0;
      if (hasNewer) {
        setIsUpdateAvailable(true);
        setShowUpdateModal(true);
      } else {
        setIsUpdateAvailable(false);
      }

      return hasNewer;
    } catch (err) {
      console.error('Greška pri provjeri OTA ažuriranja:', err);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Apply OTA Update: Cache busting + Service Worker update + instant reload
  const applyUpdate = useCallback(async () => {
    try {
      // 1. Clear caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }

      // 2. Unregister or skipWaiting service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.update();
        }
      }

      // 3. Update local stored version
      if (remoteVersionInfo?.version) {
        localStorage.setItem('lignjolov_installed_version', remoteVersionInfo.version);
      }

      // 4. Reload page cleanly from server
      window.location.reload();
    } catch (err) {
      console.error('Greška pri primjeni ažuriranja:', err);
      window.location.reload();
    }
  }, [remoteVersionInfo]);

  // Initial check on mount
  useEffect(() => {
    checkForUpdates();

    // Re-check when mobile user switches back to the app from background
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', () => checkForUpdates());

    // Interval check every 5 minutes in background
    const interval = setInterval(() => {
      checkForUpdates();
    }, 5 * 60 * 1000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [checkForUpdates]);

  return {
    currentVersion,
    remoteVersionInfo,
    isUpdateAvailable,
    isChecking,
    lastCheckedAt,
    showUpdateModal,
    setShowUpdateModal,
    checkForUpdates,
    applyUpdate,
  };
}
