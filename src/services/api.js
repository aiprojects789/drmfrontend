import axios from 'axios';

const API_BASE_URL = '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  console.log(`API Request: ${config.method?.toUpperCase()} ${config.url} - Token: ${!!token}`);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('API: Authorization header added');
  } else {
    console.warn('API: No token available for request');
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error(`❌ API Error: ${error.config?.url}`, error.response?.data || error.message);
    
    // Only auto-logout on 401 if we're not on auth-related endpoints
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/')) {
      console.warn('API: Unauthorized - clearing auth and redirecting');
      localStorage.removeItem('token');
      localStorage.removeItem('userData');
      // Don't redirect if we're already on the auth page
      if (window.location.pathname !== '/auth') {
        window.location.href = '/auth';
      }
    }
    return Promise.reject(error);
  }
);

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
    throw new Error(data.detail || data.message || `${context} failed (${status}): Unknown error`);
  } else if (error.request) {
    throw new Error(`No response received: ${error.message}`);
  } else {
    throw new Error(`${context} failed: ${error.message}`);
  }
};

export const authAPI = {
  // Login with email/password - handled manually in AuthContext for OAuth2 form data
  login: (data) =>
    api.post('/auth/login', data)
      .then(res => {
        if (res.data.access_token) localStorage.setItem('token', res.data.access_token);
        if (res.data.user) localStorage.setItem('userData', JSON.stringify(res.data.user));
        return res.data;
      })
      .catch(error => handleApiError(error, 'Login')),

  // Signup - requires authentication FIRST
  signup: (data) =>
    api.post('/auth/signup', {
      email: data.email,
      username: data.username,
      password: data.password,
      full_name: data.full_name || data.username,
      wallet_address: data.wallet_address || null
    })
      .then(res => {
        if (res.data.access_token) localStorage.setItem('token', res.data.access_token);
        if (res.data.user) localStorage.setItem('userData', JSON.stringify(res.data.user));
        return res.data;
      })
      .catch(error => handleApiError(error, 'Signup')),

  // FIXED: Connect wallet - properly check token and handle errors
  connectWallet: async (data) => {
    const token = localStorage.getItem('token');
    console.log('API: Making connect-wallet request with token:', !!token);
    console.log('API: Request data:', data);
    
    if (!token) {
      throw new Error('No authentication token available');
    }
    
    try {
      const response = await api.post('/auth/connect-wallet', data);
      console.log('API: Connect-wallet success:', response.data);
      
      // Update stored user data and token if provided
      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
      }
      if (response.data.user) {
        localStorage.setItem('userData', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      console.error('API: Connect-wallet error:', error.response || error);
      handleApiError(error, 'Wallet connection');
    }
  },

  // Get current user info
  getCurrentUser: () =>
    api.get('/auth/me')
      .then(res => res.data)
      .catch(error => handleApiError(error, 'User fetch')),

  // Logout
  logout: () =>
    api.post('/auth/logout')
      .then(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
      })
      .catch(() => {
        // Even if API call fails, clear local storage
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
      }),

  // Password reset flow
  forgotPassword: (email) =>
    api.post('/auth/forgot-password', { email })
      .then(res => res.data)
      .catch(error => handleApiError(error, 'Forgot password')),

  verifyOTP: (email, otp) =>
    api.post('/auth/verify-otp', { email, otp })
      .then(res => res.data)
      .catch(error => handleApiError(error, 'OTP verification')),

  resetPassword: (email, otp, new_password) =>
    api.post('/auth/reset-password', { email, otp, new_password })
      .then(res => res.data)
      .catch(error => handleApiError(error, 'Password reset')),

  // Update password (for logged-in users)
  updatePassword: (current_password, new_password) =>
    api.post('/auth/update-password', { current_password, new_password })
      .then(res => res.data)
      .catch(error => handleApiError(error, 'Password update'))
};

// Admin API functions (if needed)
export const adminAPI = {
  getAllUsers: () =>
    api.get('/auth/admin/users')
      .then(res => res.data)
      .catch(error => handleApiError(error, 'Get all users')),

  deleteUser: (userId) =>
    api.delete(`/auth/admin/users/${userId}`)
      .then(res => res.data)
      .catch(error => handleApiError(error, 'Delete user')),

  updateUserRole: (userId, role) =>
    api.put(`/auth/admin/users/${userId}/role`, { new_role: role })
      .then(res => res.data)
      .catch(error => handleApiError(error, 'Update user role')),

  getStats: () =>
    api.get('/auth/admin/stats')
      .then(res => res.data)
      .catch(error => handleApiError(error, 'Get admin stats'))
};

// FIXED: artwork API with proper data extraction
export const artworksAPI = {
  registerWithImage: (formData) => 
    api.post('/artwork/register-with-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000
    })
      .then(res => res.data)
      .catch(error => handleApiError(error, 'Artwork registration')),

  confirmRegistration: (data) => 
    api.post('/artwork/confirm-registration', data)
      .then(res => res.data)
      .catch(error => handleApiError(error, 'Registration confirmation')),

  getAll: (params = {}) => 
    api.get('/artwork', { params })
      .then(res => {
        console.log('📦 All artworks response:', res.data);
        return {
          data: res.data.artworks || [],
          total: res.data.total || 0,
          page: res.data.page || 1,
          size: res.data.size || 20,
          has_next: res.data.has_next || false
        };
      })
      .catch(error => handleApiError(error, 'Fetch artworks')),

  getById: (tokenId) => 
    api.get(`/artwork/${tokenId}`)
      .then(res => res.data)
      .catch(error => handleApiError(error, `Fetch artwork ${tokenId}`)),

  getBlockchainInfo: (tokenId) => 
    api.get(`/artwork/${tokenId}/blockchain`)
      .then(res => res.data)
      .catch(error => handleApiError(error, `Fetch blockchain info ${tokenId}`)),

  getByTokenId: (tokenId) => {
    return api.get(`/artwork/${tokenId}`);
  },

  prepareSaleTransaction: (data) => 
    api.post('/artwork/prepare-sale-transaction', data)
      .then(res => res.data)
      .catch(error => handleApiError(error, 'Prepare sale transaction')),

  confirmSale: (data) => 
    api.post('/artwork/confirm-sale', data)
      .then(res => res.data)
      .catch(error => handleApiError(error, 'Confirm sale')),

  // FIXED: Owner artworks with proper data structure
  getByOwner: async (ownerAddress, params = {}) => {
    try {
      const response = await api.get(`/artwork/owner/${ownerAddress}`, { params });
      
      // Handle different response structures
      let artworks = [];
      let total = 0;
      
      if (response.data && Array.isArray(response.data.artworks)) {
        artworks = response.data.artworks;
        total = response.data.total || artworks.length;
      } else if (Array.isArray(response.data)) {
        artworks = response.data;
        total = response.data.length;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        artworks = response.data.data;
        total = response.data.total || artworks.length;
      }
      
      console.log(`📦 Owner artworks for ${ownerAddress}:`, { count: artworks.length, total });
      
      return {
        data: artworks,
        total: total,
        page: response.data?.page || 1,
        size: response.data?.size || 20,
        has_next: response.data?.has_next || false
      };
    } catch (error) {
      console.warn(`Owner artworks failed for ${ownerAddress}:`, error.message);
      return {
        data: [],
        total: 0,
        page: 1,
        size: 20,
        has_next: false
      };
    }
  },

  getByCreator: async (creatorAddress, params = {}) => {
    try {
      const response = await api.get(`/artwork/creator/${creatorAddress}`, { params });
      
      // Handle different response structures
      let artworks = [];
      let total = 0;
      
      if (response.data && Array.isArray(response.data.artworks)) {
        artworks = response.data.artworks;
        total = response.data.total || artworks.length;
      } else if (Array.isArray(response.data)) {
        artworks = response.data;
        total = response.data.length;
      }
      
      console.log(`📦 Creator artworks for ${creatorAddress}:`, { count: artworks.length, total });
      
      return {
        data: artworks,
        total: total,
        page: response.data?.page || 1,
        size: response.data?.size || 20,
        has_next: response.data?.has_next || false
      };
    } catch (error) {
      console.warn(`Creator artworks failed for ${creatorAddress}:`, error.message);
      return {
        data: [],
        total: 0,
        page: 1,
        size: 20,
        has_next: false
      };
    }
  }
};

// FIXED: Licenses API with proper data structure
export const licensesAPI = {
  grant: (data) => 
    api.post('/license/grant', data)
      .then(res => res.data)
      .catch(error => handleApiError(error, 'Grant license')),

  revoke: (licenseId) => 
    api.post(`/license/${licenseId}/revoke`)
      .then(res => res.data)
      .catch(error => handleApiError(error, `Revoke license ${licenseId}`)),

  // FIXED: User licenses with proper data structure
  getByUser: async (userAddress, params = {}) => {
    try {
      console.log(`🚀 Fetching licenses for user: ${userAddress}`, params);
      
      // Build query parameters properly
      const queryParams = new URLSearchParams();
      
      if (params.as_licensee !== undefined) {
        queryParams.append('as_licensee', params.as_licensee.toString());
      }
      if (params.page) {
        queryParams.append('page', params.page.toString());
      }
      if (params.size) {
        queryParams.append('size', params.size.toString());
      }
      
      const url = `/license/user/${userAddress}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      console.log(`🌐 API URL: ${url}`);
      
      const response = await api.get(url);
      console.log(`📡 Raw API response:`, response);
      console.log(`📦 Response data:`, response.data);
      
      // Handle different response structures more robustly
      let licenses = [];
      let total = 0;
      let page = 1;
      let size = 20;
      let hasNext = false;
      
      if (response.data) {
        // Check for standard paginated response
        if (response.data.licenses && Array.isArray(response.data.licenses)) {
          licenses = response.data.licenses;
          total = response.data.total || licenses.length;
          page = response.data.page || 1;
          size = response.data.size || 20;
          hasNext = response.data.has_next || false;
          console.log(`✅ Standard paginated response: ${licenses.length} licenses`);
        }
        // Check for direct array response
        else if (Array.isArray(response.data)) {
          licenses = response.data;
          total = response.data.length;
          console.log(`✅ Direct array response: ${licenses.length} licenses`);
        }
        // Check for nested data structure
        else if (response.data.data && Array.isArray(response.data.data)) {
          licenses = response.data.data;
          total = response.data.total || licenses.length;
          page = response.data.page || 1;
          size = response.data.size || 20;
          hasNext = response.data.has_next || false;
          console.log(`✅ Nested data response: ${licenses.length} licenses`);
        }
        // Log unexpected structure
        else {
          console.warn(`⚠️ Unexpected response structure:`, response.data);
          console.warn(`Response keys:`, Object.keys(response.data));
        }
      }
      
      // Validate license objects
      const validLicenses = licenses.filter(license => {
        const isValid = license && 
                      (license.license_id !== undefined || license.id !== undefined) &&
                      license.token_id !== undefined;
        if (!isValid) {
          console.warn(`⚠️ Invalid license object:`, license);
        }
        return isValid;
      });
      
      console.log(`🎯 Final result: ${validLicenses.length} valid licenses out of ${licenses.length} total`);
      
      const result = {
        data: validLicenses,
        total: total,
        page: page,
        size: size,
        has_next: hasNext
      };
      
      console.log(`📊 Returning result:`, result);
      return result;
      
    } catch (error) {
      console.error(`❌ User licenses API failed for ${userAddress}:`, error);
      console.error(`Error details:`, error.response?.data || error.message);
      
      // Return empty result instead of throwing
      return {
        data: [],
        total: 0,
        page: 1,
        size: 20,
        has_next: false,
        error: error.message
      };
    }
  },

  getAll: (params = {}) => 
    api.get('/license', { params })
      .then(res => res.data)
      .catch(error => handleApiError(error, 'Fetch licenses')),

  getById: (licenseId) => 
    api.get(`/license/${licenseId}`)
      .then(res => res.data)
      .catch(error => handleApiError(error, `Fetch license ${licenseId}`)),

  getByArtwork: (tokenId, params = {}) => 
    api.get(`/license/artwork/${tokenId}`, { params })
      .then(res => res.data)
      .catch(error => handleApiError(error, `Fetch artwork licenses ${tokenId}`)),

  grantWithDocument: async (licenseData) => {
    try {
      const formData = new FormData();
      formData.append('token_id', licenseData.token_id.toString());
      formData.append('licensee_address', licenseData.licensee_address);
      formData.append('duration_days', licenseData.duration_days.toString());
      formData.append('license_type', licenseData.license_type);

      const response = await api.post('/license/grant-with-document', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data;
    } catch (error) {
      handleApiError(error, 'Grant license with document');
    }
  }
};

// FIXED: Transactions API with proper data structure
export const transactionsAPI = {
  create: async (data) => {
    console.log('Creating transaction with data:', JSON.stringify(data, null, 2));
    try {
      const response = await api.post('/transaction', data);
      return response.data;
    } catch (error) {
      console.error('Transaction creation error:', error.response?.data);
      throw error;
    }
  },

  update: (txHash, data) => 
    api.put(`/transaction/${txHash}`, data)
      .then(res => res.data)
      .catch(error => handleApiError(error, `Update transaction ${txHash}`)),

  getAll: (params = {}) => 
    api.get('/transaction', { params })
      .then(res => res.data)
      .catch(error => handleApiError(error, 'Fetch transactions')),

  getById: (txHash) => 
    api.get(`/transaction/${txHash}`)
      .then(res => res.data)
      .catch(error => handleApiError(error, `Fetch transaction ${txHash}`)),

  // FIXED: User transactions with proper data structure and type filtering
  getByUser: async (userAddress, params = {}) => {
    try {
      const response = await api.get(`/transaction/user/${userAddress}`, { params });
      
      // Handle different response structures
      let transactions = [];
      let total = 0;
      
      if (response.data && Array.isArray(response.data.transactions)) {
        transactions = response.data.transactions;
        total = response.data.total || transactions.length;
      } else if (Array.isArray(response.data)) {
        transactions = response.data;
        total = response.data.length;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        transactions = response.data.data;
        total = response.data.total || transactions.length;
      }
      
      // Apply type filtering if requested
      if (params.type && transactions.length > 0) {
        transactions = transactions.filter(tx => 
          tx.transaction_type === params.type
        );
      }
      
      console.log(`📦 User transactions for ${userAddress}:`, { count: transactions.length, total });
      
      return {
        data: transactions,
        total: total
      };
    } catch (error) {
      console.warn(`User transactions failed for ${userAddress}:`, error.message);
      return {
        data: [],
        total: 0
      };
    }
  }
};

// Web3 API
export const web3API = {
  getStatus: () => 
    api.get('/web3/status')
      .then(res => res.data)
      .catch(error => handleApiError(error, 'Web3 status')),

  getArtworkCount: () => 
    api.get('/web3/artwork-count')
      .then(res => res.data)
      .catch(error => handleApiError(error, 'Artwork count')),

  prepareRegisterTransaction: (data) => 
    api.post('/web3/prepare-transaction/register', data)
      .then(res => res.data)
      .catch(error => handleApiError(error, 'Prepare registration transaction')),

  prepareLicenseTransaction: (data) => 
    api.post('/web3/prepare-transaction/license', data)
      .then(res => res.data)
      .catch(error => handleApiError(error, 'Prepare license transaction')),

  waitForTransaction: (txHash) => 
    api.get(`/web3/transactions/${txHash}/wait`)
      .then(res => res.data)
      .catch(error => handleApiError(error, `Wait for transaction ${txHash}`)),

  getTransactionReceipt: (txHash) => 
    api.get(`/web3/transactions/${txHash}/receipt`)
      .then(res => res.data)
      .catch(error => handleApiError(error, `Transaction receipt ${txHash}`)),

  getTokenIdFromTx: (txHash) => 
    api.get(`/web3/transactions/${txHash}/token-id`)
      .then(res => res.data)
      .catch(error => handleApiError(error, `Token ID from transaction ${txHash}`))
};

// Health check utility
export const checkAPIHealth = async () => {
  try {
    const response = await api.get('/health');
    return { healthy: true, data: response.data };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
};

// Token management utilities
export const getAuthToken = () => localStorage.getItem('token');
export const setAuthToken = (token) => localStorage.setItem('token', token);
export const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('userData');
};

export default api;