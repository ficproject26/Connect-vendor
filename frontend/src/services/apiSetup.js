import axios from 'axios';
import { store } from '../store';

export const getBackendUrl = () => {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const isLocalHost = !hostname || 
    hostname === 'localhost' || 
    hostname === '127.0.0.1' || 
    hostname.startsWith('192.168.') || 
    hostname.startsWith('10.') ||
    hostname.startsWith('172.');

  // 1. Check environment variables first if specified AND valid for current host
  let envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL;
  if (envUrl && typeof envUrl === 'string') {
    envUrl = envUrl.trim().replace(/\/+$/, '');
    if (envUrl.endsWith('/api')) {
      envUrl = envUrl.substring(0, envUrl.length - 4);
    }
    // Only use localhost envUrl if actually running on a local host
    if (isLocalHost || (!envUrl.includes('localhost') && !envUrl.includes('127.0.0.1'))) {
      if (!envUrl.includes('trycloudflare.com')) {
        return envUrl;
      }
    }
  }

  // 2. If running locally, connect directly to local backend on port 8002
  if (isLocalHost) {
    return `http://${hostname || 'localhost'}:8002`;
  }
  
  // 3. If deployed on HTTPS without envUrl, use relative path or fallback
  if (isHttps) {
    return '';
  }

  // Deployed backend URL fallback
  return 'https://connect-vendor.onrender.com';
};

// Set up Axios request interceptor to dynamically rewrite backend URLs and inject headers
axios.interceptors.request.use(
  (config) => {
    if (!config.timeout) {
      config.timeout = 45000; // 45-second timeout to accommodate Render sleeping cold starts
    }

    const backendUrl = getBackendUrl();
    if (config.url) {
      if (
        config.url.includes(':8000') || 
        config.url.includes(':8001') || 
        config.url.includes(':8002') ||
        config.url.includes('trycloudflare.com') ||
        config.url.includes('43.204.141.105') ||
        config.url.includes('13.203.197.69')
      ) {
        // Replaces localhost ports or stale cloud tunnels/IPs with active backendUrl
        config.url = config.url.replace(/^https?:\/\/[^/]+/, backendUrl || 'https://connect-vendor.onrender.com');
      } else if (config.url.startsWith('/api')) {
        config.url = backendUrl ? `${backendUrl}${config.url}` : config.url;
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

const sanitizeResponseUrls = (val, backendUrl) => {
  if (!val) return val;
  if (typeof val === 'string') {
    if (val.includes('trycloudflare.com')) {
      return val.replace(/^https?:\/\/[^/]+/, backendUrl || '');
    }
    return val;
  }
  if (Array.isArray(val)) {
    return val.map(v => sanitizeResponseUrls(v, backendUrl));
  }
  if (typeof val === 'object') {
    if (val.$$typeof || (typeof HTMLElement !== 'undefined' && val instanceof HTMLElement)) return val;
    for (const k in val) {
      if (Object.prototype.hasOwnProperty.call(val, k)) {
        val[k] = sanitizeResponseUrls(val[k], backendUrl);
      }
    }
    return val;
  }
  return val;
};

axios.interceptors.response.use(
  (response) => {
    if (response && response.data) {
      const activeBackend = getBackendUrl();
      response.data = sanitizeResponseUrls(response.data, activeBackend);
    }
    return response;
  },
  async (error) => {
    const config = error.config;

    const isAuthRoute = config?.url && (
      config.url.includes('/api/auth/login') ||
      config.url.includes('/api/auth/register')
    );

    if (isAuthRoute) {
      return Promise.reject(error);
    }

    const isPublicOrCategoryRoute = config?.url && (
      config.url.includes('/api/public') ||
      config.url.includes('/categories')
    );

    const isAuthOrSuspendedError = !isAuthRoute && !isPublicOrCategoryRoute && error.response && (
      error.response.status === 401 ||
      (error.response.status === 403 && (
        error.response.data?.isTerminated ||
        (error.response.data?.message && /suspended|inactive|rejected|account terminated/i.test(error.response.data.message))
      ))
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

    // Only retry on network errors (no response, timeout) or 5xx server errors (backend waking up)
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

    // Increment retry count and expand timeout on retries to allow sleeping backend to start
    config.__retryCount = (config.__retryCount || 0) + 1;
    config.timeout = 60000; // 60s timeout for retries
    const delay = RETRY_DELAY_MS * config.__retryCount; // 3s, 6s, 9s

    // On network error retry, fallback relative URL to explicit remote backend
    if (isNetworkError && config.url && config.url.startsWith('/api')) {
      config.url = `https://connect-vendor.onrender.com${config.url}`;
    }

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

export const formatImageUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  let clean = url.trim();
  if (!clean || clean.toLowerCase().startsWith('preview')) return '';

  if (clean.startsWith('data:')) {
    return clean;
  }
  if (clean.startsWith('blob:')) {
    try {
      if (typeof window !== 'undefined' && clean.includes(window.location.host)) {
        return clean;
      }
    } catch (e) {}
    return '';
  }

  let backend = getBackendUrl();
  if (!backend || !backend.startsWith('http')) {
    backend = 'https://connect-vendor.onrender.com';
  }
  if (backend.endsWith('/api')) {
    backend = backend.substring(0, backend.length - 4);
  }

  // If already an absolute HTTP/HTTPS URL
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    if (
      clean.includes('trycloudflare.com') ||
      clean.includes(':8000') ||
      clean.includes(':8001') ||
      clean.includes('43.204.141.105')
    ) {
      return clean.replace(/^https?:\/\/[^/]+/, backend);
    }
    return clean;
  }

  const cleanPath = clean.startsWith('/') ? clean : `/${clean}`;
  return `${backend}${cleanPath}`;
};

