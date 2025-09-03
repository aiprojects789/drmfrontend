import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWeb3 } from './Web3Context';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext({
  isLogin: false,
  setIsLogin: () => {}
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [loading, setLoading] = useState(false);
  const { account, connected, disconnectWallet: web3Disconnect } = useWeb3();

  // Auto-login when wallet connects
  useEffect(() => {
    if (connected && account && !user) {
      handleWalletConnect();
    }
  }, [connected, account]);
  
// 🔹 2nd useEffect -> Page refresh pe ek dafa run hoga
useEffect(() => {
  const savedToken = localStorage.getItem("authToken");
  if (savedToken && !token) {
    setToken(savedToken); // ✅ ye automatically 1st useEffect trigger karega
  }
}, []); // <-- empty deps = sirf ek dafa

const handleWalletConnect = async () => {
  if (!account) return;

  setLoading(true);
  try {
    const response = await authAPI.connectWallet({
      wallet_address: account
    });

    console.log("🔑 Wallet Connect Response:", response);

    setUser(response.user);
    if (response.access_token) {
      setToken(response.access_token);
      localStorage.setItem('authToken', response.access_token);
    }

    toast.success('Wallet connected successfully!');
  } catch (error) {
    console.error('Wallet connection failed:', error.response ? error.response.data : error.message);
    toast.error('Failed to connect wallet: ' + (error.response?.data?.detail || error.message));
    web3Disconnect();
  } finally {
    setLoading(false);
  }
};


  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('authToken');
    web3Disconnect();
    toast.success('Logged out successfully');
  };

  const getCurrentUser = async () => {
    if (!token) return null;

    try {
      const response = await authAPI.getCurrentUser(); // ✅ token auto attached via interceptor
      setUser(response);
      return response;
    } catch (error) {
      console.error('Failed to get current user:', error);
      handleLogout();
      return null;
    }
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user && !!token && connected,
    login: handleWalletConnect,
    logout: handleLogout,
    getCurrentUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
