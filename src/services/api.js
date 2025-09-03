import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// 🔑 Attach token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Error handler
const handleApiError = (error, context) => {
  console.error(`❌ ${context} Error:`, error);
  if (error.response) {
    const { status, data } = error.response;
    if (status === 422 && data.detail) {
      const errorMessages = Array.isArray(data.detail)
        ? data.detail.map(err => `${err.loc?.join('.')}: ${err.msg}`).join(', ')
        : JSON.stringify(data.detail);
      throw new Error(`Validation failed: ${errorMessages}`);
    }
    throw new Error(`${context} failed (${status}): ${data.detail || data.message || 'Unknown error'}`);
  } else if (error.request) {
    throw new Error(`No response received: ${error.message}`);
  } else {
    throw new Error(`${context} failed: ${error.message}`);
  }
};

// ================= AUTH API =================
export const authAPI = {
  login: (data) =>
    api.post('/auth/login', data)
      .then(res => {
        // 🔑 Save token & user on login
        // ✅ Correct
        if (res.data.access_token) localStorage.setItem('token', res.data.access_token);
        if (res.data.user) localStorage.setItem('userData', JSON.stringify(res.data.user));
        return res.data;
      })
      .catch(error => handleApiError(error, 'Login')),

  connectWallet: (data) =>
    api.post('/auth/connect-wallet', data)
      .then(res => res.data)
      .catch(error => handleApiError(error, 'Wallet connection')),

  getCurrentUser: () =>
    api.get('/auth/me')
      .then(res => res.data)
      .catch(error => handleApiError(error, 'User fetch')),

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    return Promise.resolve();
  }
};

export default api;
