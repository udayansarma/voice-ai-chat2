import axios from 'axios';
import { getItem, setItem } from '../utils/localStorage';
import { getRuntimeApiBaseUrl } from './runtimeConfig';

// Runtime configuration from window.ENV (loaded from /config.js)
declare global {
  interface Window {
    ENV: {
      VITE_API_URL: string;
      RUNTIME_CONFIG_URL?: string;
    };
  }
}

const getApiBaseUrl = () => getRuntimeApiBaseUrl();

// Create the client without a fixed baseURL so we can compute it per request
const apiClient = axios.create({
  withCredentials: true,
});

apiClient.interceptors.request.use(config => {
  // Derive server origin from runtime API base URL, stripping any path like '/api'
  const baseRaw = getApiBaseUrl() || '';
  let origin = '';
  try {
    origin = baseRaw ? new URL(baseRaw).origin : '';
  } catch {
    origin = baseRaw.replace(/\/?api\/?$/i, '').replace(/\/$/, '');
    try { origin = origin ? new URL(origin).origin : origin; } catch { /* keep best-effort */ }
  }

  let url = config.url ?? '';
  // If absolute URL already, leave it (assumes caller intended it)
  if (/^https?:\/\//i.test(url)) {
    try {
      const u = new URL(url);
      // Normalize duplicated /api segments at the beginning of pathname
      let p = u.pathname || '/';
      // Collapse multiple leading /api/ occurrences to a single
      p = p.replace(/^\/(?:api\/)+/i, '/api/');
      // Ensure single leading slash
      if (!p.startsWith('/')) p = '/' + p;
      u.pathname = p;
      config.url = u.toString();
    } catch {
      /* keep original absolute URL if parsing fails */
    }
    return config;
  }

  // Ensure request path starts with exactly one '/api'
  if (!url.startsWith('/')) url = '/' + url;
  if (!url.startsWith('/api')) url = '/api' + url;

  // Build absolute URL using the computed origin
  if (origin) {
    config.url = origin + url;
    // Remove baseURL to avoid axios re-merging
    delete (config as any).baseURL;
  } else {
    // Fallback to relative (will hit client origin) – acceptable only during local dev
    config.url = url;
  }

  return config;
});

// Attach x-session-id header from stored sessionId (fallback if cookie isn't stored)
apiClient.interceptors.request.use(config => {
  // Use localStorage utility for sessionId
  const sessionId = getItem<string>('sessionId');
  if (sessionId) {
    config.headers = config.headers || {};
    config.headers['x-session-id'] = sessionId;
  }
  return config;
});

// On login response, store sessionId for future headers
apiClient.interceptors.response.use(response => {
  if (response.config.url?.endsWith('/api/auth/login') && response.data?.sessionId) {
    setItem('sessionId', response.data.sessionId);
    apiClient.defaults.headers.common['x-session-id'] = response.data.sessionId;
  }
  return response;
});

export default apiClient;
