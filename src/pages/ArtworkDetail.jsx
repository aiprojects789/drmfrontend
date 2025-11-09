import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";
import { useAuth } from "../context/AuthContext";
import { artworksAPI, licensesAPI } from "../services/api";
import { UserIdentifier, CurrencyConverter } from "../utils/currencyUtils";
import {
  Palette,
  User,
  Clock,
  DollarSign,
  Shield,
  ArrowLeft,
  Copy,
  ExternalLink,
  CheckCircle,
  XCircle,
  Wallet,
  CreditCard,
  ShoppingCart,
  FileText,
} from "lucide-react";
import LoadingSpinner from "../components/common/LoadingSpinner";
import toast from "react-hot-toast";
import IPFSImage from "../components/common/IPFSImage";

// Date formatting utility functions
const formatDate = (dateString) => {
  if (!dateString) return "N/A";

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      const altDate = new Date(dateString.replace(/\.\d+Z$/, "Z"));
      if (!isNaN(altDate.getTime())) {
        return altDate.toLocaleDateString();
      }
      return "Invalid Date";
    }

    return date.toLocaleDateString();
  } catch (error) {
    console.error("Error formatting date:", error, dateString);
    return "Invalid Date";
  }
};

const formatDateTime = (dateString) => {
  if (!dateString) return "N/A";

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      const altDate = new Date(dateString.replace(/\.\d+Z$/, "Z"));
      if (!isNaN(altDate.getTime())) {
        return altDate.toLocaleString();
      }
      return "Invalid Date";
    }

    return date.toLocaleString();
  } catch (error) {
    console.error("Error formatting date:", error, dateString);
    return "Invalid Date";
  }
};

const ArtworkDetail = () => {
  const { tokenId } = useParams();
  const { account, isCorrectNetwork } = useWeb3();
  const { isAuthenticated, user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [artwork, setArtwork] = useState(null);
  const [licenses, setLicenses] = useState([]);
  const [activeTab, setActiveTab] = useState("details");

  // Get user identifier - with null checks
  const userIdentifier = user ? UserIdentifier.getUserIdentifier(user) : null;
  const isPayPalUser = user ? UserIdentifier.isPayPalUser(user) : false;
  const isCryptoUser = user ? UserIdentifier.isCryptoUser(user) : false;

  useEffect(() => {
    const fetchArtworkData = async () => {
      if (!tokenId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Fetch artwork details
        const artworkResponse = await artworksAPI.getByTokenId(tokenId);
        if (artworkResponse && artworkResponse.data) {
          setArtwork(artworkResponse.data);
        } else {
          console.error("Invalid artwork response:", artworkResponse);
          setArtwork(null);
        }

        // Fetch licenses for this artwork
        try {
          const licensesResponse = await licensesAPI.getByArtwork(tokenId);

          // Handle different response structures
          let licensesData = [];
          if (Array.isArray(licensesResponse?.data)) {
            licensesData = licensesResponse.data;
          } else if (licensesResponse?.data?.licenses && Array.isArray(licensesResponse.data.licenses)) {
            licensesData = licensesResponse.data.licenses;
          } else if (licensesResponse?.data?.data && Array.isArray(licensesResponse.data.data)) {
            licensesData = licensesResponse.data.data;
          } else {
            console.log("Unexpected licenses response structure:", licensesResponse?.data);
          }

          setLicenses(licensesData);
        } catch (licenseError) {
          console.warn("Could not fetch licenses:", licenseError);
          setLicenses([]);
        }
      } catch (error) {
        console.error("Error fetching artwork:", error);
        toast.error("Failed to load artwork details");
        setArtwork(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchArtworkData();
  }, [tokenId]);

  const copyToClipboard = (text) => {
    if (!text) {
      toast.error("Nothing to copy");
      return;
    }
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const formatAddress = (address) => {
    if (!address) return "N/A";
    return `${address.substring(0, 8)}...${address.substring(address.length - 6)}`;
  };

  // Check if current user is owner (supports both crypto and PayPal users)
  const isOwner = artwork && (
    (account && artwork.owner_address?.toLowerCase() === account.toLowerCase()) ||
    (userIdentifier && artwork.owner_id === userIdentifier)
  );

  // Format price display based on user type
  const formatPrice = (price) => {
    if (!price && price !== 0) return 'Not set';
    
    if (isPayPalUser) {
      // PayPal users see USD
      const usdAmount = CurrencyConverter.ethToUsd(price);
      return CurrencyConverter.formatUsd(usdAmount);
    }
    
    // Crypto users see both
    const usdAmount = CurrencyConverter.ethToUsd(price);
    return (
      <div>
        <div className="text-2xl font-bold text-green-900">
          {CurrencyConverter.formatEth(price)}
        </div>
        <div className="text-sm text-green-700 mt-1">
          ≈ {CurrencyConverter.formatUsd(usdAmount)}
        </div>
      </div>
    );
  };

  // Format license fee based on user type
  const formatLicenseFee = (license) => {
    const fee = license.total_amount_eth || license.fee_paid || 0;
    
    if (isPayPalUser) {
      const usdAmount = CurrencyConverter.ethToUsd(fee);
      return CurrencyConverter.formatUsd(usdAmount);
    }
    
    const usdAmount = CurrencyConverter.ethToUsd(fee);
    return `${CurrencyConverter.formatEth(fee)} (≈ ${CurrencyConverter.formatUsd(usdAmount)})`;
  };

  // Safe function to get licenses array
  const getLicensesArray = () => {
    if (!licenses) return [];
    if (Array.isArray(licenses)) return licenses;
    if (licenses.licenses && Array.isArray(licenses.licenses)) return licenses.licenses;
    if (licenses.data && Array.isArray(licenses.data)) return licenses.data;
    return [];
  };

  const licensesArray = getLicensesArray();

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-center p-12">
          <LoadingSpinner size="large" />
        </div>
      </div>
    );
  }

  if (!artwork) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center bg-red-50 border border-red-200 rounded-lg p-8">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Artwork Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            The artwork with token ID #{tokenId} could not be found.
          </p>
          <Link
            to="/explorer"
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Explorer
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Navigation */}
      <div className="mb-6">
        <Link
          to="/explorer"
          className="inline-flex items-center text-purple-600 hover:text-purple-800 font-medium"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Artwork Explorer
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
        {/* Header Section */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {artwork.title || `Artwork #${artwork.token_id}`}
              </h1>
              <p className="text-gray-600 mt-2">
                Token ID: #{artwork.token_id}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  artwork.is_licensed
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {artwork.is_licensed ? "Licensed" : "Available for Licensing"}
              </span>
              {isOwner && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  Your Artwork
                </span>
              )}
              {artwork.payment_method && (
                <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center ${
                  artwork.payment_method === 'paypal'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {artwork.payment_method === 'paypal' ? <CreditCard className="w-3 h-3 mr-1" /> : <Wallet className="w-3 h-3 mr-1" />}
                  {artwork.payment_method === 'paypal' ? 'PayPal' : 'Crypto'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6">
          {/* Image Section */}
          <div className="lg:sticky lg:top-6 self-start">
            <div className="bg-gray-100 rounded-lg overflow-hidden aspect-square flex items-center justify-center">
              <IPFSImage
                ipfsUri={artwork.metadata_uri}
                tokenId={artwork.token_id}
                alt={artwork.title || `Artwork ${artwork.token_id}`}
                className="w-full h-full object-cover"
                showFallbackInfo={true}
              />
            </div>

            {/* Action Buttons */}
            {isAuthenticated && !isOwner && (
              <div className="mt-6 grid grid-cols-2 gap-3">
                <Link
                  to={`/license/${artwork.token_id}`}
                  className="flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg text-center font-medium transition-colors"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  License
                </Link>
                <Link
                  to={`/sale/${artwork.token_id}`}
                  className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg text-center font-medium transition-colors"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Purchase
                </Link>
              </div>
            )}
          </div>

          {/* Details Section */}
          <div>
            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-6">
              <button
                className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === "details"
                    ? "border-purple-600 text-purple-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab("details")}
              >
                Details
              </button>
              <button
                className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === "licenses"
                    ? "border-purple-600 text-purple-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab("licenses")}
              >
                Licenses ({licensesArray.length})
              </button>
            </div>

            {/* Details Tab */}
            {activeTab === "details" && (
              <div className="space-y-6">
                {/* Description */}
                {artwork.description && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                    <p className="text-gray-600 leading-relaxed">{artwork.description}</p>
                  </div>
                )}

                {/* Price */}
                {artwork.price && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                      Artwork Price
                    </h3>
                    <div className="bg-green-50 rounded-lg p-4">
                      {formatPrice(artwork.price)}
                    </div>
                  </div>
                )}

                {/* Creator Info */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <User className="w-5 h-5 mr-2 text-purple-600" />
                    Creator Information
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">
                        Wallet Address
                      </span>
                      {artwork.creator_address && (
                        <button
                          onClick={() => copyToClipboard(artwork.creator_address)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                          title="Copy address"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <p className="font-mono text-sm break-all text-gray-900">
                      {artwork.creator_address || "N/A"}
                    </p>
                    {artwork.creator_address && (
                      <a
                        href={`https://sepolia.etherscan.io/address/${artwork.creator_address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm text-purple-600 hover:text-purple-800 mt-2"
                      >
                        View on Etherscan{" "}
                        <ExternalLink className="w-4 h-4 ml-1" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Current Owner */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Current Owner
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">
                        Wallet Address
                      </span>
                      {artwork.owner_address && (
                        <button
                          onClick={() => copyToClipboard(artwork.owner_address)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                          title="Copy address"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <p className="font-mono text-sm break-all text-gray-900">
                      {artwork.owner_address || "N/A"}
                    </p>
                    {isOwner && (
                      <p className="text-sm text-blue-600 font-medium mt-2">
                        This is your artwork
                      </p>
                    )}
                    {artwork.owner_address && (
                      <a
                        href={`https://sepolia.etherscan.io/address/${artwork.owner_address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm text-purple-600 hover:text-purple-800 mt-2"
                      >
                        View on Etherscan{" "}
                        <ExternalLink className="w-4 h-4 ml-1" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Royalty Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                    Royalty Information
                  </h3>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-800">
                        Royalty Percentage
                      </span>
                      <span className="text-lg font-bold text-green-900">
                        {artwork.royalty_percentage
                          ? (artwork.royalty_percentage / 100).toFixed(2)
                          : 0}
                        %
                      </span>
                    </div>
                    <p className="text-sm text-green-700 mt-2">
                      The creator receives this percentage from every secondary
                      sale.
                    </p>
                  </div>
                </div>

                {/* Categories */}
                {(artwork.medium_category || artwork.style_category || artwork.subject_category) && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <Palette className="w-5 h-5 mr-2 text-purple-600" />
                      Categories
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex flex-wrap gap-2">
                        {artwork.medium_category && (
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                            🎨 {artwork.medium_category}
                          </span>
                        )}
                        {artwork.style_category && (
                          <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                            🖼 {artwork.style_category}
                          </span>
                        )}
                        {artwork.subject_category && (
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                            🌍 {artwork.subject_category}
                          </span>
                        )}
                      </div>
                      {(artwork.other_medium || artwork.other_style || artwork.other_subject) && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs text-gray-600 mb-2">Additional Details:</p>
                          {artwork.other_medium && (
                            <p className="text-sm text-gray-700">Medium: {artwork.other_medium}</p>
                          )}
                          {artwork.other_style && (
                            <p className="text-sm text-gray-700">Style: {artwork.other_style}</p>
                          )}
                          {artwork.other_subject && (
                            <p className="text-sm text-gray-700">Subject: {artwork.other_subject}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Metadata
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">IPFS URI</span>
                      {artwork.metadata_uri && (
                        <button
                          onClick={() => copyToClipboard(artwork.metadata_uri)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                          title="Copy URI"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <p className="font-mono text-sm break-all mb-4 text-gray-900">
                      {artwork.metadata_uri || "N/A"}
                    </p>
                    {artwork.metadata_uri?.includes("ipfs://") && (
                      <a
                        href={`https://ipfs.io/ipfs/${artwork.metadata_uri.replace("ipfs://", "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm text-purple-600 hover:text-purple-800"
                      >
                        View on IPFS <ExternalLink className="w-4 h-4 ml-1" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <Clock className="w-5 h-5 mr-2 text-blue-600" />
                      Registration Date
                    </h3>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-blue-900">
                        {formatDate(artwork.created_at)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <Clock className="w-5 h-5 mr-2 text-gray-600" />
                      Last Updated
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-900">
                        {formatDate(artwork.updated_at)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Licenses Tab */}
            {activeTab === "licenses" && (
              <div>
                {licensesArray.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">
                      No licenses issued for this artwork yet
                    </p>
                    {!isOwner && isAuthenticated && (
                      <Link
                        to={`/license/${artwork.token_id}`}
                        className="inline-block mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                      >
                        Be the first to license this artwork
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {licensesArray.map((license) => (
                      <div
                        key={license.license_id || license.id || Math.random()}
                        className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-purple-300 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              License #{license.license_id || license.id || "N/A"}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {license.license_type || "Standard"} License
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                license.is_active
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {license.is_active ? "Active" : "Inactive"}
                            </span>
                            {license.payment_method && (
                              <span className={`px-2 py-1 text-xs rounded-full flex items-center ${
                                license.payment_method === 'paypal'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {license.payment_method === 'paypal' ? <CreditCard className="w-3 h-3 mr-1" /> : <Wallet className="w-3 h-3 mr-1" />}
                                {license.payment_method === 'paypal' ? 'PayPal' : 'Crypto'}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                          <div>
                            <span className="text-gray-600">Licensee:</span>
                            <p
                              className="font-mono truncate"
                              title={license.licensee_address || license.buyer_address}
                            >
                              {formatAddress(license.licensee_address || license.buyer_address)}
                            </p>
                          </div>
                          {license.end_date && (
                            <div>
                              <span className="text-gray-600">Valid Until:</span>
                              <p>{formatDate(license.end_date)}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                          <div>
                            <span className="text-sm text-gray-600">Fee Paid:</span>
                            <p className="font-semibold text-gray-900">
                              {formatLicenseFee(license)}
                            </p>
                          </div>
                          {license.transaction_hash && (
                            <a
                              href={`https://sepolia.etherscan.io/tx/${license.transaction_hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-sm text-purple-600 hover:text-purple-800"
                            >
                              View Transaction{" "}
                              <ExternalLink className="w-4 h-4 ml-1" />
                            </a>
                          )}
                        </div>

                        {license.duration_days && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <span className="text-xs text-gray-600">Duration: </span>
                            <span className="text-xs font-medium text-gray-900">
                              {license.duration_days} days
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArtworkDetail;