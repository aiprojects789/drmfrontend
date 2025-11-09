import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { artworksAPI } from '../../../services/api';
import { Palette, ArrowRight } from 'lucide-react';
import { UserIdentifier, CurrencyConverter } from '../../../utils/currencyUtils';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import IPFSImage from '../../../components/common/IPFSImage';
import { Link } from 'react-router-dom';

const MyArtworks = () => {
  const { isAuthenticated, user } = useAuth();
  const [artworks, setArtworks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get user identifier for API calls
  const userIdentifier = UserIdentifier.getUserIdentifier(user);

  // Fetch user artworks
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchArtworks = async () => {
      setIsLoading(true);
      setError(null);

      try {
        console.log('🔄 Fetching artworks for user:', userIdentifier);
        
        if (!userIdentifier) {
          throw new Error('User identifier not found');
        }
        
        // Use the artworksAPI with user identifier
        const response = await artworksAPI.getByOwner(userIdentifier, { page: 1, size: 100 });
        
        // Handle different response structures
        const artworksData = response.data || response.artworks || [];
        setArtworks(artworksData);
        
        console.log('✅ Fetched artworks:', artworksData.length);
        
      } catch (error) {
        console.error('❌ Error fetching artworks:', error);
        setError(`Failed to load artworks: ${error.message}`);
        toast.error('Failed to load artworks');
        setArtworks([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchArtworks();
  }, [isAuthenticated, userIdentifier]);

  // Helper function to format dates safely
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown Date';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        const altDate = new Date(dateString.replace(/\.\d+Z$/, 'Z'));
        if (!isNaN(altDate.getTime())) {
          return altDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
        }
        return 'Invalid Date';
      }
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
      return 'Invalid Date';
    }
  };

  // Format price with currency
  const formatPrice = (artwork) => {
    if (!artwork.price) return 'Not set';
    
    if (artwork.payment_method === 'paypal') {
      const usdAmount = CurrencyConverter.ethToUsd(artwork.price);
      return CurrencyConverter.formatUsd(usdAmount);
    }
    return CurrencyConverter.formatEth(artwork.price);
  };

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center bg-yellow-50 border border-yellow-200 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Authentication Required
          </h2>
          <p className="text-gray-600 mb-6">
            Please log in to view your artworks.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className='mb-6'>
        <h1 className="text-2xl font-bold text-gray-900">My Artworks</h1>
        <p className="mt-1 text-sm text-gray-500">
          View your uploaded artworks
        </p>
        {/* Debug info - remove in production */}
        <p className="mt-2 text-xs text-gray-400">
          User: {userIdentifier} ({UserIdentifier.isPayPalUser(user) ? 'PayPal' : 'Crypto'})
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center p-12">
          <LoadingSpinner size="medium" />
        </div>
      ) : artworks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow border border-gray-200">
          <Palette className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">
            You haven't registered any artworks yet
          </p>
          <Link
            to="/register"
            className="text-purple-600 hover:text-purple-800 font-medium"
          >
            Register your first artwork
          </Link>
        </div>
      ) : (
        <div className='grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {artworks.map((artwork) => {
            const formattedDate = formatDate(artwork.created_at);
            
            // Get the correct IPFS URI - check different possible fields
            const ipfsUri = artwork.metadata_uri || artwork.image_ipfs_uri || artwork.ipfs_hash;

            return (
              <div
                key={artwork.id || artwork.token_id}
                className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow"
              >
                <div className="bg-gray-100 h-48 flex items-center justify-center">
                  {ipfsUri ? (
                    <IPFSImage
                      ipfsUri={ipfsUri}
                      tokenId={artwork.token_id}
                      alt={artwork.title || `Artwork ${artwork.token_id || artwork.id}`}
                      className="w-full h-full object-cover"
                      showFallbackInfo={true}
                    />
                  ) : (
                    <div className="text-center">
                      <Palette className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No image available</p>
                    </div>
                  )}
                </div>
                
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {artwork.title || `Artwork #${artwork.token_id || artwork.id}`}
                    </h3>
                    <div className="flex flex-col items-end space-y-1">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          artwork.is_licensed
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {artwork.is_licensed ? "Licensed" : "Available"}
                      </span>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          artwork.payment_method === 'paypal'
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {artwork.payment_method === 'paypal' ? 'PayPal' : 'Crypto'}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-500 mb-4">
                    Created: {formattedDate}
                  </p>
                  
                  {artwork.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {artwork.description}
                    </p>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-500">Royalty</p>
                      <p className="text-sm font-semibold">
                        {artwork.royalty_percentage 
                          ? `${(artwork.royalty_percentage / 100).toFixed(2)}%`
                          : 'N/A'
                        }
                      </p>
                    </div>
                    
                    {artwork.price && (
                      <div>
                        <p className="text-xs text-gray-500">Price</p>
                        <p className="text-sm font-semibold">
                          {formatPrice(artwork)}
                        </p>
                      </div>
                    )}
                    
                    <Link
                      to={`/artwork/${artwork.token_id || artwork.id}`}
                      className="inline-flex items-center text-sm font-medium text-purple-600 hover:text-purple-800"
                    >
                      View details <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </div>

                  {/* Categories */}
                  {(artwork.medium_category || artwork.style_category || artwork.subject_category) && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex flex-wrap gap-1">
                        {artwork.medium_category && (
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                            {artwork.medium_category}
                          </span>
                        )}
                        {artwork.style_category && (
                          <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                            {artwork.style_category}
                          </span>
                        )}
                        {artwork.subject_category && (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                            {artwork.subject_category}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

export default MyArtworks;