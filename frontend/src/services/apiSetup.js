import axios from 'axios';
import { store } from '../store';

export const getBackendUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  const hostname = window.location.hostname;
  
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
  
  // If running in production (Vercel), connect to deployed backend URL
  // You can set VITE_BACKEND_URL in Vercel environment variables.
  return import.meta.env.VITE_BACKEND_URL || 'https://connect-vendor.onrender.com';
};

// Set up Axios request interceptor to dynamically rewrite backend URLs and inject headers
axios.interceptors.request.use(
  (config) => {
    const backendUrl = getBackendUrl();
    if (config.url && (config.url.includes(':8000') || config.url.includes(':8001') || config.url.includes(':8002'))) {
      // Replaces http://localhost:8002 or http://${window.location.hostname}:8002 with the active backendUrl
      config.url = config.url.replace(/^http:\/\/[^/]+:(8000|8001|8002)/, backendUrl);
      
      // If we are communicating over HTTPS, rewrite the URL protocol to https
      if (backendUrl.startsWith('https://')) {
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
// This runs once so that by the time the user interacts, the backend is ready
const wakeUpBackend = async () => {
  try {
    const backendUrl = getBackendUrl();
    await fetch(`${backendUrl}/`, { method: 'GET', mode: 'cors' });
    console.log('✅ Backend is awake');
  } catch (err) {
    console.warn('⏳ Backend is waking up, it may take a moment...');
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

