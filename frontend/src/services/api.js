import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';
const API = axios.create({ baseURL });

export default API;
