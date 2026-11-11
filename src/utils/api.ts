/**
 * API base URL resolver for Lignjolov web & Android APK (Capacitor)
 * Ensures API requests route correctly whether running:
 * 1. On live web (relative /api/...)
 * 2. In Capacitor Android APK (resolves to Cloud Run production backend)
 * 3. In local dev (http://localhost:3000)
 */

export const DEFAULT_PRODUCTION_BACKEND = 'https://ais-pre-wb3fx5qrmhv4x24j6xxbnk-294488753863.europe-west2.run.app';

export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return '';

  // 1. Explicit override if set
  const customOverride = localStorage.getItem('lignjolov_backend_url');
  if (customOverride && customOverride.trim().length > 0) {
    return customOverride.trim().replace(/\/$/, '');
  }

  // 2. Vite env var
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  if (envUrl) {
    return envUrl.trim().replace(/\/$/, '');
  }

  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const port = window.location.port;

  // 3. Detect if running inside Android APK / Capacitor or file protocol
  const isCapacitorOrLocalMobile =
    (window as any).Capacitor !== undefined ||
    protocol === 'capacitor:' ||
    protocol === 'file:' ||
    (hostname === 'localhost' && port !== '3000' && port !== '5173');

  if (isCapacitorOrLocalMobile) {
    return DEFAULT_PRODUCTION_BACKEND;
  }

  // 4. Running directly on web or dev server: relative URL works seamlessly
  return '';
}

/**
 * Prepares endpoint to full absolute URL if needed by mobile APK, or relative URL if on web.
 */
export function apiUrl(endpoint: string): string {
  const base = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (!base) return cleanEndpoint;
  return `${base}${cleanEndpoint}`;
}
