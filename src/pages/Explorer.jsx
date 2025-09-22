import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";
import { useAuth } from "../context/AuthContext";
import { artworksAPI } from "../services/api";
import {
  Palette,
  Search,
  Filter,
  ArrowRight,
  ShoppingCart,
  FileText,
} from "lucide-react";
import LoadingSpinner from "../components/common/LoadingSpinner";
import IPFSImage from "../components/common/IPFSImage";
import toast from "react-hot-toast";

const Explorer = () => {
  const { account, isCorrectNetwork } = useWeb3();
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [artworkData, setArtworkData] = useState({
    artworks: [],
    total: 0,
    page: 1,
    size: 20,
    hasNext: false,
  });
  const [filteredArtworks, setFilteredArtworks] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    licensed: "all",
    royalty: "all",
  });

  // Fetch all artworks with pagination
  const fetchArtworks = async (page = 1, size = 20) => {
    setIsLoading(true);
    try {
      const response = await artworksAPI.getAll({ page, size });

      const artworks = response.data || response.artworks || [];
      const total = response.total || artworks.length;
      const hasNext = response.has_next || false;

      setArtworkData({
        artworks: artworks,
        total: total,
        page: page,
        size: size,
        hasNext: hasNext,
      });

      setFilteredArtworks(artworks);
    } catch (error) {
      console.error("Error fetching artworks:", error);
      toast.error(error.response?.data?.detail || "Failed to load artworks");
      setArtworkData((prev) => ({ ...prev, artworks: [] }));
      setFilteredArtworks([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchArtworks();
  }, []);

  // Apply filters and search
  useEffect(() => {
    let results = [...artworkData.artworks];

    if (searchTerm) {
      results = results.filter((artwork) => {
        if (!artwork) return false;

        const searchLower = searchTerm.toLowerCase();
        const title = artwork.title || "";
        const description = artwork.description || "";
        const creator = artwork.creator_address || "";
        const tokenId = artwork.token_id?.toString() || "";

        return (
          title.toLowerCase().includes(searchLower) ||
          description.toLowerCase().includes(searchLower) ||
          creator.toLowerCase().includes(searchLower) ||
          tokenId.includes(searchTerm)
        );
      });
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

    setFilteredArtworks(results);
  }, [searchTerm, filters, artworkData.artworks]);

  const loadMore = () => {
    if (artworkData.hasNext) {
      fetchArtworks(artworkData.page + 1, artworkData.size);
    }
  };

  const resetFilters = () => {
    setSearchTerm("");
    setFilters({ licensed: "all", royalty: "all" });
    fetchArtworks();
  };

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
            Browse, discover, and license artworks securely with blockchain-
            powered DRM.
          </p>
          <p className="text-md text-purple-200 mt-2">
            {artworkData.total} artworks registered in the ArtDRM ecosystem
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

      {/* Search + Filters */}
      <div className="max-w-6xl mx-auto px-6 -mt-2 mb-12">
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
        {isLoading && artworkData.page === 1 ? (
          <div className="flex justify-center p-12">
            <LoadingSpinner size="large" />
          </div>
        ) : filteredArtworks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow border border-gray-200">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">
              No artworks found matching your criteria
            </p>
            <button
              onClick={resetFilters}
              className="text-purple-600 hover:text-purple-800 font-medium"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {filteredArtworks.map((artwork) => (
                <ArtworkCard
                  key={artwork.token_id || artwork.id}
                  artwork={artwork}
                  currentAccount={account}
                />
              ))}
            </div>

            {artworkData.hasNext && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={loadMore}
                  disabled={isLoading}
                  className={`px-6 py-3 rounded-lg font-medium ${
                    isLoading
                      ? "bg-gray-300 text-gray-500"
                      : "bg-purple-600 text-white hover:bg-purple-700 shadow-md"
                  }`}
                >
                  {isLoading ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const ArtworkCard = ({ artwork, currentAccount }) => {
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
    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-xl transition-all">
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
