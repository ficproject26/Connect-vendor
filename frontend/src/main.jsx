import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import App from './App';
import './services/apiSetup';
import './index.css';

// Suppress Chrome extension message channel disconnect warnings
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
      msg.includes('runtime.lasterror')
    );
  };

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
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);
