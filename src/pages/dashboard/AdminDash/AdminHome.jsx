import React, { useEffect, useState } from 'react';
import BoxCard from '../../../components/dashboard/BoxCard';
import axios from 'axios';
import { baseURL } from '../../../utils/backend_url'; // adjust path if needed

const AdminHome = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    newUsers: 0,
    activeArtworks: 0,
    totalArtworks: 0,
    pendingArtworks: 0
  });

useEffect(() => {
  const fetchStats = async () => {
    try {
      // Parallel API calls
      const [usersRes, artworksRes] = await Promise.all([
        axios.get(`${baseURL}/admin/users/summary-full`),
        axios.get(`${baseURL}/admin/artworks/summary-full?page=1&limit=50`)
      ]);

      setStats({
        totalUsers: usersRes.data.total_users,
        newUsers: usersRes.data.new_users_this_week,
        totalArtworks: artworksRes.data.total_artworks,
        activeArtworks: artworksRes.data.approved_artworks,
        pendingArtworks: artworksRes.data.pending_artworks
      });
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    }
  };

  fetchStats();
}, []);

  return (
    <>
      <h1 className='text-2xl font-bold'>Admin Dashboard</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <BoxCard title="Total Users" count={stats.totalUsers} />
        <BoxCard title="New Users" count={stats.newUsers} />
        <BoxCard title="Total Artworks" count={stats.totalArtworks} />
        <BoxCard title="Active Artworks" count={stats.activeArtworks} />
        <BoxCard title="Pending Artworks" count={stats.pendingArtworks} />
      </div>
    </>
  );
};

export default AdminHome;
