import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_BASE_URL_BACKEND || 'http://localhost:8000/api/v1';

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

// Enhanced artworksAPI with better error handling
export const artworksAPI = {
  checkDuplicates: async (formData) => {
    try {
      const response = await api.post('/artwork/check-duplicates', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 1 minute for duplicate check
      });
      return response.data;
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Duplicate check timed out. Please try again.');
      }
      handleApiError(error, 'Duplicate check');
    }
  },

  classifyAI: async (formData) => {
    try {
      const response = await api.post('/artwork/classify-ai', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 2 minutes for AI classification
      });
      return response.data;
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('AI classification timed out. The model may be busy. Please try again.');
      }
      handleApiError(error, 'AI classification');
    }
  },

  registerWithImage: async (formData) => {
    try {
      const response = await api.post('/artwork/register-with-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 180000, // 3 minutes for full registration with image processing
      });
      return response.data;
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Registration timed out. Please try with a smaller image.');
      }
      if (error.response?.status === 404) {
        throw new Error('Registration endpoint not found. Please check server configuration.');
      }
      handleApiError(error, 'Register with image');
    }
  },

  confirmRegistration: async (data) => {
    try {
      const response = await api.post('/artwork/confirm-registration', data, {
        timeout: 60000, // 1 minute for confirmation
      });
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('Confirmation endpoint not found. Please check server configuration.');
      }
      handleApiError(error, 'Confirm registration');
    }
  },

  // Rest of your existing methods...
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

  getByOwner: async (ownerAddress, params = {}) => {
    try {
      const response = await api.get(`/artwork/owner/${ownerAddress}`, { params });
      
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
  },

  // NEW: Category methods
  getCategories: async (type = null) => {
    try {
      const params = type ? { type } : {};
      const response = await api.get('/artwork/categories', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      // Return default categories if API fails
      return getDefaultCategories(type);
    }
  },

  createCategory: async (categoryData) => {
    try {
      const response = await api.post('/artwork/categories', categoryData);
      return response.data;
    } catch (error) {
      handleApiError(error, 'Create category');
    }
  },

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
  
};

// Helper function to provide default categories if API fails
const getDefaultCategories = (type) => {
  const allCategories = {
    medium: [
      { name: "Painting", type: "medium", description: "Oil, acrylic, watercolor, etc." },
      { name: "Drawing", type: "medium", description: "Pencil, charcoal, ink, etc." },
      { name: "Sculpture", type: "medium", description: "Stone, wood, metal, clay, etc." },
      { name: "Printmaking", type: "medium", description: "Etching, lithography, screen printing, etc." },
      { name: "Photography", type: "medium", description: "Digital, film, black & white, etc." },
      { name: "Digital Art", type: "medium", description: "AI art, 3D modeling, vector, animation" },
      { name: "Mixed Media / Collage", type: "medium", description: "Combination of different artistic mediums" },
      { name: "Textile & Fiber Art", type: "medium", description: "Weaving, embroidery, fashion, tapestry" },
      { name: "Calligraphy / Typography", type: "medium", description: "Artistic writing and lettering" },
      { name: "Installation Art", type: "medium", description: "Large-scale, immersive artworks" },
      { name: "Performance Art", type: "medium", description: "Live artistic performance" },
      { name: "Other Medium", type: "medium", description: "Other artistic medium not listed" }
    ],
    style: [
      { name: "Abstract", type: "style", description: "Non-representational art" },
      { name: "Realism / Hyperrealism", type: "style", description: "Art that resembles reality" },
      { name: "Impressionism", type: "style", description: "Emphasis on light and movement" },
      { name: "Expressionism", type: "style", description: "Emotional experience over physical reality" },
      { name: "Surrealism", type: "style", description: "Dream-like, unconscious mind" },
      { name: "Cubism", type: "style", description: "Geometric forms and multiple perspectives" },
      { name: "Minimalism", type: "style", description: "Extreme simplicity of form" },
      { name: "Pop Art", type: "style", description: "Popular culture influences" },
      { name: "Conceptual Art", type: "style", description: "Idea or concept over aesthetic" },
      { name: "Street Art / Graffiti", type: "style", description: "Public space art" },
      { name: "Contemporary / Modern", type: "style", description: "Current artistic trends" },
      { name: "Traditional / Folk / Indigenous", type: "style", description: "Cultural and traditional art forms" },
      { name: "Other Style", type: "style", description: "Other artistic style not listed" }
    ],
    subject: [
      { name: "Portraits", type: "subject", description: "Art focused on people's faces or figures" },
      { name: "Landscapes", type: "subject", description: "Natural scenery and environments" },
      { name: "Still Life", type: "subject", description: "Arrangements of inanimate objects" },
      { name: "Figurative Art", type: "subject", description: "Human body, gestures, and forms" },
      { name: "Animals & Wildlife", type: "subject", description: "Animal subjects and wildlife" },
      { name: "Architecture & Urban Scenes", type: "subject", description: "Buildings and cityscapes" },
      { name: "Fantasy & Mythological", type: "subject", description: "Imaginary and mythical subjects" },
      { name: "Religious & Spiritual", type: "subject", description: "Religious and spiritual themes" },
      { name: "Political / Social Commentary", type: "subject", description: "Social and political themes" },
      { name: "Nature & Environment", type: "subject", description: "Natural world and environmental themes" },
      { name: "Abstract Concepts", type: "subject", description: "Non-representational ideas and concepts" },
      { name: "Other Subject", type: "subject", description: "Other subject matter not listed" }
    ]
  };

  return type ? allCategories[type] || [] : [...allCategories.medium, ...allCategories.style, ...allCategories.subject];
};

// Update your API services to match the new backend endpoints:

export const licensesAPI = {
  // NEW: Purchase license with the updated system
  purchase: async (data) => {
    try {
      const formData = new FormData();
      formData.append('token_id', data.token_id.toString());
      formData.append('license_type', data.license_type);
      
      const response = await api.post('/license/purchase', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data;
    } catch (error) {
      handleApiError(error, 'Purchase license');
    }
  },

  // NEW: Get license prices for specific artwork
  getPricesForArtwork: async (tokenId) => {
    try {
      const response = await api.get(`/license/prices/artwork/${tokenId}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to get license prices for artwork ${tokenId}:`, error);
      return { success: false, error: error.message };
    }
  },

  // NEW: Calculate license price
  calculatePrice: async (artworkPrice, licenseType) => {
    try {
      const response = await api.get('/license/prices/calculate', {
        params: { artwork_price: artworkPrice, license_type: licenseType }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to calculate license price:', error);
      return { success: false, error: error.message };
    }
  },

  // NEW: License configuration management
  getLicenseConfigs: async (activeOnly = false) => {
    try {
      const response = await api.get('/license/config', {
        params: { active_only: activeOnly }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get license configs:', error);
      return [];
    }
  },

  getActiveLicenseConfig: async () => {
    try {
      const response = await api.get('/license/config/active');
      return response.data;
    } catch (error) {
      console.error('Failed to get active license config:', error);
      return null;
    }
  },

  createLicenseConfig: async (configData) => {
    try {
      const response = await api.post('/license/config', configData);
      return response.data;
    } catch (error) {
      console.error('Failed to create license config:', error);
      throw error;
    }
  },

  updateLicenseConfig: async (configId, updateData) => {
    try {
      const response = await api.put(`/license/config/${configId}`, updateData);
      return response.data;
    } catch (error) {
      console.error('Failed to update license config:', error);
      throw error;
    }
  },

  // UPDATED: Purchase license with new pricing system
  purchaseSimple: async (data) => {
    try {
      const formData = new FormData();
      formData.append('token_id', data.token_id.toString());
      formData.append('license_type', data.license_type);
      
      const response = await api.post('/license/purchase-simple', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data;
    } catch (error) {
      handleApiError(error, 'Purchase license simple');
    }
  },

  // NEW: Purchase license using simple method with predefined prices
  purchaseSimple: async (data) => {
    try {
      const formData = new FormData();
      formData.append('token_id', data.token_id.toString());
      formData.append('license_type', data.license_type);
      
      const response = await api.post('/license/purchase-simple', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data;
    } catch (error) {
      handleApiError(error, 'Purchase license simple');
    }
  },

  // NEW: Get license prices
  getPrices: async () => {
    try {
      const response = await api.get('/license/prices');
      return response.data;
    } catch (error) {
      console.error('Failed to get license prices:', error);
      return {
        success: false,
        prices: {
          "LINK_ONLY": { price_eth: 0.01, platform_fee_eth: 0.0005, actual_amount_eth: 0.0095 },
          "ACCESS_WITH_WM": { price_eth: 0.05, platform_fee_eth: 0.0025, actual_amount_eth: 0.0475 },
          "FULL_ACCESS": { price_eth: 0.1, platform_fee_eth: 0.005, actual_amount_eth: 0.095 }
        }
      };
    }
  },

  // UPDATED: Revoke license 
  revoke: (licenseId) => 
    api.post(`/license/${licenseId}/revoke`)
      .then(res => res.data)
      .catch(error => handleApiError(error, `Revoke license ${licenseId}`)),

  // UPDATED: Get user licenses - keep existing implementation but update for new data structure
  getByUser: async (userAddress, params = {}) => {
    try {
      console.log(`Fetching licenses for user: ${userAddress}`, params);
      
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
      const response = await api.get(url);
      
      // Handle the response structure
      let licenses = [];
      if (response.data?.licenses) {
        licenses = response.data.licenses;
      } else if (Array.isArray(response.data)) {
        licenses = response.data;
      }
      
      // Transform license data to match new structure
      const transformedLicenses = licenses.map(license => ({
        ...license,
        // Map old fields to new structure if needed
        start_date: license.purchase_time,
        end_date: null, // No expiration in new system
        terms_hash: null, // Not used in new system
        fee_paid: parseFloat(license.total_amount_eth || 0),
        // Keep existing fields
        license_id: license.license_id,
        token_id: license.token_id,
        licensee_address: license.buyer_address,
        licensor_address: license.owner_address,
        license_type: license.license_type,
        is_active: license.is_active,
        created_at: license.created_at,
        updated_at: license.updated_at
      }));
      
      return {
        data: transformedLicenses,
        licenses: transformedLicenses,
        total: response.data?.total || transformedLicenses.length,
        page: response.data?.page || 1,
        size: response.data?.size || 20,
        has_next: response.data?.has_next || false
      };
      
    } catch (error) {
      console.error(`User licenses API failed for ${userAddress}:`, error);
      return {
        data: [],
        licenses: [],
        total: 0,
        page: 1,
        size: 20,
        has_next: false,
        error: error.message
      };
    }
  },

  // NEW: Get buyer licenses directly from blockchain
  getBuyerFromBlockchain: async (buyerAddress) => {
    try {
      const response = await api.get(`/license/buyer/${buyerAddress}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get buyer licenses from blockchain:', error);
      return { success: false, licenses: [], error: error.message };
    }
  },

  // NEW: Get license info from blockchain
  getLicenseInfo: async (licenseId) => {
    try {
      const response = await api.get(`/license/${licenseId}/info`);
      return response.data;
    } catch (error) {
      console.error(`Failed to get license info for ${licenseId}:`, error);
      return { success: false, error: error.message };
    }
  },

  // Keep existing methods for compatibility
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

  // DEPRECATED: Old grant methods - keep for compatibility but update as needed
  grant: (data) => 
    api.post('/license/grant', data)
      .then(res => res.data)
      .catch(error => handleApiError(error, 'Grant license')),

  grantWithDocument: async (licenseData) => {
    try {
      const formData = new FormData();
      formData.append('token_id', licenseData.token_id.toString());
      formData.append('licensee_address', licenseData.licensee_address);
      formData.append('duration_days', licenseData.duration_days?.toString() || '30');
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

export const chatbotAPI = {
  async sendMessage(message, userContext = null) {
    try {
      const requestBody = {
        query: message,
        ...(userContext && { user_context: userContext })
      };

      const response = await axios.post(`${API_BASE_URL}/chatbot/ask`, requestBody, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 seconds timeout
      });

      return response.data;
    } catch (error) {
      console.error('Chatbot API error:', error);
      throw new Error(error.response?.data?.detail || 'Failed to get response from AI assistant');
    }
  },

  // Fallback responses if API is not available
  getFallbackResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
      return "Hello! I'm ArtGuard AI, your digital artwork protection assistant. How can I help you today?";
    }
    
    if (lowerMessage.includes('protect') || lowerMessage.includes('security')) {
      return "To protect your digital artwork, we use blockchain technology to create immutable ownership records. You can upload your artwork, register it on the blockchain, and set up licensing terms to prevent unauthorized use.";
    }
    
    if (lowerMessage.includes('blockchain')) {
      return "Blockchain registration creates a permanent, tamper-proof record of your artwork's ownership and provenance. Each artwork gets a unique digital fingerprint stored on the blockchain that can't be altered or deleted.";
    }
    
    if (lowerMessage.includes('license') || lowerMessage.includes('licensing')) {
      return "Our licensing system allows you to set specific terms for how your artwork can be used. You can define usage rights, expiration dates, and pricing. Smart contracts automatically enforce these terms.";
    }
    
    if (lowerMessage.includes('piracy') || lowerMessage.includes('unauthorized')) {
      return "We monitor the web for unauthorized use of your registered artwork. Our system detects potential piracy and helps you take appropriate action to protect your intellectual property.";
    }
    
    if (lowerMessage.includes('price') || lowerMessage.includes('cost')) {
      return "We offer flexible pricing plans for artists. Basic protection is free, while advanced features like automated piracy detection and premium licensing options are available in our paid plans.";
    }
    
    return "I specialize in digital artwork protection, blockchain registration, and licensing. You can ask me about: protecting your artwork, blockchain technology, licensing options, piracy detection, or pricing plans. How can I assist you?";
  }
};

export const recommendationAPI = {
  // Get personalized recommendations for user
  getRecommendations: async (userId, k = 5) => {
    try {
      const response = await api.get(`/recommend/${userId}?k=${k}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
      // Return empty recommendations if API fails
      return {
        recommendations: {
          recommended_for_you: [],
          search_based: [],
          purchase_based: [],
          upload_based: [],
          view_based: []
        }
      };
    }
  },

  // Search artworks with semantic search
  searchArtworks: async (query, k = 20) => {
    try {
      const response = await api.get(`/search?query=${encodeURIComponent(query)}&k=${k}`);
      return response.data;
    } catch (error) {
      console.error('Search failed:', error);
      throw new Error('Search service is temporarily unavailable');
    }
  },

  // Track artwork view for recommendations
  trackArtworkView: async (artworkId) => {
    try {
      const response = await api.post(`/artwork/${artworkId}/view`);
      return response.data;
    } catch (error) {
      console.error('Failed to track artwork view:', error);
      // Don't throw error for tracking failures
      return { success: false };
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