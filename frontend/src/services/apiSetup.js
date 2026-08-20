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
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  
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
  
  // If deployed on HTTPS (e.g. Vercel connect-vendor.vercel.app), use relative path to route through Vercel proxy rewrites
  if (isHttps) {
    return '';
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
        config.url.includes('trycloudflare.com') ||
        config.url.includes('43.204.141.105')
      ) {
        // Replaces localhost ports or stale cloud tunnels/IPs with active backendUrl
        config.url = config.url.replace(/^https?:\/\/[^/]+/, backendUrl);
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

    const isAuthOrSuspendedError = !isAuthRoute && error.response && (
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

export const formatImageUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  let clean = url.trim();
  if (!clean || clean.toLowerCase().startsWith('preview')) return '';

  if (clean.startsWith('data:') || clean.startsWith('blob:')) {
    return clean;
  }

  let backend = getBackendUrl();
  if (!backend && typeof window !== 'undefined') {
    const hostname = window.location.hostname || 'localhost';
    backend = `http://${hostname}:8002`;
  }
  if (backend && backend.endsWith('/api')) {
    backend = backend.substring(0, backend.length - 4);
  }

  // Rewrite stale Cloudflare tunnel hostnames or outdated ports/IPs to active backend URL
  if (
    clean.includes('trycloudflare.com') ||
    clean.includes(':8000') ||
    clean.includes(':8001') ||
    clean.includes('43.204.141.105')
  ) {
    clean = clean.replace(/^https?:\/\/[^/]+/, backend || '');
    return clean;
  }

  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }

  const cleanPath = clean.startsWith('/') ? clean : `/${clean}`;
  return `${backend}${cleanPath}`;
};

