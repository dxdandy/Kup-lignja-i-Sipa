import { useState, useEffect, useCallback } from 'react';
import { APP_VERSION, apiUrl, parseJsonIfValid } from '../utils/api';

export interface OTAVersionInfo {
  version: string;
  buildTimestamp: string;
  appName: string;
  apkName: string;
  minVersion: string;
  otaChannel: string;
  features: string[];
}

const VERSION_REGEX = /^\d+\.\d+\.\d+$/;

export function compareVersions(v1: string, v2: string): number {
  if (!VERSION_REGEX.test(v1)) return -1;
  if (!VERSION_REGEX.test(v2)) return 1;
  const parts1 = v1.split('.').map((p) => parseInt(p, 10) || 0);
  const parts2 = v2.split('.').map((p) => parseInt(p, 10) || 0);
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

function getSanitizedInstalledVersion(): string {
  try {
    const stored = localStorage.getItem('lignjolov_installed_version');
    if (stored && VERSION_REGEX.test(stored)) {
      // If the currently running bundle is already newer than stored version, upgrade stored version silently
      if (compareVersions(APP_VERSION, stored) > 0) {
        localStorage.setItem('lignjolov_installed_version', APP_VERSION);
        return APP_VERSION;
      }
      return stored;
    }
    localStorage.setItem('lignjolov_installed_version', APP_VERSION);
  } catch {
    // ignore storage errors
  }
  return APP_VERSION;
}

export function useOTAUpdate() {
  const [currentVersion, setCurrentVersion] = useState<string>(() => getSanitizedInstalledVersion());
  const [remoteVersionInfo, setRemoteVersionInfo] = useState<OTAVersionInfo | null>({
    version: APP_VERSION,
    buildTimestamp: new Date().toISOString(),
    appName: 'Lignjolov',
    apkName: `Lignjolov_v${APP_VERSION}.apk`,
    minVersion: '1.0.0',
    otaChannel: 'production-live',
    features: [
      'Tiho pozadinsko Live OTA ažuriranje čim se aplikacija pokrene',
      'Uklonjena greška Webpage not available na mobilnim uređajima',
      'Trenutni rad svih tabova (Tablica poretka, Dnevni unos, Solunar & AI, Dnevnik)',
      `Prikaz aktivne verzije aplikacije u podnožju (v${APP_VERSION})`,
    ],
  });
  const [isUpdateAvailable, setIsUpdateAvailable] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date>(new Date());
  const [showUpdateModal, setShowUpdateModal] = useState<boolean>(false);

  // Silent background cache clearing + reload
  const applyUpdate = useCallback(
    async (forcedVersion?: unknown) => {
      try {
        // 1. Clear browser / WebView caches silently
        if ('caches' in window) {
          try {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map((name) => caches.delete(name)));
          } catch {
            // ignore
          }
        }

        // 2. Update service workers if any exist
        if ('serviceWorker' in navigator) {
          try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const reg of registrations) {
              await reg.update();
            }
          } catch {
            // ignore
          }
        }

        // 3. Determine clean semantic version string (guard against React MouseEvent passed via onClick)
        const validForced =
          typeof forcedVersion === 'string' && VERSION_REGEX.test(forcedVersion)
            ? forcedVersion
            : undefined;
        const targetVersion =
          validForced ||
          (remoteVersionInfo?.version && VERSION_REGEX.test(remoteVersionInfo.version)
            ? remoteVersionInfo.version
            : APP_VERSION);

        try {
          localStorage.setItem('lignjolov_installed_version', targetVersion);
          sessionStorage.setItem(`ota_reloaded_v_${targetVersion}`, '1');
        } catch {
          // ignore
        }

        setCurrentVersion(targetVersion);
        setIsUpdateAvailable(false);
        setShowUpdateModal(false);

        // 4. Reload cleanly on the current origin (never redirect to unreachable external URLs)
        window.location.reload();
      } catch (err) {
        console.warn('Greška pri primjeni pozadinskog ažuriranja:', err);
      }
    },
    [remoteVersionInfo]
  );

  // Silent background check for updates
  const checkForUpdates = useCallback(
    async (_manual = false) => {
      setIsChecking(true);
      try {
        const localVer = getSanitizedInstalledVersion();
        setCurrentVersion(localVer);

        let data: OTAVersionInfo | null = null;

        // 1. Try backend /api/app-version
        try {
          const res = await fetch(apiUrl(`/api/app-version?t=${Date.now()}`), {
            cache: 'no-store',
          });
          data = await parseJsonIfValid(res);
        } catch {
          // ignore network error
        }

        // 2. Fallback to static /version.json (works in Capacitor APK & static hosting)
        if (!data) {
          try {
            const resStatic = await fetch(`/version.json?t=${Date.now()}`, {
              cache: 'no-store',
            });
            data = await parseJsonIfValid(resStatic);
          } catch {
            // ignore
          }
        }

        if (!data || !data.version || !VERSION_REGEX.test(data.version)) {
          return false;
        }

        setRemoteVersionInfo(data);
        setLastCheckedAt(new Date());

        const hasNewer = compareVersions(data.version, localVer) > 0;
        if (hasNewer) {
          // Silent background update right when detected!
          const alreadyReloaded = sessionStorage.getItem(`ota_reloaded_v_${data.version}`);
          if (!alreadyReloaded) {
            await applyUpdate(data.version);
            return true;
          } else {
            localStorage.setItem('lignjolov_installed_version', data.version);
            setCurrentVersion(data.version);
            setIsUpdateAvailable(false);
          }
        } else {
          setIsUpdateAvailable(false);
          setShowUpdateModal(false);
        }

        return false;
      } catch (err) {
        console.warn('Tiha provjera OTA ažuriranja:', err);
        return false;
      } finally {
        setIsChecking(false);
      }
    },
    [applyUpdate]
  );

  // Run silent check immediately on startup and when returning to foreground
  useEffect(() => {
    checkForUpdates(false);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates(false);
      }
    };

    const handleFocus = () => {
      checkForUpdates(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    const interval = setInterval(() => {
      checkForUpdates(false);
    }, 3 * 60 * 1000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
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
