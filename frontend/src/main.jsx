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
    const msg = (err.message || err.reason || err.stack || String(err)).toLowerCase();
    return (
      msg.includes('message channel closed') ||
      msg.includes('listener indicated an asynchronous response') ||
      msg.includes('runtime.lasterror')
    );
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
