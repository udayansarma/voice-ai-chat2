// Runtime configuration loader for dynamic API base URL (Option 2)
// Fetches /runtime-config from the server (can be cross-origin) to allow
// updating API endpoint via App Service settings without rebuilding client.
// Falls back gracefully to build-time VITE_API_URL.

export interface RuntimeConfig {
  apiBaseUrl: string;
  updatedAt?: string;
}

let cachedConfig: RuntimeConfig | null = null;

export async function loadRuntimeConfig(configEndpoint: string): Promise<RuntimeConfig> {
  if (cachedConfig) return cachedConfig;
  try {
    const resp = await fetch(configEndpoint, { credentials: 'include' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    cachedConfig = {
      apiBaseUrl: json.apiBaseUrl || '',
      updatedAt: json.updatedAt,
    };
  } catch (err) {
    cachedConfig = {
      apiBaseUrl: (import.meta as any).env?.VITE_API_URL || '',
    };
  }
  return cachedConfig;
}

export function getRuntimeApiBaseUrl() {
  // First try the cached runtime config (from server's /runtime-config endpoint)
  if (cachedConfig?.apiBaseUrl) {
    return cachedConfig.apiBaseUrl;
  }
  
  // Fallback to window.ENV (from config.js) 
  const windowApiUrl = (window as any).ENV?.VITE_API_URL;
  if (windowApiUrl) {
    // If the window ENV has /api, strip it since we want the base URL
    try {
      const url = new URL(windowApiUrl);
      return url.origin;
    } catch {
      return windowApiUrl.replace(/\/api$/, '');
    }
  }
  
  // Final fallback to build-time env (strip trailing /api if present)
  const buildUrl = (import.meta as any).env?.VITE_API_URL || '';
  try {
    if (buildUrl && /^https?:\/\//i.test(buildUrl)) {
      const u = new URL(buildUrl);
      return u.origin;
    }
  } catch {/* ignore */}
  return buildUrl.replace(/\/?api\/?$/i, '');
}
