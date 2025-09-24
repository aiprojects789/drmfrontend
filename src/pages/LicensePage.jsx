import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";
import { useAuth } from "../context/AuthContext";
import { Shield, ArrowLeft, AlertTriangle, Info, Calendar, Percent } from "lucide-react";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { Button } from "@mui/material";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { artworksAPI, licensesAPI } from "../services/api";
import toast from "react-hot-toast";
import IPFSImage from "../components/common/IPFSImage";

const schema = yup.object({
  license_type: yup
    .string()
    .required("License type is required")
    .oneOf(["LINK_ONLY", "ACCESS_WITH_WM", "FULL_ACCESS"], "Invalid license type"),
});

const LicensePage = () => {
  const { tokenId } = useParams();
  const navigate = useNavigate();
  const { account, isCorrectNetwork, web3, sendTransaction } = useWeb3();
  const { isAuthenticated } = useAuth();
  
  const [artwork, setArtwork] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState(null);
  const [transactionHash, setTransactionHash] = useState(null);
  const [priceInfo, setPriceInfo] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [licenseConfig, setLicenseConfig] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      license_type: "LINK_ONLY",
    },
  });

  const selectedLicenseType = watch("license_type");

  // Fetch artwork data and license prices
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch artwork
        const artworkResponse = await artworksAPI.getByTokenId(parseInt(tokenId));
        console.log('Artwork API response:', artworkResponse);
        
        if (artworkResponse.data) {
          setArtwork(artworkResponse.data);
          
          // Check if current user is the owner
          if (account && artworkResponse.data.owner_address) {
            setIsOwner(account.toLowerCase() === artworkResponse.data.owner_address.toLowerCase());
          }

          // Fetch license prices based on artwork price
          if (artworkResponse.data.price > 0) {
            try {
              const pricesResponse = await licensesAPI.getPricesForArtwork(parseInt(tokenId));
              if (pricesResponse.success) {
                setPriceInfo(pricesResponse);
                setLicenseConfig({
                  durationDays: pricesResponse.duration_days,
                  platformFeePercentage: pricesResponse.platform_fee_percentage,
                  configName: pricesResponse.config_name
                });
              }
            } catch (priceError) {
              console.warn("Failed to fetch dynamic prices, using defaults:", priceError);
              // Fallback to default calculation
              setPriceInfo({
                prices: {
                  "LINK_ONLY": { 
                    license_fee_eth: artworkResponse.data.price * 0.2,
                    platform_fee_eth: artworkResponse.data.price * 0.2 * 0.05,
                    total_amount_eth: artworkResponse.data.price * 0.2,
                    license_percentage: 20,
                    duration_days: 30
                  },
                  "ACCESS_WITH_WM": { 
                    license_fee_eth: artworkResponse.data.price * 0.7,
                    platform_fee_eth: artworkResponse.data.price * 0.7 * 0.05,
                    total_amount_eth: artworkResponse.data.price * 0.7,
                    license_percentage: 70,
                    duration_days: 30
                  },
                  "FULL_ACCESS": { 
                    license_fee_eth: artworkResponse.data.price * 0.9,
                    platform_fee_eth: artworkResponse.data.price * 0.9 * 0.05,
                    total_amount_eth: artworkResponse.data.price * 0.9,
                    license_percentage: 90,
                    duration_days: 30
                  }
                },
                duration_days: 30,
                platform_fee_percentage: 5,
                config_name: "Fallback"
              });
            }
          }
        } else {
          setError("Artwork not found");
          return;
        }

      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load artwork or pricing information");
      } finally {
        setLoading(false);
      }
    };

    if (tokenId) {
      fetchData();
    }
  }, [tokenId, account]);

  const handlePurchaseLicense = async (data) => {
    if (!isAuthenticated || !account) {
      setError('Please connect your wallet');
      return;
    }

    if (!isCorrectNetwork) {
      setError('Please switch to Sepolia testnet');
      return;
    }

    if (isOwner) {
      setError('You cannot purchase a license for your own artwork');
      return;
    }

    setPurchasing(true);
    setError(null);
    setTransactionHash(null);

    try {
      // Step 1: Prepare license purchase
      const prepToast = toast.loading("Preparing license purchase...");

      const licenseResponse = await licensesAPI.purchaseSimple({
        token_id: parseInt(tokenId),
        license_type: data.license_type,
      });

      toast.dismiss(prepToast);

      if (!licenseResponse.success) {
        throw new Error(licenseResponse.detail || "Failed to prepare license purchase");
      }

      console.log("License response:", licenseResponse);

      // Step 2: Send blockchain transaction
      const txToast = toast.loading("Sending transaction to blockchain...");

      const txData = licenseResponse.transaction_data;
      const txParams = {
        to: txData.to,
        data: txData.data,
        from: account,
        value: txData.value,
        gas: txData.gas,
      };

      // Add gas pricing based on transaction type
      if (txData.maxFeePerGas) {
        txParams.maxFeePerGas = txData.maxFeePerGas;
        txParams.maxPriorityFeePerGas = txData.maxPriorityFeePerGas;
      } else if (txData.gasPrice) {
        txParams.gasPrice = txData.gasPrice;
      }

      console.log("Sending transaction:", txParams);

      const txResponse = await sendTransaction(txParams);

      toast.dismiss(txToast);

      if (!txResponse || !txResponse.hash) {
        throw new Error("No transaction hash received");
      }

      setTransactionHash(txResponse.hash);
      toast.success("License purchased successfully! Transaction submitted to blockchain.");

      // Navigate to licenses page after a delay
      setTimeout(() => {
        navigate("/licenses");
      }, 3000);

    } catch (err) {
      console.error('License purchase failed:', err);
      toast.dismiss();
      
      if (err.code === 4001) {
        setError("Transaction cancelled by user");
      } else if (err.message?.includes("insufficient funds")) {
        setError("Insufficient funds. Please add ETH to your wallet.");
      } else if (err.message?.includes("out of gas")) {
        setError("Transaction requires more gas. Please try again.");
      } else if (err.message?.includes("rejected")) {
        setError("Transaction rejected by user.");
      } else if (err.message) {
        const errorMsg = err.message.length > 100 ? err.message.substring(0, 100) + "..." : err.message;
        setError(`License purchase failed: ${errorMsg}`);
      } else {
        setError("License purchase failed. Please try again.");
      }
    } finally {
      setPurchasing(false);
    }
  };

  const formatAddress = (address) => {
    if (!address) return 'Unknown';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const getLicenseTypeInfo = (type) => {
    const info = {
      "LINK_ONLY": {
        name: "Link Only",
        description: "Basic access to artwork link",
        features: [
          "View artwork through link only",
          "Basic reference rights",
          "Non-commercial use",
          "Link sharing allowed"
        ]
      },
      "ACCESS_WITH_WM": {
        name: "Access with Watermark", 
        description: "Full access but with watermark protection",
        features: [
          "Full artwork access",
          "Watermarked version",
          "Commercial use allowed",
          "Attribution required",
          "Download permissions"
        ]
      },
      "FULL_ACCESS": {
        name: "Full Access",
        description: "Complete access without restrictions",
        features: [
          "Full resolution access",
          "No watermarks",
          "Commercial use rights",
          "Modification rights",
          "Unrestricted usage"
        ]
      }
    };
    return info[type] || info["LINK_ONLY"];
  };
    // Calculate expiration date
  const calculateExpirationDate = () => {
    if (!licenseConfig) return null;
    const today = new Date();
    const expiration = new Date();
    expiration.setDate(today.getDate() + licenseConfig.durationDays);
    return expiration.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-center">
          <LoadingSpinner size="large" />
        </div>
      </div>
    );
  }

  if (error && !artwork) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center bg-red-50 border border-red-200 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Artwork Not Found</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link
            to="/explorer"
            className="px-4 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900"
          >
            Back to Explorer
          </Link>
        </div>
      </div>
    );
  }

  const expirationDate = calculateExpirationDate();
  const selectedPriceInfo = priceInfo?.prices?.[selectedLicenseType];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="text-center flex-1">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-800 p-3 rounded-full">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Purchase License</h1>
          <p className="text-lg text-gray-600">Artwork #{tokenId}</p>
        </div>
        <Link
          to={`/explorer`}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <ArrowLeft className="w-5 h-5 mr-1 inline" />
          Back to Explorer
        </Link>
      </div>

      {/* Owner Warning */}
      {isOwner && (
        <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start">
            <Info className="w-6 h-6 text-yellow-600 mt-0.5 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                You Own This Artwork
              </h3>
              <p className="text-yellow-700">
                You cannot purchase a license for your own artwork. You already have full rights to use it.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {transactionHash && (
        <div className="mb-8 bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-green-800 mb-2">
              Transaction Submitted!
            </h3>
            <p className="text-green-600 mb-4">
              Your license purchase has been submitted to the blockchain.
            </p>
            <div className="bg-white p-3 rounded border">
              <p className="text-sm text-gray-600 mb-1">Transaction Hash:</p>
              <p className="text-sm font-mono text-gray-800 break-all">
                {transactionHash}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Artwork Details */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {artwork && artwork.image_url ? (
            <div className="bg-gray-100 h-64 sm:h-80 flex items-center justify-center overflow-hidden">
              <IPFSImage 
                src={artwork.image_url} 
                alt={artwork.title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="bg-gray-100 h-64 sm:h-80 flex items-center justify-center">
              <div className="text-center">
                <Shield className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Artwork #{tokenId}</p>
              </div>
            </div>
          )}
          
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {artwork?.title || `Artwork #${tokenId}`}
            </h2>
            
            {artwork?.description && (
              <p className="text-gray-600 mb-4">{artwork.description}</p>
            )}

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Creator</span>
                <span className="text-sm font-mono text-gray-900">
                  {formatAddress(artwork?.creator_address)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Current Owner</span>
                <span className="text-sm font-mono text-gray-900">
                  {formatAddress(artwork?.owner_address)}
                  {isOwner && <span className="ml-2 text-blue-600 text-xs">(You)</span>}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Artwork Price</span>
                <span className="text-sm font-semibold text-gray-900">
                  {artwork?.price ? `${artwork.price} ETH` : 'Not set'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Royalty</span>
                <span className="text-sm font-semibold text-gray-900">
                  {(artwork?.royalty_percentage / 100).toFixed(2)}%
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Token ID</span>
                <span className="text-sm font-semibold text-gray-900">
                  #{artwork?.token_id}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* License Purchase Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">License Options</h3>
          
          {!isAuthenticated ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Wallet Required</h4>
              <p className="text-gray-600">Please connect your wallet to purchase a license.</p>
            </div>
          ) : !isCorrectNetwork ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Wrong Network</h4>
              <p className="text-gray-600">Please switch to Sepolia testnet to purchase licenses.</p>
            </div>
          ) : isOwner ? (
            <div className="text-center py-8">
              <Info className="w-12 h-12 text-blue-500 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">You Own This Artwork</h4>
              <p className="text-gray-600">As the owner, you have full rights to this artwork without needing a license.</p>
            </div>
          ) : artwork?.price <= 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Price Not Set</h4>
              <p className="text-gray-600">This artwork does not have a price set. Cannot purchase license.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(handlePurchaseLicense)}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  License Type
                </label>
                <select
                  {...register("license_type")}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-800 focus:border-blue-800 ${
                    errors.license_type ? "border-red-300" : "border-gray-300"
                  }`}
                >
                  <option value="LINK_ONLY">
                    Link Only ({selectedLicenseType === "LINK_ONLY" && priceInfo?.prices?.LINK_ONLY ? 
                      `${priceInfo.prices.LINK_ONLY.license_percentage}% of artwork price` : 
                      "20% of artwork price"})
                  </option>
                  <option value="ACCESS_WITH_WM">
                    Access with Watermark ({selectedLicenseType === "ACCESS_WITH_WM" && priceInfo?.prices?.ACCESS_WITH_WM ? 
                      `${priceInfo.prices.ACCESS_WITH_WM.license_percentage}% of artwork price` : 
                      "70% of artwork price"})
                  </option>
                  <option value="FULL_ACCESS">
                    Full Access ({selectedLicenseType === "FULL_ACCESS" && priceInfo?.prices?.FULL_ACCESS ? 
                      `${priceInfo.prices.FULL_ACCESS.license_percentage}% of artwork price` : 
                      "90% of artwork price"})
                  </option>
                </select>
                {errors.license_type && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.license_type.message}
                  </p>
                )}
              </div>

              {/* License Type Description */}
              {selectedLicenseType && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">
                    {getLicenseTypeInfo(selectedLicenseType).name}
                  </h4>
                  <p className="text-blue-700 text-sm mb-3">
                    {getLicenseTypeInfo(selectedLicenseType).description}
                  </p>
                  <ul className="text-blue-600 text-sm space-y-1">
                    {getLicenseTypeInfo(selectedLicenseType).features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Duration Information */}
              {licenseConfig && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center text-green-800">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span className="font-medium">License Duration: {licenseConfig.durationDays} days</span>
                  </div>
                  {expirationDate && (
                    <p className="text-green-700 text-sm mt-1">
                      Expires on: {expirationDate}
                    </p>
                  )}
                </div>
              )}

              {/* Fee Breakdown */}
              {selectedPriceInfo && (
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Fee Breakdown</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Artwork Price:</span>
                      <span className="font-mono font-medium">{artwork?.price} ETH</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">License Percentage:</span>
                      <span className="font-mono text-blue-600">
                        {selectedPriceInfo.license_percentage}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">License Fee:</span>
                      <span className="font-mono font-medium">{selectedPriceInfo.license_fee_eth.toFixed(6)} ETH</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Platform Fee:</span>
                      <span className="font-mono text-orange-600">
                        {selectedPriceInfo.platform_fee_eth.toFixed(6)} ETH
                      </span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between font-medium">
                        <span className="text-gray-900">You Pay:</span>
                        <span className="font-mono text-green-600">
                          {selectedPriceInfo.total_amount_eth.toFixed(6)} ETH
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Owner Receives:</span>
                        <span>{selectedPriceInfo.actual_amount_eth.toFixed(6)} ETH</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={purchasing || !selectedPriceInfo}
                variant="contained"
                color="primary"
                fullWidth
                size="large"
                className="py-3"
              >
                {purchasing ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    <span>Processing Purchase...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <Shield className="w-5 h-5 mr-2" />
                    {selectedPriceInfo ? (
                      <>Purchase License ({selectedPriceInfo.total_amount_eth.toFixed(6)} ETH)</>
                    ) : (
                      <>Calculate Price...</>
                    )}
                  </div>
                )}
              </Button>

              <div className="mt-4 text-xs text-gray-500 text-center">
                <p>By purchasing a license, you agree to the platform's terms and conditions.</p>
                <p className="mt-1">License valid for {licenseConfig?.durationDays || 30} days from purchase.</p>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Configuration Information */}
      {licenseConfig && (
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start">
            <Info className="w-6 h-6 text-blue-800 mt-0.5 mr-3" />
            <div>
              <h4 className="text-lg font-semibold text-blue-900 mb-2">
                License Configuration: {licenseConfig.configName}
              </h4>
              <p className="text-blue-800 mb-3">
                License fees are calculated as a percentage of the artwork price. 
                Platform fee:  • Duration: {licenseConfig.durationDays} days
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-white p-3 rounded-lg border border-blue-200">
                  <h5 className="font-medium text-blue-900 mb-1 flex items-center">
                    <Percent className="w-4 h-4 mr-1" /> Link Only
                  </h5>
                  <p className="text-blue-700">{priceInfo?.prices?.LINK_ONLY?.license_percentage || 20}% of price</p>
                  <p className="text-blue-600 font-mono mt-1">
                    {priceInfo?.prices?.LINK_ONLY?.total_amount_eth?.toFixed(6) || '0.000000'} ETH
                  </p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-blue-200">
                  <h5 className="font-medium text-blue-900 mb-1 flex items-center">
                    <Percent className="w-4 h-4 mr-1" /> Watermark Access
                  </h5>
                  <p className="text-blue-700">{priceInfo?.prices?.ACCESS_WITH_WM?.license_percentage || 70}% of price</p>
                  <p className="text-blue-600 font-mono mt-1">
                    {priceInfo?.prices?.ACCESS_WITH_WM?.total_amount_eth?.toFixed(6) || '0.000000'} ETH
                  </p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-blue-200">
                  <h5 className="font-medium text-blue-900 mb-1 flex items-center">
                    <Percent className="w-4 h-4 mr-1" /> Full Access
                  </h5>
                  <p className="text-blue-700">{priceInfo?.prices?.FULL_ACCESS?.license_percentage || 90}% of price</p>
                  <p className="text-blue-600 font-mono mt-1">
                    {priceInfo?.prices?.FULL_ACCESS?.total_amount_eth?.toFixed(6) || '0.000000'} ETH
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LicensePage;