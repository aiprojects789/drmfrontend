import React, { useState, useEffect } from "react";
import { 
  Shield, 
  XCircle, 
  CheckCircle, 
  FileText, 
  Search, 
  RefreshCw,
  Eye,
  ExternalLink,
  AlertTriangle,
  Info,
  Clock,
  Calendar,
  CreditCard,
  Wallet
} from "lucide-react";
import { useWeb3 } from "../../../context/Web3Context";
import { useAuth } from "../../../context/AuthContext";
import { licensesAPI } from "../../../services/api";
import { UserIdentifier, CurrencyConverter } from "../../../utils/currencyUtils";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import toast from "react-hot-toast";

const Licenses = () => {
  const { account, isCorrectNetwork } = useWeb3();
  const { isAuthenticated, isWalletConnected, user } = useAuth();

  const [licenses, setLicenses] = useState([]);
  const [filteredLicenses, setFilteredLicenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [viewType, setViewType] = useState("licensee");
  const [error, setError] = useState(null);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");

  // Get user identifier for API calls
  const userIdentifier = UserIdentifier.getUserIdentifier(user);

  // Add this function to calculate time remaining
  const calculateTimeRemaining = (endDate) => {
    if (!endDate) return null;
    
    const end = new Date(endDate);
    const now = new Date();
    const diffMs = end - now;
    
    if (diffMs <= 0) return { expired: true, days: 0, hours: 0, totalHours: 0 };
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    return { expired: false, days, hours, totalHours };
  };

  // Fetch licenses data
  const fetchLicenses = async () => {
    if (!isAuthenticated || !userIdentifier) return;
    
    setIsRefreshing(true);
    setError(null);
    
    try {
      console.log(`Fetching licenses for ${userIdentifier} as ${viewType}`);
      
      const response = await licensesAPI.getByUser(userIdentifier, { 
        as_licensee: viewType === "licensee",
        page: 1,
        size: 100
      });
      
      let userLicenses = [];
      
      // Handle different response structures
      if (response && response.licenses && Array.isArray(response.licenses)) {
        userLicenses = response.licenses;
        console.log("Found licenses in response.licenses");
      } else if (response && Array.isArray(response.data)) {
        userLicenses = response.data;
        console.log("Found licenses as direct array");
      } else if (response && response.data && response.data.licenses) {
        userLicenses = response.data.licenses;
        console.log("Found licenses in response.data.licenses");
      } else {
        console.warn("Unexpected licenses response structure:", response);
        userLicenses = [];
      }
      
      // Filter and validate licenses for the new contract structure
      const validLicenses = userLicenses.filter(license => {
        const isValid = license && 
               (license.license_id !== undefined) &&
               license.token_id !== undefined &&
               license.license_type &&
               (license.buyer_address || license.licensee_address) &&
               (license.owner_address || license.licensor_address);
        
        if (!isValid) {
          console.warn("Filtering out invalid license:", license);
        }
        return isValid;
      });

      // Check for expired licenses and update status
      const licensesWithStatus = validLicenses.map(license => {
        const timeRemaining = calculateTimeRemaining(license.end_date);
        const isExpired = timeRemaining && timeRemaining.expired;
        
        // If license is active but expired, mark it as expired
        if (license.is_active && isExpired) {
          return {
            ...license,
            is_active: false,
            status: "EXPIRED"
          };
        }
        
        return license;
      });
      
      console.log(`Setting ${licensesWithStatus.length} valid licenses`);
      setLicenses(licensesWithStatus);
      setFilteredLicenses(licensesWithStatus);
      
    } catch (error) {
      console.error("Error fetching licenses:", error);
      setError("Failed to load licenses. Please try refreshing.");
      toast.error("Failed to load licenses");
      setLicenses([]);
      setFilteredLicenses([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && userIdentifier) {
      fetchLicenses();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated, userIdentifier, viewType]);

  // Filter licenses based on search and filters
  useEffect(() => {
    let result = licenses;
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(license => {
        const artworkTitle = license.artwork?.title || `Token #${license.token_id}`;
        const licensee = license.buyer_address || license.licensee_address || "";
        const licensor = license.owner_address || license.licensor_address || "";
        const tokenId = license.token_id?.toString() || "";
        const licenseId = license.license_id?.toString() || "";
        
        return (
          artworkTitle.toLowerCase().includes(term) ||
          licensee.toLowerCase().includes(term) ||
          licensor.toLowerCase().includes(term) ||
          tokenId.includes(term) ||
          licenseId.includes(term)
        );
      });
    }
    
    // Apply status filter (updated for expiration)
    if (statusFilter !== "all") {
      result = result.filter(license => {
        const timeRemaining = calculateTimeRemaining(license.end_date);
        const isExpired = timeRemaining && timeRemaining.expired;
        const isActuallyActive = license.is_active !== false && !isExpired;
        
        if (statusFilter === "active") {
          return isActuallyActive;
        } else if (statusFilter === "expired") {
          return isExpired;
        } else if (statusFilter === "revoked") {
          return license.is_active === false && !isExpired;
        }
        return true;
      });
    }
    
    // Apply type filter
    if (typeFilter !== "all") {
      result = result.filter(license => license.license_type === typeFilter);
    }

    // Apply payment method filter
    if (paymentMethodFilter !== "all") {
      result = result.filter(license => license.payment_method === paymentMethodFilter);
    }
    
    setFilteredLicenses(result);
  }, [searchTerm, statusFilter, typeFilter, paymentMethodFilter, licenses]);

  // Function to refresh licenses
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchLicenses();
  };

  // Function to revoke license (only for licensor view)
  const handleRevokeLicense = async (licenseId) => {
    if (!isCorrectNetwork && UserIdentifier.isCryptoUser(user)) {
      toast.error("Please switch to Sepolia testnet first");
      return;
    }

    if (viewType !== "licensor") {
      toast.error("Only licensors can revoke licenses");
      return;
    }

    try {
      const revokeToast = toast.loading("Revoking license...");
      
      const response = await licensesAPI.revoke(licenseId);
      
      toast.dismiss(revokeToast);
      
      if (response.success) {
        toast.success("License revoked successfully!");
        // Refresh the licenses list
        setTimeout(() => {
          fetchLicenses();
        }, 1000);
      } else {
        toast.error(response.message || "Failed to revoke license");
      }
    } catch (error) {
      console.error("Error revoking license:", error);
      toast.error("Failed to revoke license");
    }
  };

  // Function to view license details
  const handleViewLicense = (license) => {
    const licenseId = license.license_id;
    console.log("Viewing license details:", license);
    
    // Show detailed license information
    const timeRemaining = calculateTimeRemaining(license.end_date);
    const duration = license.duration_days || 30;
    
    toast.success(
      `License #${licenseId}\n` +
      `Artwork: Token #${license.token_id}\n` +
      `Type: ${license.license_type}\n` +
      `Payment: ${license.payment_method || 'crypto'}\n` +
      `Duration: ${duration} days\n` +
      `Status: ${license.is_active ? 'Active' : 'Inactive'}\n` +
      (timeRemaining && !timeRemaining.expired 
        ? `Expires in: ${timeRemaining.days}d ${timeRemaining.hours}h`
        : 'Expired')
    , { duration: 4000 });
  };

  // Function to get blockchain info
  const handleGetBlockchainInfo = async (licenseId) => {
    try {
      const info = await licensesAPI.getLicenseInfo(licenseId);
      if (info.success) {
        console.log("Blockchain license info:", info.license);
        toast.success("Check console for blockchain data");
      } else {
        toast.error("Failed to get blockchain info");
      }
    } catch (error) {
      console.error("Error getting blockchain info:", error);
      toast.error("Failed to get blockchain info");
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  };

  // Format address for display
  const formatAddress = (address) => {
    if (!address) return 'Unknown';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Format amount with currency
  const formatAmount = (license) => {
    const amount = license.total_amount_eth || license.fee_paid;
    if (!amount) return 'N/A';
    
    if (license.payment_method === 'paypal') {
      const usdAmount = CurrencyConverter.ethToUsd(amount);
      return CurrencyConverter.formatUsd(usdAmount);
    }
    return CurrencyConverter.formatEth(amount);
  };

  // Get license type display info
  const getLicenseTypeDisplay = (type) => {
    const typeInfo = {
      "LINK_ONLY": { label: "Link Only", color: "bg-blue-100 text-blue-800" },
      "ACCESS_WITH_WM": { label: "With Watermark", color: "bg-purple-100 text-purple-800" },
      "FULL_ACCESS": { label: "Full Access", color: "bg-green-100 text-green-800" }
    };
    return typeInfo[type] || { label: type, color: "bg-gray-100 text-gray-800" };
  };

  // Get status display info
  const getStatusDisplay = (license) => {
    const timeRemaining = calculateTimeRemaining(license.end_date);
    const isExpired = timeRemaining && timeRemaining.expired;
    
    if (license.is_active === false && !isExpired) {
      return { label: "Revoked", color: "bg-red-100 text-red-800", icon: XCircle };
    } else if (isExpired) {
      return { label: "Expired", color: "bg-orange-100 text-orange-800", icon: Clock };
    } else if (license.is_active) {
      return { label: "Active", color: "bg-green-100 text-green-800", icon: CheckCircle };
    } else {
      return { label: "Inactive", color: "bg-gray-100 text-gray-800", icon: FileText };
    }
  };

  // Get payment method display
  const getPaymentMethodDisplay = (method) => {
    const methodInfo = {
      "crypto": { label: "Crypto", icon: Wallet, color: "bg-blue-100 text-blue-800" },
      "paypal": { label: "PayPal", icon: CreditCard, color: "bg-yellow-100 text-yellow-800" }
    };
    return methodInfo[method] || { label: method, icon: FileText, color: "bg-gray-100 text-gray-800" };
  };

  if (isAuthenticated && UserIdentifier.isCryptoUser(user) && !isWalletConnected) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center bg-yellow-50 border border-yellow-200 rounded-lg p-8">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Wallet Connection Required
          </h2>
          <p className="text-gray-600 mb-6">
            Please connect your wallet to manage your licenses.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="medium" text="Loading licenses..." />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">License Management</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your artwork licenses and usage rights
            </p>
            <p className="mt-1 text-xs text-gray-400">
              User: {userIdentifier} ({UserIdentifier.isPayPalUser(user) ? 'PayPal' : 'Crypto'})
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              title="Refresh Licenses"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 mr-3" />
            <div>
              <p className="text-red-800">{error}</p>
              <button 
                onClick={handleRefresh}
                className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Toggle */}
      <div className="mb-6">
        <div className="flex border-b border-gray-200">
          <button
            className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors ${
              viewType === "licensee"
                ? "border-purple-600 text-purple-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setViewType("licensee")}
          >
            Licenses I Hold ({viewType === "licensee" ? filteredLicenses.length : "..."})
          </button>
          <button
            className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors ${
              viewType === "licensor"
                ? "border-purple-600 text-purple-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setViewType("licensor")}
          >
            Licenses I Granted ({viewType === "licensor" ? filteredLicenses.length : "..."})
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by artwork, token ID, or address..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>
          
          <div>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="LINK_ONLY">Link Only</option>
              <option value="ACCESS_WITH_WM">With Watermark</option>
              <option value="FULL_ACCESS">Full Access</option>
            </select>
          </div>

          <div>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
            >
              <option value="all">All Payments</option>
              <option value="crypto">Crypto</option>
              <option value="paypal">PayPal</option>
            </select>
          </div>
        </div>
      </div>

      {/* Licenses Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {filteredLicenses.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">
              {licenses.length === 0 
                ? `No licenses found as ${viewType}` 
                : "No licenses match your filters"}
            </p>
            <p className="text-gray-400 text-sm">
              {licenses.length === 0 
                ? (viewType === "licensee" 
                   ? "You haven't purchased any licenses yet" 
                   : "You haven't received any license purchases yet")
                : "Try adjusting your search or filters"}
            </p>
            {licenses.length === 0 && (
              <div className="mt-4">
                <a
                  href="/explorer"
                  className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
                >
                  Browse Artworks
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    License ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Artwork
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {viewType === "licensee" ? "Owner" : "Buyer"}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Purchased
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLicenses.map((license) => {
                  const licenseId = license.license_id;
                  const tokenId = license.token_id;
                  const licenseeAddress = license.buyer_address || license.licensee_address;
                  const licensorAddress = license.owner_address || license.licensor_address;
                  const artworkTitle = license.artwork?.title || `Token #${tokenId}`;
                  const typeDisplay = getLicenseTypeDisplay(license.license_type);
                  const statusDisplay = getStatusDisplay(license);
                  const paymentDisplay = getPaymentMethodDisplay(license.payment_method || 'crypto');
                  const timeRemaining = calculateTimeRemaining(license.end_date);
                  const duration = license.duration_days || 30;
                  
                  return (
                    <tr key={licenseId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-mono text-gray-900">
                          #{licenseId}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <span className="text-purple-800 font-medium text-xs">
                              #{tokenId}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {artworkTitle}
                            </div>
                            <div className="text-sm text-gray-500">
                              Token #{tokenId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-mono">
                          {formatAddress(viewType === "licensee" ? licensorAddress : licenseeAddress)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${typeDisplay.color}`}>
                          {typeDisplay.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full flex items-center space-x-1 ${paymentDisplay.color}`}>
                          <paymentDisplay.icon className="w-3 h-3" />
                          <span>{paymentDisplay.label}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {license.purchase_time ? formatDate(license.purchase_time) : 
                         license.created_at ? formatDate(license.created_at) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex flex-col">
                          <span className="font-medium">{duration} days</span>
                          {timeRemaining && (
                            timeRemaining.expired ? (
                              <span className="text-red-600 text-xs">Expired</span>
                            ) : timeRemaining.days < 7 ? (
                              <span className="text-orange-600 text-xs">
                                {timeRemaining.days}d {timeRemaining.hours}h left
                              </span>
                            ) : (
                              <span className="text-gray-500 text-xs">
                                {timeRemaining.days} days left
                              </span>
                            )
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatAmount(license)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${statusDisplay.color} flex items-center space-x-1`}>
                          <statusDisplay.icon className="w-3 h-3" />
                          <span>{statusDisplay.label}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {/* View Details */}
                          <button
                            onClick={() => handleViewLicense(license)}
                            className="text-blue-600 hover:text-blue-900"
                            title="View License Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          {/* Get Blockchain Info (only for crypto licenses) */}
                          {(license.payment_method === 'crypto' || !license.payment_method) && (
                            <button
                              onClick={() => handleGetBlockchainInfo(licenseId)}
                              className="text-green-600 hover:text-green-900"
                              title="Get Blockchain Info"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          )}
                          
                          {/* Revoke License (only for licensor view and active licenses) */}
                          {viewType === "licensor" && statusDisplay.label === "Active" && (
                            <button
                              onClick={() => handleRevokeLicense(licenseId)}
                              disabled={!isCorrectNetwork && UserIdentifier.isCryptoUser(user)}
                              className={`${
                                (!isCorrectNetwork && UserIdentifier.isCryptoUser(user))
                                  ? "text-gray-400 cursor-not-allowed"
                                  : "text-red-600 hover:text-red-900"
                              }`}
                              title={(!isCorrectNetwork && UserIdentifier.isCryptoUser(user)) ? "Switch to Sepolia testnet" : "Revoke License"}
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                          
                          {/* Status Icons */}
                          {statusDisplay.label === "Active" && (
                            <span className="text-green-600" title="License is active">
                              <CheckCircle className="w-4 h-4" />
                            </span>
                          )}
                          {statusDisplay.label === "Expired" && (
                            <span className="text-orange-600" title="License has expired">
                              <Clock className="w-4 h-4" />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Panel */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start">
          <Info className="w-6 h-6 text-blue-600 mt-0.5 mr-3" />
          <div>
            <h4 className="text-lg font-semibold text-blue-900 mb-2">License System</h4>
            <p className="text-blue-800 mb-2">
              License system with flexible payment options and 30-day duration.
            </p>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <strong>Crypto Payments:</strong> Direct blockchain transactions with MetaMask</li>
              <li>• <strong>PayPal Payments:</strong> Traditional payment processing</li>
              <li>• <strong>Link Only:</strong> Basic access to artwork link</li>
              <li>• <strong>Access with Watermark:</strong> Full access with watermark protection</li>
              <li>• <strong>Full Access:</strong> Complete access without restrictions</li>
              <li>• All licenses are valid for 30 days from purchase</li>
              <li>• Licenses expire automatically after duration period</li>
              <li>• Artwork owners can manually revoke licenses anytime</li>
              <li>• Crypto license data is stored permanently on the blockchain</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Licenses;