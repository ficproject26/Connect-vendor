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
  
  // 3. Fallback to production backend URL
  return 'https://vendor.ficapp.in';
};

export const getWebSocketUrl = () => {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isLocalHost = !hostname || 
    hostname === 'localhost' || 
    hostname === '127.0.0.1' || 
    hostname.startsWith('192.168.') || 
    hostname.startsWith('10.') ||
    hostname.startsWith('172.');

  // 1. Explicit environment variable override
  let envWs = import.meta.env.VITE_WS_URL || import.meta.env.VITE_SOCKET_URL;
  if (envWs && typeof envWs === 'string') {
    envWs = envWs.trim().replace(/\/+$/, '');
    if (isLocalHost || (!envWs.includes('localhost') && !envWs.includes('127.0.0.1'))) {
      return envWs;
    }
  }

  // 2. If running locally, connect directly to local backend on port 8002
  if (isLocalHost) {
    return `http://${hostname || 'localhost'}:8002`;
  }

  // 3. Vercel deployments (e.g. connect-vendor.vercel.app):
  // The remote api.ficapp.in WebSocket CORS policy strictly restricts origins to *.ficapp.in.
  // Static Vercel deployments do not have CORS access to api.ficapp.in and cannot host WebSockets.
  // Returning null allows the application to cleanly use HTTP background synchronization without console CORS errors.
  if (hostname.endsWith('vercel.app')) {
    return null;
  }

  // 4. Production ficapp.in domains (e.g. vendor.ficapp.in):
  // Connect to the ecosystem Socket.IO cluster on https://api.ficapp.in (allowed by api.ficapp.in CORS policy)
  if (hostname.endsWith('.ficapp.in') || hostname === 'ficapp.in') {
    return 'https://api.ficapp.in';
  }

  return null;
};

// Set up Axios request interceptor to dynamically rewrite backend URLs and inject headers
axios.interceptors.request.use(
  (config) => {
    if (!config.timeout) {
      config.timeout = 25000; // 25-second timeout for responsive failure handling
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
        config.url = config.url.replace(/^https?:\/\/[^/]+/, backendUrl || 'https://vendor.ficapp.in');
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

    // Attach token automatically if missing or invalid
    try {
      const state = store?.getState();
      const token = state?.auth?.token || localStorage.getItem('vendor_token') || localStorage.getItem('token');
      const authHeader = config.headers.Authorization || config.headers.authorization;
      if (token && (!authHeader || authHeader === 'Bearer undefined' || authHeader === 'Bearer null' || authHeader === 'Bearer ')) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Attach activeBusinessId header automatically if missing
      const activeBusinessId = state?.auth?.activeBusinessId || localStorage.getItem('active_business_id');
      if (activeBusinessId && (!config.headers['x-business-id'] || config.headers['x-business-id'] === 'undefined' || config.headers['x-business-id'] === 'null')) {
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

// --- In-Flight Deduplication & Read-Through Client Cache ---
const inFlightGetRequests = new Map();
const apiGetCache = new Map();
const DEFAULT_CACHE_TTL_MS = 25000; // 25s safe TTL for read-only GET endpoints

export const clearApiCache = (pattern) => {
  if (!pattern) {
    apiGetCache.clear();
  } else {
    for (const key of apiGetCache.keys()) {
      if (key.includes(pattern)) {
        apiGetCache.delete(key);
      }
    }
  }
};

export const cachedGet = async (url, config = {}) => {
  const cacheKey = `${url}:${JSON.stringify(config.params || {})}:${config.headers?.['x-business-id'] || 'default'}`;
  const now = Date.now();
  const cached = apiGetCache.get(cacheKey);
  if (cached && cached.expiry > now) {
    return cached.data;
  }

  if (inFlightGetRequests.has(cacheKey)) {
    return inFlightGetRequests.get(cacheKey);
  }

  const reqPromise = axios.get(url, config)
    .then(res => {
      apiGetCache.set(cacheKey, { data: res, expiry: Date.now() + DEFAULT_CACHE_TTL_MS });
      return res;
    })
    .finally(() => {
      inFlightGetRequests.delete(cacheKey);
    });

  inFlightGetRequests.set(cacheKey, reqPromise);
  return reqPromise;
};

// --- RETRY LOGIC for sleeping or transient network blips ---
// Bounded retries: max 2 retries with fast 1s, 2s delays (total max delay 3s)
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

const sanitizeResponseUrls = (val, backendUrl) => {
  if (!val) return val;
  if (typeof val === 'string') {
    if (val.includes('trycloudflare.com')) {
      return val.replace(/^https?:\/\/[^/]+/, backendUrl || '');
    }
    if (val.includes('vendor.ficapp.in/uploads/')) {
      const activeB = (backendUrl && backendUrl.startsWith('http')) ? backendUrl : 'https://vendor.ficapp.in';
      return val.replace(/^https?:\/\/vendor\.ficapp\.in/, activeB);
    }
    return val;
  }
  if (typeof val !== 'object') {
    return val;
  }
  if (val instanceof Date || val instanceof RegExp || (typeof Blob !== 'undefined' && val instanceof Blob)) {
    return val;
  }
  if (Array.isArray(val)) {
    for (let i = 0; i < val.length; i++) {
      val[i] = sanitizeResponseUrls(val[i], backendUrl);
    }
    return val;
  }
  if (val.$$typeof || (typeof HTMLElement !== 'undefined' && val instanceof HTMLElement)) {
    return val;
  }
  for (const k of Object.keys(val)) {
    val[k] = sanitizeResponseUrls(val[k], backendUrl);
  }
  return val;
};

axios.interceptors.response.use(
  (response) => {
    if (response && response.data) {
      const activeBackend = getBackendUrl();
      response.data = sanitizeResponseUrls(response.data, activeBackend);

      // Automatic cache invalidation on mutations
      const method = (response.config?.method || '').toLowerCase();
      if (['post', 'put', 'delete', 'patch'].includes(method)) {
        const url = response.config?.url || '';
        if (url.includes('/products')) {
          clearApiCache('/products');
          clearApiCache('/analytics');
        } else if (url.includes('/orders') || url.includes('/bookings')) {
          clearApiCache('/orders');
          clearApiCache('/bookings');
          clearApiCache('/analytics');
        } else if (url.includes('/customers')) {
          clearApiCache('/customers');
        } else if (url.includes('/delivery-partners')) {
          clearApiCache('/delivery-partners');
        } else if (url.includes('/business')) {
          clearApiCache('/business');
          clearApiCache('/profile');
          clearApiCache('/analytics');
        } else if (url.includes('/profile')) {
          clearApiCache('/profile');
        }
      }
    }
    return response;
  },
  async (error) => {
    const config = error.config;

    const isAuthRoute = config?.url && (
      config.url.includes('/api/auth/login') ||
      config.url.includes('/api/auth/register')
    );

    // Intercept 503 Service Unavailable responses
    if (error.response?.status === 503) {
      const errorMsg = 'Backend server is temporarily unavailable (HTTP 503). Please try again in a moment.';
      if (typeof error.response.data !== 'object' || !error.response.data) {
        error.response.data = { success: false, message: errorMsg };
      } else if (!error.response.data.message) {
        error.response.data.message = errorMsg;
      }
      error.message = errorMsg;
    }

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

    // Increment retry count with bounded 15s timeout
    config.__retryCount = (config.__retryCount || 0) + 1;
    config.timeout = 15000; // 15s timeout for fast, bounded recovery
    const delay = RETRY_DELAY_MS * config.__retryCount; // 1s, 2s

    // On network error retry, correctly rewrite failed local URL to remote production backend
    if (isNetworkError && config.url) {
      if (config.url.startsWith('/api')) {
        config.url = `https://vendor.ficapp.in${config.url}`;
      } else if (config.url.includes('/api/')) {
        const apiPath = config.url.substring(config.url.indexOf('/api/'));
        config.url = `https://vendor.ficapp.in${apiPath}`;
      }
    }

    console.warn(
      `⏳ Backend not responding (attempt ${config.__retryCount}/${MAX_RETRIES}). Retrying in ${delay / 1000}s...`
    );

    // Wait before retrying
    await new Promise((resolve) => setTimeout(resolve, delay));

    return axios(config);
  }
);

export const getAdminBackendUrl = () => {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  
  if (
    !hostname || 
    hostname === 'localhost' || 
    hostname === '127.0.0.1' || 
    hostname.startsWith('192.168.') || 
    hostname.startsWith('10.')
  ) {
    return `http://${hostname || 'localhost'}:5001`;
  }
  
  let adminUrl = import.meta.env.VITE_ADMIN_BACKEND_URL;
  if (adminUrl && typeof adminUrl === 'string') {
    adminUrl = adminUrl.trim().replace(/\/+$/, '');
    if (!adminUrl.includes('trycloudflare.com') && !adminUrl.includes('onrender.com')) {
      return adminUrl;
    }
  }

  return getBackendUrl();
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

  if (clean.includes('res.cloudinary.com')) {
    let cUrl = clean.startsWith('http://res.cloudinary.com') ? clean.replace(/^http:\/\//, 'https://') : clean;
    if (cUrl.includes('/upload/') && !cUrl.includes('/upload/f_auto') && !cUrl.includes('/upload/q_auto') && !cUrl.includes('/upload/w_')) {
      cUrl = cUrl.replace('/upload/', '/upload/f_auto,q_auto,w_500,c_limit/');
    }
    return cUrl;
  }

  let backend = getBackendUrl();
  if (!backend || !backend.startsWith('http')) {
    backend = 'https://vendor.ficapp.in';
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
    // If already pointing to vendor.ficapp.in or another secure remote host, enforce HTTPS and ensure /api/uploads/
    if (clean.includes('vendor.ficapp.in')) {
      let httpsUrl = clean.replace(/^http:\/\//, 'https://');
      if (httpsUrl.includes('vendor.ficapp.in/uploads/') && !httpsUrl.includes('vendor.ficapp.in/api/uploads/')) {
        httpsUrl = httpsUrl.replace('vendor.ficapp.in/uploads/', 'vendor.ficapp.in/api/uploads/');
      }
      return httpsUrl;
    }
    return clean;
  }

  // If URL contains /uploads/ and is a relative path
  if (clean.includes('/uploads/')) {
    const uploadPath = clean.substring(clean.indexOf('/uploads/'));
    const apiUploadPath = uploadPath.startsWith('/api/') ? uploadPath : `/api${uploadPath}`;
    return `${backend}${apiUploadPath}`;
  }

  const cleanPath = clean.startsWith('/') ? clean : `/${clean}`;
  return `${backend}${cleanPath}`;
};

