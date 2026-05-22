import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// cPanel / Shared Hosting PHP URL Interceptor:
// Automatically rewrites API calls to /api.php?route=... if deployed outside local development
// to bypass potential server-side Apache mod_rewrite / htaccess constraints.
const originalFetch = window.fetch;

const getAppBasePath = () => {
  let basePath = window.location.pathname;
  if (basePath.endsWith('/index.html')) {
    basePath = basePath.slice(0, -11);
  }
  if (basePath.endsWith('/')) {
    basePath = basePath.slice(0, -1);
  }
  return basePath;
};

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
      const basePath = getAppBasePath();
      url = `${basePath}/api.php?route=${routePath}`;
    }
  }
  
  return originalFetch(url, init);
};

try {
  (window as any).fetch = customFetch;
} catch (e) {
  try {
    Object.defineProperty(window, 'fetch', {
      value: customFetch,
      configurable: true,
      writable: true,
      enumerable: true
    });
  } catch (err) {
    console.warn("Failed to intercept fetch global:", err);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
