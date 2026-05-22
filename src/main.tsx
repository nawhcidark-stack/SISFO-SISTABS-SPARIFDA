import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// cPanel / Shared Hosting PHP URL Interceptor:
// Automatically rewrites API calls to /api.php?route=... if deployed outside local development
// to bypass potential server-side Apache mod_rewrite / htaccess constraints.
const originalFetch = window.fetch;
const customFetch = async function (input: RequestInfo | URL, init?: RequestInit) {
  let url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : (input as Request).url);
  
  if (url.startsWith('/api/') && !url.includes('/api/notifications/stream')) {
    const isLocalDev = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' || 
                       window.location.hostname.includes('.run.app') || 
                       window.location.hostname.includes('gitpod') || 
                       window.location.hostname.includes('codesandbox') ||
                       window.location.port !== '';
                       
    if (!isLocalDev) {
      const routePath = url.replace('/api/', '');
      url = `/api.php?route=${routePath}`;
    }
  }
  
  return originalFetch(url, init);
};

try {
  Object.defineProperty(window, 'fetch', {
    value: customFetch,
    configurable: true,
    writable: true,
    enumerable: true
  });
} catch (e) {
  try {
    (window as any).fetch = customFetch;
  } catch (err) {
    console.error("Failed to intercept fetch global:", err);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
