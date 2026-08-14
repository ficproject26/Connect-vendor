import axios from 'axios';
import { getBackendUrl } from './apiSetup';

const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    const url = import.meta.env.VITE_API_URL;
    return url.endsWith('/api') ? url : `${url}/api`;
  }
  return `${getBackendUrl()}/api`;
};

const API = axios.create({ baseURL: getBaseURL() });

export default API;
