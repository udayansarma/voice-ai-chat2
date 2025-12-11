import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { CssBaseline } from '@mui/material';
import './index.css';
import App from './App';
import { loadRuntimeConfig } from './utils/runtimeConfig';
import ErrorFallback from './components/ErrorFallback';
import { PersonaScenarioProvider } from './context/PersonaScenarioContext';
import { MoodProvider } from './context/MoodContext';
import { AuthProvider } from './context/AuthContext';

const root = createRoot(document.getElementById('root')!);

// Determine runtime config endpoint from environment variable or fallback to derivation
function deriveConfigEndpoint(): string {
  // Check if we have a runtime config URL from app settings via config.js
  const runtimeConfigUrl = (window as any).ENV?.RUNTIME_CONFIG_URL;
  if (runtimeConfigUrl) {
    return runtimeConfigUrl;
  }
  
  // Fallback: derive from build-time API URL
  const buildTime = (import.meta as any).env?.VITE_API_URL as string | undefined;
  try {
    if (buildTime && /^https?:\/\//i.test(buildTime)) {
      const u = new URL(buildTime);
      return `${u.origin}/runtime-config`;
    }
  } catch {
    /* ignore */
  }
  return `${window.location.origin.replace(/\/$/, '')}/runtime-config`;
}

// Initialize the runtime configuration asynchronously
loadRuntimeConfig(deriveConfigEndpoint()).finally(() => {
  root.render(
    <StrictMode>
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onReset={() => {
          window.location.href = '/';
        }}
      >
        <CssBaseline />
        <Router>
          <AuthProvider>
            <MoodProvider>
              <PersonaScenarioProvider>
                <App />
              </PersonaScenarioProvider>
            </MoodProvider>
          </AuthProvider>
        </Router>
      </ErrorBoundary>
    </StrictMode>
  );
});
