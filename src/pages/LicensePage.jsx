import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";
import { useAuth } from "../context/AuthContext";
import { Shield, Clock, ArrowLeft, AlertTriangle } from "lucide-react";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { Button } from "@mui/material";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { artworksAPI, licensesAPI } from "../services/api";
import toast from "react-hot-toast";
import IPFSImage from "../components/common/IPFSImage";

const schema = yup.object({
  duration_days: yup
    .number()
    .required("Duration is required")
    .min(1, "Minimum 1 day")
    .max(365, "Maximum 1 year"),
  license_type: yup
    .string()
    .required("License type is required")
    .oneOf(["PERSONAL", "COMMERCIAL", "EXCLUSIVE"], "Invalid license type"),
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
  const [licensePreview, setLicensePreview] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      duration_days: 30,
      license_type: "PERSONAL",
    },
  });

  // Fetch artwork data
  useEffect(() => {
  const fetchArtwork = async () => {
    setLoading(true);
    try {
      // FIX: getByTokenId returns axios response, artwork data is in response.data
      const response = await artworksAPI.getByTokenId(parseInt(tokenId));
      console.log('🎨 Artwork API response:', response); // Debug log
      
      if (response.data) {
        setArtwork(response.data);
        console.log('✅ Artwork loaded:', response.data); // Debug log
      } else {
        console.warn('⚠️ No artwork data in response:', response);
        setError("Artwork not found");
      }
    } catch (error) {
      console.error("❌ Error fetching artwork:", error);
      setError("Failed to load artwork");
    } finally {
      setLoading(false);
    }
  };

  if (tokenId) {
    fetchArtwork();
  }
}, [tokenId]);

  const handlePurchaseLicense = async (data) => {
    if (!isAuthenticated || !account) {
      setError('Please connect your wallet');
      return;
    }

    if (!isCorrectNetwork) {
      setError('Please switch to Sepolia testnet');
      return;
    }

    setPurchasing(true);
    setError(null);
    setLicensePreview(null);
    setTransactionHash(null);

    try {
      // Fixed license fee of 0.1 ETH as per the smart contract
      const licenseFeeWei = web3.utils.toWei("0.1", "ether");

      // Step 1: Prepare license with automatic document generation
      const prepToast = toast.loading(
        "Generating license document and preparing transaction..."
      );

      const licenseResponse = await licensesAPI.grantWithDocument({
        token_id: parseInt(tokenId),
        licensee_address: account, // Licensee is the current user
        duration_days: parseInt(data.duration_days),
        license_type: data.license_type,
      });

      toast.dismiss(prepToast);

      if (!licenseResponse.success) {
        throw new Error(licenseResponse.detail || "Failed to prepare license");
      }

      // Show license preview if available
      if (licenseResponse.license_document_preview) {
        setLicensePreview(licenseResponse.license_document_preview);
      }

      // Step 2: Send blockchain transaction
      let txResponse;
      try {
        const txToast = toast.loading("Sending transaction to blockchain...");

        txResponse = await sendTransaction({
          to: licenseResponse.transaction_data.to,
          data: licenseResponse.transaction_data.data,
          from: account,
          value: licenseFeeWei,
        });

        toast.dismiss(txToast);

        if (!txResponse || !txResponse.hash) {
          throw new Error("No transaction hash received");
        }
      } catch (txError) {
        console.error("Transaction sending failed:", txError);
        throw new Error(`Transaction failed: ${txError.message}`);
      }

      setTransactionHash(txResponse.hash);
      toast.success("License purchased successfully! Transaction submitted to blockchain.");

      // Navigate to licenses page after a delay
      setTimeout(() => {
        navigate("/licenses");
      }, 3000);

    } catch (err) {
      console.error('License purchase failed:', err);
      
      // Specific error handling
      if (err.code === 4001) {
        setError("Transaction cancelled by user");
      } else if (err.message?.includes("insufficient funds")) {
        setError("Insufficient funds. Please add ETH to your wallet.");
      } else if (err.message?.includes("out of gas")) {
        setError("Transaction requires more gas. Please try again.");
      } else if (err.message?.includes("rejected")) {
        setError("Transaction rejected by user.");
      } else if (err.message) {
        setError(`License purchase failed: ${err.message}`);
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

      {/* Success Message */}
      {transactionHash && (
        <div className="mb-8 bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-green-800 mb-2">
              ✅ Transaction Submitted!
            </h3>
            <p className="text-green-600 mb-4">
              Your license purchase has been submitted to the blockchain.
            </p>
            {transactionHash && (
              <div className="bg-white p-3 rounded border">
                <p className="text-sm text-gray-600 mb-1">Transaction Hash:</p>
                <p className="text-sm font-mono text-gray-800 break-all">
                  {transactionHash}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* License Preview */}
      {licensePreview && (
        <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-4">
            📄 Generated License Document Preview
          </h3>
          <div className="bg-white p-4 rounded-lg border text-sm">
            <h4 className="font-semibold mb-2">{licensePreview.title}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <strong>Artwork:</strong> {licensePreview.artwork?.title} (#
                {licensePreview.artwork?.token_id})
              </div>
              <div>
                <strong>License Type:</strong>{" "}
                {licensePreview.license_terms?.type}
              </div>
              <div>
                <strong>Duration:</strong>{" "}
                {licensePreview.license_terms?.duration?.duration_days} days
              </div>
              <div>
                <strong>Fee:</strong>{" "}
                {licensePreview.technical_details?.license_fee}
              </div>
            </div>
            <div className="mb-3">
              <strong>Usage Rights:</strong>
              <p className="text-gray-600 text-xs mt-1">
                {licensePreview.terms_and_conditions?.usage_rights}
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
          <h3 className="text-xl font-bold text-gray-900 mb-6">License Details</h3>
          
          {!isAuthenticated ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Wallet Required</h4>
              <p className="text-gray-600">Please connect your wallet to purchase a license.</p>
              <p className="text-sm text-gray-500 mt-2">
                Detected: {account ? `Wallet connected (${account.substring(0, 8)}...) but not authenticated` : 'No wallet detected'}
              </p>
            </div>
          ) : !isCorrectNetwork ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Wrong Network</h4>
              <p className="text-gray-600">Please switch to Sepolia testnet to purchase licenses.</p>
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
                  <option value="PERSONAL">Personal Use (0.1 ETH)</option>
                  <option value="COMMERCIAL">Commercial Use (0.1 ETH)</option>
                  <option value="EXCLUSIVE">Exclusive Rights (0.1 ETH)</option>
                </select>
                {errors.license_type && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.license_type.message}
                  </p>
                )}
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  {...register("duration_days")}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-800 focus:border-blue-800 ${
                    errors.duration_days ? "border-red-300" : "border-gray-300"
                  }`}
                />
                {errors.duration_days && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.duration_days.message}
                  </p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  License will be valid for the specified number of days
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">Fee Breakdown</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">License Fee:</span>
                    <span className="font-mono">0.1 ETH</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Platform Fee (10%):</span>
                    <span className="font-mono text-red-600">-0.01 ETH</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between font-medium">
                      <span className="text-gray-900">Total Cost:</span>
                      <span className="font-mono text-green-600">0.1 ETH</span>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={purchasing}
                variant="contained"
                color="primary"
                fullWidth
                size="large"
                className="py-3"
              >
                {purchasing ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    <span>Processing License...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <Shield className="w-5 h-5 mr-2" />
                    Purchase License (0.1 ETH)
                  </div>
                )}
              </Button>

              <div className="mt-4 text-xs text-gray-500 text-center">
                <p>By purchasing a license, you agree to the platform's terms and conditions.</p>
                <p className="mt-1">Transaction fees will be deducted automatically.</p>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* License Information */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start">
          <Shield className="w-6 h-6 text-blue-800 mt-0.5 mr-3" />
          <div>
            <h4 className="text-lg font-semibold text-blue-900 mb-2">License Terms</h4>
            <p className="text-blue-800 mb-2">
              Purchasing a license grants you specific rights to use this artwork.
            </p>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Personal Use: Non-commercial use only</li>
              <li>• Commercial Use: Commercial use with attribution</li>
              <li>• Exclusive Rights: Exclusive usage rights for the duration</li>
              <li>• All licenses include automatic royalty payments to the creator</li>
              <li>• License terms are recorded on the blockchain</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LicensePage;