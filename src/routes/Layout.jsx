import React, { useContext } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AuthContext from '../context/AuthContext';
const MainLayout = () => {
  const { isLogin } = useContext(AuthContext)
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar isAuthenticated={isLogin}/>
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;