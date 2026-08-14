import axios from 'axios';
import { store } from '../store';

export const getBackendUrl = () => {
  let envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL;
  if (envUrl && typeof envUrl === 'string') {
    envUrl = envUrl.trim().replace(/\/+$/, '');
    if (!envUrl.includes('trycloudflare.com')) {
      if (envUrl.endsWith('/api')) {
        envUrl = envUrl.substring(0, envUrl.length - 4);
      }
      return envUrl;
    }
  }
  
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  
  // If running locally, connect to local backend on port 8002
  if (
    !hostname || 
    hostname === 'localhost' || 
    hostname === '127.0.0.1' || 
    hostname.startsWith('192.168.') || 
    hostname.startsWith('10.')
  ) {
    return `http://${hostname || 'localhost'}:8002`;
  }
  
  // Deployed backend URL fallback
  return 'http://43.204.141.105:8002';
};

// Set up Axios request interceptor to dynamically rewrite backend URLs and inject headers
axios.interceptors.request.use(
  (config) => {
    const backendUrl = getBackendUrl();
    if (config.url) {
      if (
        config.url.includes(':8000') || 
        config.url.includes(':8001') || 
        config.url.includes(':8002') ||
        config.url.includes('trycloudflare.com')
      ) {
        // Replaces localhost ports or stale cloud tunnels with active backendUrl
        config.url = config.url.replace(/^https?:\/\/[^/]+/, backendUrl);
      } else if (config.url.startsWith('/api')) {
        config.url = `${backendUrl}${config.url}`;
      }
      
      // If backend is HTTPS, enforce HTTPS on config.url
      if (backendUrl.startsWith('https://') && config.url.startsWith('http://')) {
        config.url = config.url.replace(/^http:\/\//, 'https://');
      }
    }

    if (!config.headers) {
      config.headers = {};
    }

    // Attach token automatically if missing
    try {
      const state = store?.getState();
      const token = state?.auth?.token || localStorage.getItem('vendor_token');
      if (token && !config.headers.Authorization && !config.headers.authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Attach activeBusinessId header automatically if missing
      const activeBusinessId = state?.auth?.activeBusinessId || localStorage.getItem('active_business_id');
      if (activeBusinessId && !config.headers['x-business-id']) {
        config.headers['x-business-id'] = activeBusinessId;
      }
    } catch (e) {
      console.warn('Error applying auth/business headers in Axios interceptor:', e);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- RETRY LOGIC for sleeping Render backend ---
// Retry up to 3 times with increasing delay when backend is waking up
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000; // start with 3 seconds

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    const isAuthOrSuspendedError = error.response && (
      error.response.status === 401 ||
      error.response.status === 403 ||
      error.response.data?.isTerminated ||
      (error.response.data?.message && /suspended|inactive|rejected|not authorized|denied|terminated/i.test(error.response.data.message))
    );

    // Don't retry if no config, or already retried max times, or it's a client error (4xx)
    if (!config || config.__retryCount >= MAX_RETRIES) {
      if (isAuthOrSuspendedError) {
        console.warn('Session expired or account suspended, clearing storage and logging out...');
        localStorage.removeItem('vendor_user');
        localStorage.removeItem('vendor_token');
        localStorage.removeItem('vendor_card');
        localStorage.removeItem('active_business_id');
        if (error.response?.data?.message) {
          alert(error.response.data.message);
        }
        window.location.href = '/';
      }
      return Promise.reject(error);
    }

    // Only retry on network errors (no response) or 5xx server errors (backend waking up)
    const isNetworkError = !error.response;
    const isServerError = error.response && error.response.status >= 500;

    if (!isNetworkError && !isServerError) {
      if (isAuthOrSuspendedError) {
        console.warn('Session expired or account suspended, clearing storage and logging out...');
        localStorage.removeItem('vendor_user');
        localStorage.removeItem('vendor_token');
        localStorage.removeItem('vendor_card');
        localStorage.removeItem('active_business_id');
        if (error.response?.data?.message) {
          alert(error.response.data.message);
        }
        window.location.href = '/';
      }
      return Promise.reject(error);
    }

    // Increment retry count
    config.__retryCount = (config.__retryCount || 0) + 1;
    const delay = RETRY_DELAY_MS * config.__retryCount; // 3s, 6s, 9s

    console.warn(
      `⏳ Backend not responding (attempt ${config.__retryCount}/${MAX_RETRIES}). Retrying in ${delay / 1000}s...`
    );

    // Wait before retrying
    await new Promise((resolve) => setTimeout(resolve, delay));

    return axios(config);
  }
);

// --- WAKE-UP PING ---
// When the app loads, send a lightweight ping to wake up the Render backend
const wakeUpBackend = async () => {
  try {
    const backendUrl = getBackendUrl();
    if (!backendUrl) return;
    await fetch(`${backendUrl}/`, { method: 'GET', mode: 'cors' }).catch(() => {});
  } catch (err) {
    // Ignore initial wake-up ping errors
  }
};

// Fire the wake-up ping immediately on import
wakeUpBackend();

export const getAdminBackendUrl = () => {
  const hostname = window.location.hostname;
  
  if (
    !hostname || 
    hostname === 'localhost' || 
    hostname === '127.0.0.1' || 
    hostname.startsWith('192.168.') || 
    hostname.startsWith('10.')
  ) {
    return `http://${hostname || 'localhost'}:5001`;
  }
  
  return import.meta.env.VITE_ADMIN_BACKEND_URL || 'https://connect-admin-96pc.onrender.com';
};

export const getVendorBackendUrl = () => {
  return getBackendUrl();
};

