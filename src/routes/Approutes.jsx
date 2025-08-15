import React from 'react'
import Navbar from '../components/Navbar'
import Auth from '../pages/Auth'
import Footer from '../components/Footer'
import AuthContextProvider from '../context/AuthContextProvider'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from '../pages/Home'
import Artworks from '../pages/Artworks'
import Faqs from '../pages/Faqs'
import Contact from '../pages/Contact'
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
import ScrollRestore from '../components/ScrollRestore'
import ProtectedRoute from './ProtectedRoutes'
const AppRoutes = () => {
    return (
        <AuthContextProvider>
            <Router>
                <ScrollRestore />
                <Routes>
                    <Route path="/" element={<MainLayout />}>
                        <Route path="/auth" element={<Auth />} />
                        <Route index element={<Home />} />
                        <Route path="/artworks" element={<Artworks />} />
                        <Route path="/faqs" element={<Faqs />} />
                        <Route path="/contact" element={<Contact />} />
                        

                        <Route path="/dashboard" element={
                            <ProtectedRoute><ArtistDash /></ProtectedRoute>}>
                            <Route index element={<DashboardHome />} />
                            <Route path="upload" element={<UploadArtworks />} />
                            <Route path="artworks" element={<MyArtworks />} />

                            <Route path="licenses" element={<Licenses />} />

                            <Route path="piracy" element={<Piracy />} />
                            <Route path="wallet" element={<Wallets />} />
                            <Route path="settings" element={<Settings />} />

                        </Route>
                         <Route path='/admin' element={<ArtistDash />}>
                        <Route index element={<AdminHome />} />
                        <Route path="control" element={<ControlArtworks />} />
                        <Route path="users" element={<UsersManagement />} />
                        {/* Admin management page ka route */}
                        <Route path="admin-management" element={<AdminManagement />} />
                        </Route>

                        </Route>
                </Routes>
            </Router>
        </AuthContextProvider>
    )
}

export default AppRoutes