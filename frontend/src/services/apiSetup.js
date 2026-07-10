import axios from 'axios';

export const getBackendUrl = () => {
  const hostname = window.location.hostname;
  
  // If running locally, connect to local backend on port 8000
  if (
    !hostname || 
    hostname === 'localhost' || 
    hostname === '127.0.0.1' || 
    hostname.startsWith('192.168.') || 
    hostname.startsWith('10.')
  ) {
    return `http://${hostname || 'localhost'}:8000`;
  }
  
  // If running in production (Vercel), connect to deployed backend URL
  // You can set VITE_BACKEND_URL in Vercel environment variables.
  return import.meta.env.VITE_BACKEND_URL || 'https://connect-vendor.onrender.com';
};

// Set up Axios request interceptor to dynamically rewrite backend URLs
axios.interceptors.request.use(
  (config) => {
    const backendUrl = getBackendUrl();
    if (config.url && config.url.includes(':8000')) {
      // Replaces http://localhost:8000 or http://${window.location.hostname}:8000 with the active backendUrl
      config.url = config.url.replace(/^http:\/\/[^/]+:8000/, backendUrl);
      
      // If we are communicating over HTTPS, rewrite the URL protocol to https
      if (backendUrl.startsWith('https://')) {
        config.url = config.url.replace(/^http:\/\//, 'https://');
        }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
