import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

// Automatically recover from stale chunk loading errors
window.addEventListener('error', (e) => {
  const msg = e?.message || '';
  if (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Loading chunk') ||
    msg.includes('Loading CSS chunk')
  ) {
    const hasReloaded = sessionStorage.getItem('chunk_reload_attempted');
    if (!hasReloaded) {
      sessionStorage.setItem('chunk_reload_attempted', 'true');
      console.warn('Chunk load failure detected. Reloading page to fetch updated assets...');
      window.location.reload();
    }
  }
});

// Clear reload flag once application starts cleanly
setTimeout(() => {
  sessionStorage.removeItem('chunk_reload_attempted');
}, 5000);

// Register Progressive Web App (PWA) Service Worker for Android / Chrome / Mobile installability
if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
  const registerPwaServiceWorker = () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('[PWA] Service Worker registered successfully with scope:', registration.scope);
      })
      .catch((err) => {
        console.warn('[PWA] Service Worker registration failed:', err);
      });
  };

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    registerPwaServiceWorker();
  } else {
    window.addEventListener('load', registerPwaServiceWorker);
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}
