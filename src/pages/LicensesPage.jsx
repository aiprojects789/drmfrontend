import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";
import { useAuth } from "../context/AuthContext";
import { Shield, ExternalLink, Calendar, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { licensesAPI } from "../services/api";
import toast from "react-hot-toast";

const LicensesPage = () => {
  const { account } = useWeb3();
  const { isAuthenticated } = useAuth();
  
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("purchased");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isAuthenticated && account) {
      fetchLicenses();
    }
  }, [isAuthenticated, account, activeTab]);

  const fetchLicenses = async () => {
    setLoading(true);
    setError(null);
    try {
      const asLicensee = activeTab === "purchased";
      const response = await licensesAPI.getByUser(account, { as_licensee: asLicensee });
      
      if (response.licenses) {
        setLicenses(response.licenses);
      } else if (response.data) {
        setLicenses(response.data);
      } else {
        setLicenses([]);
      }
    } catch (err) {
      console.error("Failed to fetch licenses:", err);
      setError("Failed to load licenses");
      setLicenses([]);
    } finally {
      setLoading(false);
    }
  };

  const getLicenseTypeInfo = (type) => {
    const info = {
      "LINK_ONLY": {
        name: "Link Only",
        color: "blue",
        bgColor: "bg-blue-50",
        textColor: "text-blue-800",
        borderColor: "border-blue-200",
        badgeBg: "bg-blue-100",
        description: "Basic access to artwork link"
      },
      "ACCESS_WITH_WM": {
        name: "Access with Watermark",
        color: "purple",
        bgColor: "bg-purple-50",
        textColor: "text-purple-800",
        borderColor: "border-purple-200",
        badgeBg: "bg-purple-100",
        description: "Full access with watermark protection"
      },
      "FULL_ACCESS": {
        name: "Full Access",
        color: "green",
        bgColor: "bg-green-50",
        textColor: "text-green-800",
        borderColor: "border-green-200",
        badgeBg: "bg-green-100",
        description: "Complete access without restrictions"
      }
    };
    return info[type] || info["LINK_ONLY"];
  };

  const formatAddress = (address) => {
    if (!address) return 'Unknown';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch {
      return 'Invalid date';
    }
  };

  const calculateDaysRemaining = (endDate) => {
    if (!endDate) return null;
    try {
      const end = new Date(endDate);
      const now = new Date();
      const diffTime = end - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0;
    } catch {
      return null;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center bg-yellow-50 border border-yellow-200 rounded-lg p-8">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Wallet Required</h2>
          <p className="text-gray-600 mb-4">Please connect your wallet to view your licenses.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="bg-blue-800 p-3 rounded-full">
            <Shield className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Licenses</h1>
        <p className="text-lg text-gray-600">Manage your artwork licenses</p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center mb-8">
        <div className="bg-gray-100 rounded-lg p-1 inline-flex">
          <button
            onClick={() => setActiveTab("purchased")}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${
              activeTab === "purchased"
                ? "bg-white text-blue-800 shadow"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Licenses Purchased
          </button>
          <button
            onClick={() => setActiveTab("sold")}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${
              activeTab === "sold"
                ? "bg-white text-blue-800 shadow"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Licenses Sold
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="large" />
        </div>
      ) : error ? (
        <div className="text-center bg-red-50 border border-red-200 rounded-lg p-8">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Licenses</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchLicenses}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      ) : licenses.length === 0 ? (
        <div className="text-center bg-gray-50 border border-gray-200 rounded-lg p-8">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Licenses {activeTab === "purchased" ? "Purchased" : "Sold"} Yet
          </h3>
          <p className="text-gray-600 mb-4">
            {activeTab === "purchased"
              ? "You haven't purchased any licenses yet. Explore artworks to get started."
              : "You haven't sold any licenses yet. Set prices for your artworks to start licensing."}
          </p>
          {activeTab === "purchased" && (
            <Link
              to="/explorer"
              className="inline-block px-6 py-3 bg-blue-800 text-white rounded-lg hover:bg-blue-900"
            >
              Explore Artworks
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {licenses.map((license) => {
            const licenseInfo = getLicenseTypeInfo(license.license_type);
            const daysRemaining = calculateDaysRemaining(license.end_date);
            const isExpired = daysRemaining !== null && daysRemaining === 0;
            
            return (
              <div
                key={license.license_id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* License Header */}
                <div className={`${licenseInfo.bgColor} p-4 border-b ${licenseInfo.borderColor}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-3 py-1 ${licenseInfo.badgeBg} ${licenseInfo.textColor} text-sm font-medium rounded-full`}>
                      {licenseInfo.name}
                    </span>
                    {license.is_active && !isExpired ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{licenseInfo.description}</p>
                </div>

                {/* License Details */}
                <div className="p-4">
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Artwork Token ID</div>
                      <Link
                        to={`/artwork/${license.token_id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium flex items-center"
                      >
                        #{license.token_id}
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Link>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 mb-1">License ID</div>
                      <div className="font-mono text-sm text-gray-900">#{license.license_id}</div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 mb-1">
                        {activeTab === "purchased" ? "Owner" : "Buyer"}
                      </div>
                      <div className="font-mono text-sm text-gray-900">
                        {formatAddress(
                          activeTab === "purchased"
                            ? license.licensor_address || license.owner_address
                            : license.licensee_address || license.buyer_address
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 mb-1">Amount Paid</div>
                      <div className="font-semibold text-gray-900">
                        {license.total_amount_eth || license.fee_paid || "0"} ETH
                      </div>
                    </div>

                    {license.purchase_time && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1 flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          Purchase Date
                        </div>
                        <div className="text-sm text-gray-900">
                          {formatDate(license.purchase_time)}
                        </div>
                      </div>
                    )}

                    {license.duration_days && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Duration</div>
                        <div className="text-sm text-gray-900">{license.duration_days} days</div>
                      </div>
                    )}

                    {daysRemaining !== null && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Status</div>
                        <div className={`text-sm font-medium ${isExpired ? 'text-red-600' : 'text-green-600'}`}>
                          {isExpired ? 'Expired' : `${daysRemaining} days remaining`}
                        </div>
                      </div>
                    )}

                    <div className="pt-3 border-t">
                      <div className={`text-sm font-medium ${license.is_active && !isExpired ? 'text-green-600' : 'text-red-600'}`}>
                        {license.is_active && !isExpired ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="p-4 bg-gray-50 border-t">
                  <Link
                    to={`/artwork/${license.token_id}`}
                    className="block w-full text-center px-4 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors"
                  >
                    View Artwork
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LicensesPage;