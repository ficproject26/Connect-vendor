import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import App from './App';
import './services/apiSetup';
import './index.css';

// Suppress Chrome extension message channel disconnect warnings
// "Unchecked runtime.lastError" is emitted by Chrome itself (not JS console),
// caused by third-party extensions whose background scripts close before responding.
// Patching chrome.runtime.onMessage.addListener is the only reliable suppression.
if (typeof window !== 'undefined') {
  const isExtensionChannelError = (err) => {
    if (!err) return false;
    const msg = (
      typeof err === 'string'
        ? err
        : (err.message || err.reason || err.stack || (typeof err.toString === 'function' ? err.toString() : ''))
    ).toLowerCase();
    return (
      msg.includes('message channel closed') ||
      msg.includes('listener indicated an asynchronous response') ||
      msg.includes('runtime.lasterror') ||
      msg.includes('unchecked runtime')
    );
  };

  // Override console.error / console.warn to drop extension channel noise
  const origError = console.error;
  console.error = (...args) => {
    if (args.some(isExtensionChannelError)) return;
    origError.apply(console, args);
  };

  const origWarn = console.warn;
  console.warn = (...args) => {
    if (args.some(isExtensionChannelError)) return;
    origWarn.apply(console, args);
  };

  // Suppress unhandled rejections from extension message channels
  window.addEventListener('unhandledrejection', (event) => {
    if (isExtensionChannelError(event.reason) || isExtensionChannelError(event)) {
      event.preventDefault();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    }
  }, true);

  window.addEventListener('error', (event) => {
    if (isExtensionChannelError(event.message) || isExtensionChannelError(event.error)) {
      event.preventDefault();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    }
  }, true);

  // Patch chrome.runtime.onMessage.addListener so every listener auto-voids lastError.
  // This is the root cause fix: Chrome logs "Unchecked runtime.lastError" when any
  // message listener returns `true` (async) but the extension port closes without
  // the error being explicitly read. Wrapping listeners to always void lastError
  // marks it as "checked" and Chrome suppresses the DevTools warning entirely.
  const patchChromeRuntime = () => {
    try {
      const rt = window.chrome && window.chrome.runtime;
      if (!rt || !rt.onMessage || !rt.onMessage.addListener) return;
      if (rt.onMessage._patched) return; // prevent double-patching

      const origAddListener = rt.onMessage.addListener.bind(rt.onMessage);
      rt.onMessage.addListener = (listener) => {
        const wrapped = (message, sender, sendResponse) => {
          try { void window.chrome.runtime.lastError; } catch (_) {}
          let result;
          try {
            result = listener(message, sender, sendResponse);
          } catch (_) {
            try { void window.chrome.runtime.lastError; } catch (__) {}
            return false;
          }
          return result;
        };
        return origAddListener(wrapped);
      };
      rt.onMessage._patched = true;
    } catch (_) {}
  };

  // Apply immediately and after a short delay (extensions load asynchronously)
  try { void (window.chrome && window.chrome.runtime && window.chrome.runtime.lastError); } catch (_) {}
  patchChromeRuntime();
  setTimeout(patchChromeRuntime, 300);
  setTimeout(patchChromeRuntime, 1500);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);
