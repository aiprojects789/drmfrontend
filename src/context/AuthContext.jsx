import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useWeb3 } from './Web3Context';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const { account, connected, disconnectWallet: web3Disconnect } = useWeb3();
  
  // Refs to prevent unnecessary effects
  const loginInProgress = useRef(false);
  const lastAutoLinkAttempt = useRef(null);
  const logoutInProgress = useRef(false);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = () => {
      console.log('🔄 Starting auth initialization...');
      
      const savedToken = localStorage.getItem('token');
      const savedUser = localStorage.getItem('userData');
      
      console.log('Saved token exists:', !!savedToken);
      console.log('Saved user exists:', !!savedUser);
      
      if (savedToken && savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          
          // Validate token format
          const tokenParts = savedToken.split('.');
          if (tokenParts.length === 3) {
            setToken(savedToken);
            setUser(parsedUser);
            console.log('✅ Auth state restored for user:', parsedUser.email, 'with wallet:', parsedUser.wallet_address);
          } else {
            console.warn('⚠️ Invalid token format, clearing auth');
            localStorage.removeItem('token');
            localStorage.removeItem('userData');
          }
        } catch (e) {
          console.error('Failed to parse user data:', e);
          localStorage.removeItem('token');
          localStorage.removeItem('userData');
        }
      }
      
      setIsInitialized(true);
      console.log('✅ Auth initialization complete');
    };

    initializeAuth();
  }, []);

  // Debug: Add a localStorage monitor to track token changes
  useEffect(() => {
    const originalSetItem = localStorage.setItem;
    const originalRemoveItem = localStorage.removeItem;
    
    localStorage.setItem = function(key, value) {
      if (key === 'token') {
        console.log('🔍 localStorage.setItem called for token:', !!value);
        console.trace('Token set stack trace:');
      }
      return originalSetItem.call(this, key, value);
    };
    
    localStorage.removeItem = function(key) {
      if (key === 'token') {
        console.log('🗑️ localStorage.removeItem called for token');
        console.trace('Token removed stack trace:');
      }
      return originalRemoveItem.call(this, key);
    };
    
    return () => {
      localStorage.setItem = originalSetItem;
      localStorage.removeItem = originalRemoveItem;
    };
  }, []);

  // Email/password login
  const loginWithCredentials = async (email, password) => {
    console.log('🔄 Starting login process for:', email);
    
    if (loginInProgress.current) {
      console.log('⚠️ Login already in progress, ignoring duplicate request');
      return;
    }
    
    loginInProgress.current = true;
    setLoading(true);
    
    try {
      // Create form data with correct field names for OAuth2
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);
      
      // Make the API call with proper headers
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
      }

      const data = await response.json();
      console.log('📡 Login response received:', {
        hasToken: !!data.access_token,
        userRole: data.role,
        userId: data.user_id
      });

      // Validate and store token
      if (data.access_token) {
        const tokenParts = data.access_token.split('.');
        if (tokenParts.length !== 3) {
          console.error('❌ Invalid JWT format received');
          throw new Error('Invalid token format received from server');
        }
        
        // Store token immediately and update state
        localStorage.setItem('token', data.access_token);
        setToken(data.access_token);
        console.log('✅ Token stored and state updated');
      } else {
        throw new Error('No access token received from server');
      }

      // Create and store user object
      const userObj = {
        id: data.user_id,
        email: email,
        role: data.role || 'user',
        wallet_address: data.wallet_address || null,
      };

      localStorage.setItem('userData', JSON.stringify(userObj));
      setUser(userObj);
      console.log('✅ User state updated:', userObj.email, 'Role:', userObj.role);

      toast.success('Login successful!');
      
      // Small delay to ensure state is properly set
      setTimeout(() => {
        loginInProgress.current = false;
      }, 1000);
      
      return data;
    } catch (error) {
      console.error('❌ Login failed:', error);
      toast.error('Login failed: ' + (error.message || 'Unknown error'));
      loginInProgress.current = false;
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Connect wallet - AFTER user is authenticated
  const connectWallet = async () => {
    console.log('🔄 Starting wallet connection...');
    
    // Check both state and localStorage for token
    const currentToken = token || localStorage.getItem('token');
    console.log('Auth state:', { 
      hasStateToken: !!token, 
      hasStorageToken: !!localStorage.getItem('token'),
      hasAccount: !!account, 
      account 
    });
    
    if (!currentToken) {
      console.error('❌ No authentication token found');
      toast.error('Please log in first to connect your wallet');
      return { error: 'Not authenticated' };
    }

    if (!account) {
      console.error('❌ No wallet account available');
      // toast.error('No wallet account available. Please connect MetaMask first.');
      return { error: 'No wallet account available' };
    }

    setLoading(true);
    try {
      console.log('📡 Making API call to connect wallet with account:', account);
      
      const response = await authAPI.connectWallet({
        wallet_address: account
      });

      console.log('✅ Wallet connection API response received:', response);

      // Update token if provided
      if (response.access_token) {
        localStorage.setItem('token', response.access_token);
        setToken(response.access_token);
        console.log('🔄 Token updated after wallet connection');
      }

      // Update user data - this is crucial for wallet connection display
      if (response.user) {
        console.log('📝 Updating user data with wallet info:', response.user);
        localStorage.setItem('userData', JSON.stringify(response.user));
        setUser(response.user);
      } else if (response.wallet_address) {
        // If no full user object, at least update the wallet address
        const updatedUser = {
          ...user,
          wallet_address: response.wallet_address
        };
        console.log('📝 Updating user wallet address:', updatedUser);
        localStorage.setItem('userData', JSON.stringify(updatedUser));
        setUser(updatedUser);
      } else {
        // Fallback: update with current account
        const updatedUser = {
          ...user,
          wallet_address: account
        };
        console.log('📝 Fallback: updating user with current account:', updatedUser);
        localStorage.setItem('userData', JSON.stringify(updatedUser));
        setUser(updatedUser);
      }

      toast.success('Wallet connected successfully!');
      return response;
    } catch (error) {
      console.error('❌ Wallet connection failed:', error);
      
      if (error.message.includes('403')) {
        toast.error('Authentication failed. Please log in again.');
      } else if (error.message.includes('400')) {
        toast.error('Wallet connection failed: ' + error.message);
      } else {
        toast.error('Failed to connect wallet: ' + (error.message || 'Connection failed'));
      }
      
      return { error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Auto-link wallet to account when both conditions are met - WITH THROTTLING
  useEffect(() => {
    const linkWalletToAccount = async () => {
      const isAuth = !!token;
      const walletConnected = connected && !!account;
      const isWalletLinked = user?.wallet_address?.toLowerCase() === account?.toLowerCase();
      const currentAttemptKey = `${isAuth}-${walletConnected}-${account}-${user?.wallet_address}`;
      
      console.log('🔄 Auto-link check:', {
        isAuth,
        walletConnected,
        isWalletLinked,
        userWallet: user?.wallet_address,
        account,
        isInitialized,
        loginInProgress: loginInProgress.current,
        lastAttemptKey: lastAutoLinkAttempt.current,
        currentAttemptKey
      });
      
      // Throttle auto-link attempts
      if (lastAutoLinkAttempt.current === currentAttemptKey) {
        console.log('⚠️ Skipping duplicate auto-link attempt');
        return;
      }
      
      // Only auto-link if all conditions are met AND wallet is not already linked
      if (isAuth && walletConnected && account && !isWalletLinked && isInitialized && !loginInProgress.current && !loading) {
        lastAutoLinkAttempt.current = currentAttemptKey;
        try {
          console.log('🔗 Auto-linking wallet to account...');
          await connectWallet();
        } catch (error) {
          console.error('❌ Failed to auto-link wallet:', error);
        }
      }
    };

    // Only run if initialized and not in the middle of login
    if (isInitialized && !loginInProgress.current) {
      // Add small delay to prevent race conditions
      const timeoutId = setTimeout(linkWalletToAccount, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [token, connected, account, user?.wallet_address, isInitialized, loading]);

  // Signup
  const signup = async (userData) => {
    setLoading(true);
    try {
      const response = await authAPI.signup(userData);
      
      // For signup, we might not get a token immediately
      // The backend returns UserOut, not Token
      if (response.access_token) {
        localStorage.setItem('token', response.access_token);
        setToken(response.access_token);
      }

      if (response.user || response.email) {
        const userObj = response.user || {
          id: response._id,
          email: response.email,
          role: response.role || 'user',
          wallet_address: null
        };
        localStorage.setItem('userData', JSON.stringify(userObj));
        setUser(userObj);
      }

      toast.success('Account created successfully!');
      return response;
    } catch (error) {
      console.error('❌ Signup failed:', error);
      toast.error('Signup failed: ' + (error.message || 'Registration failed'));
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout - with caller tracking and prevention during active operations
  const logout = (caller = 'unknown') => {
    console.log('🔄 Logout called by:', caller);
    console.log('Current auth state before logout:', {
      hasToken: !!token,
      hasUser: !!user,
      loginInProgress: loginInProgress.current,
      loading,
      logoutInProgress: logoutInProgress.current
    });
    
    // Don't logout if already in progress
    if (logoutInProgress.current) {
      console.log('⚠️ Logout already in progress, ignoring');
      return;
    }
    
    // Don't logout if login is in progress OR if we're in a loading state
    if (loginInProgress.current) {
      console.log('⚠️ Preventing logout during login process');
      return;
    }
    
    if (loading) {
      console.log('⚠️ Preventing logout during loading operation');
      return;
    }
    
    logoutInProgress.current = true;
    console.log('✅ Proceeding with logout');
    
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    lastAutoLinkAttempt.current = null;
    
    if (web3Disconnect) {
      web3Disconnect();
    }
    
    toast.success('Logged out successfully');
    console.log('✅ Logout complete');
    
    // Reset logout flag after a delay
    setTimeout(() => {
      logoutInProgress.current = false;
    }, 1000);
  };

  // Get current user
  const getCurrentUser = async () => {
    if (!token) return null;

    try {
      const response = await authAPI.getCurrentUser();
      const userObj = {
        id: response.user_id,
        email: response.email,
        role: response.role,
        wallet_address: response.wallet_address
      };
      setUser(userObj);
      localStorage.setItem('userData', JSON.stringify(userObj));
      return userObj;
    } catch (error) {
      console.error('Failed to get current user:', error);
      if (error.message.includes('401')) {
        logout('getCurrentUser-401');
      }
      return null;
    }
  };

  // Calculate wallet connection status with case-insensitive comparison
  const isWalletConnected = connected && 
                           !!account && 
                           !!user?.wallet_address && 
                           user.wallet_address.toLowerCase() === account.toLowerCase();

  const value = {
    user,
    token,
    loading,
    isInitialized,
    isAuthenticated: isInitialized && !!token,
    isWalletConnected,
    isFullyConnected: !!token && isWalletConnected,
    loginWithCredentials,
    connectWallet,
    logout,
    getCurrentUser,
    signup
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;