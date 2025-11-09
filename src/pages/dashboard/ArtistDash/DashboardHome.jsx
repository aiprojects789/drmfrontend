import React, { useState, useEffect } from 'react';
import BoxCard from '../../../components/dashboard/BoxCard';
import { artworksAPI, licensesAPI, transactionsAPI } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { UserIdentifier, CurrencyConverter } from '../../../utils/currencyUtils';

const DashboardHome = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState([
    { label: 'Total Artworks Uploaded', value: 0, loading: true },
    { label: 'Total Earning', value: '$0', loading: true },
    { label: 'Active Licenses', value: 0, loading: true },
  ]);
  const [boxStats, setBoxStats] = useState({
    artworks: { value: 0, loading: true },
    licenses: { value: 0, loading: true },
    activeLicenses: { value: 0, loading: true },
    piracy: { value: 0, loading: false }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get user identifier
  const userIdentifier = UserIdentifier.getUserIdentifier(user);
  const isPayPalUser = UserIdentifier.isPayPalUser(user);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        if (!userIdentifier) {
          throw new Error('User identifier not available');
        }

        console.log(`📊 Fetching dashboard data for: ${userIdentifier}`);

        // Fetch all data in parallel
        const [artworksResponse, licensesResponse, transactionsResponse] = await Promise.allSettled([
          artworksAPI.getByCreator(userIdentifier, { page: 1, size: 1 }),
          licensesAPI.getByUser(userIdentifier, { as_licensee: false }),
          transactionsAPI.getByUser(userIdentifier)
        ]);

        // Process artworks data
        let totalArtworks = 0;
        if (artworksResponse.status === 'fulfilled') {
          totalArtworks = artworksResponse.value.total || 0;
        }

        // Process licenses data
        let activeLicenses = 0;
        let totalLicenses = 0;
        if (licensesResponse.status === 'fulfilled') {
          totalLicenses = licensesResponse.value.total || 0;
          activeLicenses = licensesResponse.value.data.filter(license => 
            license.is_active && new Date(license.end_date) > new Date()
          ).length;
        }

        // Process transactions data
        let totalEarnings = 0;
        if (transactionsResponse.status === 'fulfilled') {
          const royaltyTransactions = transactionsResponse.value.data.filter(tx => 
            tx.transaction_type === 'ROYALTY_PAYMENT' && tx.status === 'CONFIRMED'
          );
          
          // Sum earnings in ETH
          totalEarnings = royaltyTransactions.reduce((sum, tx) => {
            const value = parseFloat(tx.value) || 0;
            return sum + value;
          }, 0);
        }

        // Format earnings based on user type
        let formattedEarnings;
        if (isPayPalUser) {
          // Show USD for PayPal users
          const usdEarnings = CurrencyConverter.ethToUsd(totalEarnings);
          formattedEarnings = CurrencyConverter.formatUsd(usdEarnings);
        } else {
          // Show both for crypto users
          const usdEarnings = CurrencyConverter.ethToUsd(totalEarnings);
          formattedEarnings = `${CurrencyConverter.formatEth(totalEarnings)} (${CurrencyConverter.formatUsd(usdEarnings)})`;
        }

        // Update stats
        setStats([
          { label: 'Total Artworks Uploaded', value: totalArtworks, loading: false },
          { label: 'Total Earning', value: formattedEarnings, loading: false },
          { label: 'Active Licenses', value: activeLicenses, loading: false },
        ]);

        // Update box stats
        setBoxStats({
          artworks: { value: totalArtworks, loading: false },
          licenses: { value: totalLicenses, loading: false },
          activeLicenses: { value: activeLicenses, loading: false },
          piracy: { value: 0, loading: false }
        });

        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err.message);
        setLoading(false);
        
        // Set loading to false for all stats on error
        setStats(stats.map(stat => ({ ...stat, loading: false })));
        setBoxStats({
          artworks: { ...boxStats.artworks, loading: false },
          licenses: { ...boxStats.licenses, loading: false },
          activeLicenses: { ...boxStats.activeLicenses, loading: false },
          piracy: { ...boxStats.piracy, loading: false }
        });
      }
    };

    if (userIdentifier) {
      fetchDashboardData();
    }
  }, [userIdentifier]);

  const refreshData = () => {
    setStats(stats.map(stat => ({ ...stat, loading: true })));
    setBoxStats({
      artworks: { ...boxStats.artworks, loading: true },
      licenses: { ...boxStats.licenses, loading: true },
      activeLicenses: { ...boxStats.activeLicenses, loading: true },
      piracy: { ...boxStats.piracy, loading: false }
    });
    setLoading(true);
    setError(null);
    
    // Trigger re-fetch by changing a dependency
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mb-4"></div>
        <p className="text-purple-800 font-medium">Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-purple-900">Dashboard Overview</h1>
            <p className="text-purple-700 mt-2">Welcome back! Here's your creative portfolio summary.</p>
            {/* User Type Indicator */}
            <p className="text-sm text-purple-600 mt-1">
              Account Type: {isPayPalUser ? '💳 PayPal User' : '👛 Crypto User'}
            </p>
          </div>
          <button 
            onClick={refreshData}
            className="mt-4 md:mt-0 flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Data
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md">
            <p className="font-medium">Error loading data</p>
            <p>{error}</p>
            <button 
              onClick={refreshData}
              className="mt-2 text-red-800 underline font-medium"
            >
              Try again
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500 hover:shadow-lg transition-all duration-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-purple-600 text-sm font-medium">{stat.label}</p>
                  {stat.loading ? (
                    <div className="h-8 w-20 bg-gray-200 animate-pulse rounded mt-2"></div>
                  ) : (
                    <p className="text-2xl font-bold text-gray-800 mt-2">{stat.value}</p>
                  )}
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {index === 0 ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    ) : index === 1 ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    )}
                  </svg>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center">
                  <div className={`h-2 rounded-full ${index === 0 ? 'bg-blue-500' : index === 1 ? 'bg-purple-500' : 'bg-indigo-500'} w-full`}>
                    <div 
                      className={`h-2 rounded-full ${index === 0 ? 'bg-blue-300' : index === 1 ? 'bg-purple-300' : 'bg-indigo-300'}`}
                      style={{ width: `${Math.min(100, (stat.value / (index === 0 ? 50 : index === 1 ? 10000 : 100)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Box Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <BoxCard 
            title="Total Artworks Uploaded" 
            count={boxStats.artworks.loading ? '...' : boxStats.artworks.value.toString()}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
            color="blue"
          />
          <BoxCard 
            title="Total Licenses Earned" 
            count={boxStats.licenses.loading ? '...' : boxStats.licenses.value.toString()}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            }
            color="purple"
          />
          <BoxCard 
            title="Active Licenses Detected" 
            count={boxStats.activeLicenses.loading ? '...' : boxStats.activeLicenses.value.toString()}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            }
            color="indigo"
          />
          <BoxCard 
            title="Piracy Cases Detected" 
            count={boxStats.piracy.value.toString()}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            }
            color="gray"
          />
        </div>

        {/* Additional Info Section */}
        <div className="mt-10 bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-purple-900 mb-4">Portfolio Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center p-4 bg-blue-50 rounded-lg">
              <div className="bg-blue-100 p-3 rounded-full mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <p className="text-blue-800 font-medium">Artwork Performance</p>
                <p className="text-blue-600 text-sm">Your artworks are getting attention</p>
              </div>
            </div>
            <div className="flex items-center p-4 bg-purple-50 rounded-lg">
              <div className="bg-purple-100 p-3 rounded-full mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <p className="text-purple-800 font-medium">License Analytics</p>
                <p className="text-purple-600 text-sm">{boxStats.activeLicenses.value} active licenses</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;