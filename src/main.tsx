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

// Unregister Service Worker and Clear Cache dynamically to fix the "blank screen / cache must be cleared" issue
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister().then((unregistered) => {
        if (unregistered) {
          console.log('Successfully unregistered stale service worker to prevent blank screen caching');
        }
      });
    }
  });
}

if ('caches' in window) {
  caches.keys().then((names) => {
    for (const name of names) {
      caches.delete(name).then(() => {
        console.log('Cleared static cache:', name);
      });
    }
  });
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
