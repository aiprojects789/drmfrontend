import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";
import { useAuth } from "../context/AuthContext";
import { artworksAPI, recommendationAPI } from "../services/api";
import {
  Palette,
  Search,
  Filter,
  ArrowRight,
  ShoppingCart,
  FileText,
  Sparkles,
  History,
  TrendingUp,
} from "lucide-react";
import LoadingSpinner from "../components/common/LoadingSpinner";
import IPFSImage from "../components/common/IPFSImage";
import toast from "react-hot-toast";

const Explorer = () => {
  const { account, isCorrectNetwork } = useWeb3();
  const { isAuthenticated, user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  
  // All artworks data
  const [allArtworks, setAllArtworks] = useState([]);
  const [recommendedArtworks, setRecommendedArtworks] = useState([]);
  
  // Display data (merged: recommended first + remaining artworks)
  const [displayedArtworks, setDisplayedArtworks] = useState([]);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    licensed: "all",
    royalty: "all",
  });
  const [viewMode, setViewMode] = useState("unified"); // "unified" or "search"
  const [hasRecommendations, setHasRecommendations] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [recommendationAttempts, setRecommendationAttempts] = useState(0);

  // Helper to extract user ID from various sources
  const getEffectiveUserId = () => {
    // Priority 1: Direct user ID from auth context
    if (user?.id) {
      console.log('✅ Using user.id from auth context:', user.id);
      return user.id;
    }
    
    // Priority 2: Check for user ID in different properties
    if (user?._id) {
      console.log('✅ Using user._id from auth context:', user._id);
      return user._id;
    }
    
    // Priority 3: Extract from JWT token if available
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userIdFromToken = payload.userId || payload.user_id || payload.sub || payload.id;
        if (userIdFromToken) {
          console.log('✅ Using user ID from JWT token:', userIdFromToken);
          return userIdFromToken;
        }
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    }
    
    // Priority 4: Use wallet address as fallback (if your backend supports it)
    if (account) {
      console.log('⚠️ Using wallet address as user ID fallback:', account);
      return account.toLowerCase();
    }
    
    console.log('❌ No user ID available from any source');
    return null;
  };

  // Fetch all artworks
  const fetchAllArtworks = async () => {
    try {
      const response = await artworksAPI.getAll({ page: 1, size: 100 });
      const artworks = response.data || response.artworks || [];
      setAllArtworks(artworks);
      return artworks;
    } catch (error) {
      console.error("Error fetching artworks:", error);
      toast.error("Failed to load artworks");
      return [];
    }
  };

  // Fetch personalized recommendations
  const fetchRecommendations = async (effectiveUserId = null) => {
    const userId = effectiveUserId || getEffectiveUserId();
    
    if (!userId) {
      console.log('⚠️ No user ID available - skipping recommendations');
      return [];
    }
    
    console.log(`🎯 Fetching recommendations for user: ${userId}`);
    
    try {
      const response = await recommendationAPI.getRecommendations(userId, 10);
      console.log('📦 Recommendations response:', response);
      
      // Handle different response formats
      let allRecommended = [];
      
      if (response.recommendations) {
        // New format with categorized recommendations
        allRecommended = [
          ...(response.recommendations.recommended_for_you || []),
          ...(response.recommendations.search_based || []),
          ...(response.recommendations.purchase_based || []),
          ...(response.recommendations.upload_based || []),
          ...(response.recommendations.view_based || [])
        ];
      } else if (response.results) {
        // Legacy format
        allRecommended = response.results;
      }
      
      console.log(`📊 Combined recommendations: ${allRecommended.length} artworks`);
      
      // Remove duplicates from recommendations themselves
      const uniqueRecommended = allRecommended.filter((artwork, index, self) => {
        const artId = artwork._id || artwork.id;
        if (!artId) return true;
        return index === self.findIndex((a) => {
          const aId = a._id || a.id;
          return aId === artId;
        });
      });
      
      console.log(`✅ Unique recommendations: ${uniqueRecommended.length} artworks`);
      console.log('🆔 Recommended artwork IDs:', uniqueRecommended.map(a => a._id || a.id));
      
      setRecommendedArtworks(uniqueRecommended);
      setHasRecommendations(uniqueRecommended.length > 0);
      return uniqueRecommended;
    } catch (error) {
      console.error("❌ Failed to fetch recommendations:", error);
      
      // If it's a 404 or user not found, don't retry
      if (error.response?.status === 404) {
        console.log('👤 User not found in recommendation system - this is normal for new users');
        toast.success('Explore artworks to get personalized recommendations!');
      } else {
        toast.error('Failed to load recommendations');
      }
      
      return [];
    }
  };

  // Merge recommendations with all artworks (recommended first, no duplicates)
  const mergeArtworks = (recommended, all) => {
    console.log(`🔀 Merging artworks - Recommended: ${recommended.length}, All: ${all.length}`);
    
    // Create a Set of recommended artwork IDs for fast lookup
    const recommendedIds = new Set(recommended.map(art => {
      // Handle both string and object ID formats
      const id = art._id || art.id;
      return id ? id.toString() : null;
    }).filter(id => id !== null));
    
    console.log('📋 Recommended IDs:', Array.from(recommendedIds));
    
    // Filter out recommended artworks from all artworks using ID comparison
    const remainingArtworks = all.filter(art => {
      const artId = art._id || art.id;
      return artId ? !recommendedIds.has(artId.toString()) : true;
    });
    
    console.log(`📊 After filtering - Remaining: ${remainingArtworks.length}`);
    
    // Merge: recommended first, then remaining
    const merged = [...recommended, ...remainingArtworks];
    console.log(`✅ Merged result: ${merged.length} total (${recommended.length} recommended first)`);
    
    return merged;
  };

  // Perform semantic search
  const performSearch = async (query) => {
    if (!query.trim()) {
      // Reset to unified view
      setViewMode("unified");
      const merged = mergeArtworks(recommendedArtworks, allArtworks);
      applyFiltersToArtworks(merged);
      return;
    }

    setIsSearching(true);
    try {
      const response = await recommendationAPI.searchArtworks(query, 20);
      const searchResults = response.results || [];
      
      setViewMode("search");
      applyFiltersToArtworks(searchResults);
      
      if (searchResults.length === 0) {
        toast.success("No artworks found matching your search");
      } else {
        toast.success(`Found ${searchResults.length} artworks`);
      }
    } catch (error) {
      console.error("Search failed:", error);
      toast.error("Search failed");
      // Fallback to local search
      handleLocalSearch(query);
    } finally {
      setIsSearching(false);
    }
  };

  // Fallback local search
  const handleLocalSearch = (query) => {
    const searchLower = query.toLowerCase();
    const results = allArtworks.filter((artwork) => {
      if (!artwork) return false;

      const title = artwork.title || "";
      const description = artwork.description || "";
      const creator = artwork.creator_address || "";
      const tokenId = artwork.token_id?.toString() || "";

      return (
        title.toLowerCase().includes(searchLower) ||
        description.toLowerCase().includes(searchLower) ||
        creator.toLowerCase().includes(searchLower) ||
        tokenId.includes(query)
      );
    });

    setViewMode("search");
    applyFiltersToArtworks(results);
    
    if (results.length === 0) {
      toast.success("No artworks found matching your search");
    } else {
      toast.success(`Found ${results.length} artworks`);
    }
  };

  // Apply filters to artworks with duplicate protection
  const applyFiltersToArtworks = (artworks) => {
    let results = [...artworks];

    // Remove duplicates by ID (safety check)
    const uniqueResults = results.filter((artwork, index, self) => {
      const artId = artwork?._id || artwork?.id;
      if (!artId) return true;
      
      const firstIndex = self.findIndex(a => {
        const aId = a?._id || a?.id;
        return aId === artId;
      });
      
      return index === firstIndex;
    });

    if (uniqueResults.length !== results.length) {
      console.warn(`🔄 Removed ${results.length - uniqueResults.length} duplicates`);
      results = uniqueResults;
    }

    if (filters.licensed !== "all") {
      const isLicensed = filters.licensed === "licensed";
      results = results.filter(
        (artwork) => artwork?.is_licensed === isLicensed
      );
    }

    if (filters.royalty !== "all") {
      results = results.filter((artwork) => {
        if (!artwork || !artwork.royalty_percentage) return false;
        const royalty = artwork.royalty_percentage / 100;
        switch (filters.royalty) {
          case "low":
            return royalty < 5;
          case "medium":
            return royalty >= 5 && royalty < 15;
          case "high":
            return royalty >= 15;
          default:
            return true;
        }
      });
    }

    setDisplayedArtworks(results);
  };

  // Handle search input with debounce
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.trim()) {
        performSearch(searchTerm);
      } else if (viewMode === "search") {
        // Reset to unified view
        setViewMode("unified");
        const merged = mergeArtworks(recommendedArtworks, allArtworks);
        applyFiltersToArtworks(merged);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // Initial load
  useEffect(() => {
    const initializeExplorer = async () => {
      console.log('🚀 Initializing Explorer...');
      console.log('👤 User object:', user);
      console.log('🆔 User ID:', user?.id);
      console.log('🔐 Is Authenticated:', isAuthenticated);
      console.log('👛 Wallet Account:', account);
      
      setIsLoading(true);
      
      // Wait a bit for user data to load if authenticated but no user.id
      if (isAuthenticated && !user?.id && retryCount < 3) {
        console.log('⏳ Waiting for user data to load...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('👤 User object after wait:', user);
        setRetryCount(prev => prev + 1);
      }
      
      // Fetch all artworks
      const artworks = await fetchAllArtworks();
      console.log(`📚 Fetched ${artworks.length} total artworks`);
      
      // Fetch recommendations if user is logged in AND has user.id
      let recommended = [];
      const effectiveUserId = getEffectiveUserId();
      
      if (effectiveUserId) {
        console.log('✅ User ID found, fetching recommendations...');
        recommended = await fetchRecommendations(effectiveUserId);
      } else {
        console.log('⚠️ No user ID available, skipping recommendations');
        if (isAuthenticated) {
          console.log('🔍 Debug: User is authenticated but missing ID:', {
            user, 
            isAuthenticated,
            hasUserId: !!user?.id,
            hasAccount: !!account,
            effectiveUserId
          });
        }
      }
      
      // Merge and display
      const merged = mergeArtworks(recommended, artworks);
      applyFiltersToArtworks(merged);
      
      setIsLoading(false);
    };

    initializeExplorer();
  }, [user?.id, isAuthenticated, account, retryCount]);

  // Retry recommendations if needed
  useEffect(() => {
    const retryRecommendations = async () => {
      if (isAuthenticated && user?.id && allArtworks.length > 0 && 
          !hasRecommendations && recommendationAttempts < 3) {
        
        console.log('🔄 Retrying recommendations... Attempt:', recommendationAttempts + 1);
        setRecommendationAttempts(prev => prev + 1);
        
        const effectiveUserId = getEffectiveUserId();
        if (effectiveUserId) {
          const recommended = await fetchRecommendations(effectiveUserId);
          if (recommended.length > 0) {
            const merged = mergeArtworks(recommended, allArtworks);
            applyFiltersToArtworks(merged);
          }
        }
        
        // Add delay between retries
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    };

    retryRecommendations();
  }, [user?.id, isAuthenticated, allArtworks.length, hasRecommendations]);

  // Apply filters when filters change
  useEffect(() => {
    if (viewMode === "unified") {
      const merged = mergeArtworks(recommendedArtworks, allArtworks);
      applyFiltersToArtworks(merged);
    } else if (viewMode === "search") {
      // Reapply filters to current displayed artworks
      applyFiltersToArtworks(displayedArtworks);
    }
  }, [filters]);

  const resetFilters = () => {
    setSearchTerm("");
    setFilters({ licensed: "all", royalty: "all" });
    setViewMode("unified");
    const merged = mergeArtworks(recommendedArtworks, allArtworks);
    applyFiltersToArtworks(merged);
  };

  // Track artwork view when user clicks on artwork
  const handleArtworkClick = async (artworkId) => {
    const effectiveUserId = getEffectiveUserId();
    if (effectiveUserId) {
      await recommendationAPI.trackArtworkView(artworkId);
    }
  };

  // Check if an artwork is recommended
  const isRecommended = (artworkId) => {
    if (!artworkId) return false;
    
    const artworkIdStr = artworkId.toString();
    const recommended = recommendedArtworks.some(art => {
      const artId = art._id || art.id;
      return artId ? artId.toString() === artworkIdStr : false;
    });
    
    return recommended;
  };

  // Debug: Check for duplicates before rendering
  useEffect(() => {
    if (displayedArtworks.length > 0) {
      const duplicateIds = displayedArtworks
        .map(a => a._id || a.id)
        .filter((id, index, self) => self.indexOf(id) !== index && id !== undefined);
      
      if (duplicateIds.length > 0) {
        console.warn('🚨 DUPLICATES FOUND IN DISPLAY:', duplicateIds);
      } else {
        console.log('✅ No duplicates in displayed artworks');
      }
    }
  }, [displayedArtworks]);

  return (
    <div className="bg-white min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900 to-purple-700 opacity-90"></div>
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{
            backgroundImage:
              "url('https://images.pexels.com/photos/373965/pexels-photo-373965.jpeg?auto=compress&cs=tinysrgb&w=1600')",
          }}
        ></div>
        <div className="relative max-w-4xl mx-auto py-20 px-6 text-center">
          <h1 className="text-4xl font-extrabold text-white mb-4">
            Artwork Explorer
          </h1>
          <p className="text-lg text-purple-100 max-w-2xl mx-auto">
            Discover amazing artworks with AI-powered recommendations and search.
          </p>
          <p className="text-md text-purple-200 mt-2">
            {viewMode === "search" 
              ? `Search results for "${searchTerm}"`
              : hasRecommendations
              ? `${recommendedArtworks.length} personalized recommendations • ${allArtworks.length} total artworks`
              : isAuthenticated
              ? `${allArtworks.length} artworks in our collection • Explore to get recommendations!`
              : `${allArtworks.length} artworks in our collection • Sign in for personalized recommendations`
            }
          </p>

          {isAuthenticated && (
            <div className="mt-6">
              <Link
                to="/dashboard/upload"
                className="inline-flex items-center px-8 py-3 text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-md"
              >
                Register Artwork
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Recommendations Info Banner */}
      {hasRecommendations && viewMode === "unified" && (
        <div className="max-w-6xl mx-auto px-6 -mt-2 mb-4">
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center text-purple-800">
              <Sparkles className="w-5 h-5 mr-2" />
              <span className="font-medium">
                Showing {recommendedArtworks.length} personalized recommendations first, followed by other artworks
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Search + Filters */}
      <div className="max-w-6xl mx-auto px-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-lg shadow-md">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-600" />
            </div>
            <input
              type="text"
              placeholder="Search by title, description, creator, or token ID..."
              className="block w-full pl-10 pr-3 py-3 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {isSearching && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <LoadingSpinner size="small" />
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <select
              className="text-sm border border-gray-400 rounded-md px-3 py-2 bg-white"
              value={filters.licensed}
              onChange={(e) =>
                setFilters({ ...filters, licensed: e.target.value })
              }
            >
              <option value="all">All Licenses</option>
              <option value="licensed">Licensed Only</option>
              <option value="unlicensed">Unlicensed Only</option>
            </select>

            <select
              className="text-sm border border-gray-400 rounded-md px-3 py-2 bg-white"
              value={filters.royalty}
              onChange={(e) =>
                setFilters({ ...filters, royalty: e.target.value })
              }
            >
              <option value="all">All Royalties</option>
              <option value="low">Low (&lt;5%)</option>
              <option value="medium">Medium (5-15%)</option>
              <option value="high">High (&gt;15%)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Artwork Grid */}
      <div className="max-w-7xl mx-auto px-6 pb-16">
        {isLoading ? (
          <div className="flex justify-center p-12">
            <LoadingSpinner size="large" />
          </div>
        ) : displayedArtworks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow border border-gray-200">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">
              {viewMode === "search" 
                ? `No artworks found for "${searchTerm}"`
                : "No artworks found matching your criteria"
              }
            </p>
            <button
              onClick={resetFilters}
              className="text-purple-600 hover:text-purple-800 font-medium"
            >
              {viewMode === "search" ? "Clear search" : "Clear all filters"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {displayedArtworks.map((artwork) => (
              <div key={artwork._id || artwork.id} onClick={() => handleArtworkClick(artwork._id || artwork.id)}>
                <ArtworkCard
                  artwork={artwork}
                  currentAccount={account}
                  isRecommended={isRecommended(artwork._id || artwork.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ArtworkCard = ({ artwork, currentAccount, isRecommended }) => {
  const isOwner =
    currentAccount &&
    artwork.owner_address &&
    currentAccount.toLowerCase() === artwork.owner_address.toLowerCase();

  const getImageUrl = () => {
    if (artwork.image_url) return artwork.image_url;
    if (artwork.metadata_uri && artwork.metadata_uri.includes("ipfs://")) {
      return artwork.metadata_uri;
    }
    return null;
  };

  const imageUrl = getImageUrl();

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-xl transition-all relative">
      {/* Recommended Badge */}
      {isRecommended && (
        <div className="absolute top-3 right-3 z-20">
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center shadow-lg border-2 border-white">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 animate-pulse" />
            FOR YOU
          </div>
        </div>
      )}
      
      <div className="bg-gray-100 h-48 flex items-center justify-center">
        {imageUrl ? (
          <IPFSImage
            ipfsUri={imageUrl}
            tokenId={artwork.token_id}
            alt={artwork.title || `Artwork ${artwork.token_id}`}
            className="w-full h-full object-cover"
            showFallbackInfo={true}
          />
        ) : (
          <div className="text-center">
            <Palette className="w-16 h-16 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Artwork #{artwork.token_id}</p>
            <p className="text-xs text-gray-400">{artwork.title}</p>
          </div>
        )}
      </div>
      <div className="p-6">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-900">
            {artwork.title || `Artwork #${artwork.token_id}`}
          </h3>
          <span
            className={`px-2 py-1 text-xs rounded-full ${
              artwork.is_licensed
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {artwork.is_licensed ? "Licensed" : "Available"}
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-4 line-clamp-2">
          {artwork.description || "No description available"}
        </p>
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-xs text-gray-500">Creator</p>
            <p className="text-sm font-mono">
              {artwork.creator_address?.substring(0, 6)}...
              {artwork.creator_address?.substring(38)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Royalty</p>
            <p className="text-sm font-semibold">
              {artwork.royalty_percentage
                ? `${(artwork.royalty_percentage / 100).toFixed(2)}%`
                : "N/A"}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Link
            to={`/artwork/${artwork.token_id}`}
            className="flex-1 inline-flex items-center justify-center text-sm font-medium text-purple-600 hover:text-purple-800 border border-purple-200 rounded-lg px-3 py-2 hover:bg-purple-50 transition-colors"
          >
            View details <ArrowRight className="w-4 h-4 ml-1" />
          </Link>

          {!isOwner && (
            <>
              <Link
                to={`/sale/${artwork.token_id}`}
                className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                title="Purchase this artwork"
              >
                <ShoppingCart className="w-4 h-4 mr-1" />
                Buy
              </Link>

              <Link
                to={`/license/${artwork.token_id}`}
                className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                title="Purchase a license for this artwork"
              >
                <FileText className="w-4 h-4 mr-1" />
                License
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Explorer;