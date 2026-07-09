import API from './api';
export const login = (data) => API.post('/auth/login', data);
export const register = (data) => API.post('/auth/register', data);
