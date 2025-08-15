import React, { useContext, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AuthContext from '../context/AuthContext';
import axios from 'axios';
const MainLayout = () => {
  const {isLogin, setIsLogin } = useContext(AuthContext)

  useEffect(() => {
    const token = localStorage.getItem('token');
    const expiry = localStorage.getItem('token_expiry');

    if (token && expiry && new Date().getTime() < expiry) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setIsLogin(true); 
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('token_expiry');
      setIsLogin(false);
    }
  }, []);
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar isAuthenticated={isLogin} />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;