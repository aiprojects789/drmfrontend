import React from 'react'
import Navbar from '../components/Navbar'
import Auth from '../pages/Auth'
import PayPalCallback from '../components/PayPalCallback'
import { AuthProvider } from '../context/AuthContext'
import { Web3Provider } from '../context/Web3Context'
import { Routes, Route } from 'react-router-dom'
import Home from '../pages/Home'
import AboutUs from '../pages/About'
import Faqs from '../pages/Faqs'
import Contact from '../pages/Contact'
import Explorer from '../pages/Explorer'
import MainLayout from './Layout'
import ArtistDash from '../pages/dashboard/ArtistDash/ArtistDash'
import UploadArtworks from '../pages/dashboard/ArtistDash/UploadArtworks'
import MyArtworks from '../pages/dashboard/ArtistDash/MyArtworks'
import Licenses from '../pages/dashboard/ArtistDash/Licenses'
import Piracy from '../pages/dashboard/ArtistDash/Piracy'
import Wallets from '../pages/dashboard/ArtistDash/Wallet'
import Settings from '../pages/dashboard/ArtistDash/Settings'
import DashboardHome from '../pages/dashboard/ArtistDash/DashboardHome'
import AdminHome from '../pages/dashboard/AdminDash/AdminHome'
import ControlArtworks from '../pages/dashboard/AdminDash/ControlArtworks'
import UsersManagement from '../pages/dashboard/AdminDash/UserManagement'
import AdminManagement from '../pages/dashboard/AdminDash/AdminManagement'
import LicensesPage from '../pages/LicensesPage';
import PayPalOnboardSuccess from '../pages/PaypalOnboardSuccess'
import ScrollRestore from '../components/ScrollRestore'
import ProtectedRoute from './ProtectedRoutes'
import SalePage from '../pages/SalePage'
import LicensePage from '../pages/LicensePage'
import ArtworkDetail from '../pages/ArtworkDetail'
import OAuthCallback from '../pages/OAuthCallback';

const AppRoutes = () => {
    return (
        <>
            <ScrollRestore />
            <Routes>
                {/* All routes now use MainLayout for consistent navbar/footer */}
                <Route path="/" element={<MainLayout />}>
                    {/* Public routes */}
                    <Route index element={<Home />} />
                    <Route path="auth" element={<Auth />} />
                    <Route path="about" element={<AboutUs />} />
                    <Route path="faqs" element={<Faqs />} />
                    <Route path="contact" element={<Contact />} />
                    <Route path="explorer" element={<Explorer />} />
                    <Route path="sale/:tokenId" element={<SalePage />} />
                    <Route path="license/:tokenId" element={<LicensePage />} />
                    <Route path="artwork/:tokenId" element={<ArtworkDetail />} />
                    <Route path="/licenses" element={<LicensesPage />} />
                    <Route path="/payment/callback" element={<PayPalCallback />} />
                    <Route path="/onboard-success" element={<PayPalOnboardSuccess />} />
                    <Route path="/auth/callback" element={<OAuthCallback />} />
                    {/* <Route path="/settings" element={<Settings />} /> */}

                    {/* User Dashboard routes with MainLayout */}
                    <Route 
                        path="dashboard" 
                        element={
                            <ProtectedRoute>
                                <ArtistDash />
                            </ProtectedRoute>
                        }
                    >
                        {/* Default dashboard route - redirects to dashboard home */}
                        <Route index element={<DashboardHome />} />
                        <Route path="home" element={<DashboardHome />} />
                        <Route path="upload" element={<UploadArtworks />} />
                        <Route path="artworks" element={<MyArtworks />} />
                        <Route path="licenses" element={<Licenses />} />
                        <Route path="piracy" element={<Piracy />} />
                        <Route path="wallet" element={<Wallets />} />
                        <Route path="settings" element={<Settings />} />
                    </Route>
                    
                    {/* Admin Dashboard routes with MainLayout */}
                    <Route 
                        path="admin" 
                        element={
                            <ProtectedRoute requiredRole="admin">
                                <ArtistDash />
                            </ProtectedRoute>
                        }
                    >
                        <Route index element={<AdminHome />} />
                        <Route path="dashboard" element={<AdminHome />} />
                        <Route path="control" element={<ControlArtworks />} />
                        <Route path="users" element={<UsersManagement />} />
                        <Route path="admin-management" element={<AdminManagement />} />
                    </Route>
                </Route>
            </Routes>
        </>
    )
}

export default AppRoutes