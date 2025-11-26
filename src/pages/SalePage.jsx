import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";
import { useAuth } from "../context/AuthContext";
import { artworksAPI } from "../services/api";
import { UserIdentifier, CurrencyConverter } from "../utils/currencyUtils";
import {
  ShoppingCart,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Wallet,
  CreditCard,
} from "lucide-react";
import LoadingSpinner from "../components/common/LoadingSpinner";
import IPFSImage from "../components/common/IPFSImage";
import { Button } from "@mui/material";
import toast from "react-hot-toast";
import Web3 from "web3";

const SalePage = () => {
  const { tokenId } = useParams();
  const navigate = useNavigate();
  const {
    account,
    isCorrectNetwork,
    sendTransaction,
    balance,
    web3,
    web3Utils,
    connectWallet,
    switchToSepolia,
  } = useWeb3();
  const { isAuthenticated, user } = useAuth();

  const [artwork, setArtwork] = useState(null);
  const [blockchainInfo, setBlockchainInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState(null);
  const [simulationResults, setSimulationResults] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("paypal");

  // Get user identifier
  const userIdentifier = UserIdentifier.getUserIdentifier(user);
  const isPayPalUser = UserIdentifier.isPayPalUser(user);
  const isCryptoUser = UserIdentifier.isCryptoUser(user);

  // Fetch artwork data
  useEffect(() => {
    if (tokenId) {
      fetchArtworkData();
    }
  }, [tokenId]);

  // Calculate simulation whenever artwork data changes
  useEffect(() => {
    if (artwork && blockchainInfo) {
      calculateSaleSimulation();
    }
  }, [artwork, blockchainInfo, paymentMethod]);

  // Check if current user is the owner
  useEffect(() => {
    if (!loading && blockchainInfo && artwork) {
      // Check if blockchainInfo has valid owner data
      const hasValidOwner =
        blockchainInfo.owner &&
        blockchainInfo.owner !== "Unknown" &&
        blockchainInfo.owner !== "0x0000000000000000000000000000000000000000";

      if (!hasValidOwner) {
        console.warn("Blockchain info has invalid owner data");
        return;
      }

      // Check for both crypto and PayPal users
      const isCryptoOwner =
        account && account.toLowerCase() === blockchainInfo.owner.toLowerCase();
      const isPayPalOwner = userIdentifier === artwork?.owner_id;

      if (isCryptoOwner || isPayPalOwner) {
        navigate(`/artwork/${tokenId}`);
      }
    }
  }, [
    account,
    userIdentifier,
    blockchainInfo,
    loading,
    tokenId,
    navigate,
    artwork,
  ]);

  const fetchArtworkData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [artworkRes, blockchainRes] = await Promise.allSettled([
        artworksAPI.getById(tokenId),
        artworksAPI.getBlockchainInfo(tokenId),
      ]);

      let artworkData = null;
      let blockchainData = null;

      if (artworkRes.status === "fulfilled") {
        artworkData = artworkRes.value;
        setArtwork(artworkData);
      } else {
        console.error("Failed to fetch artwork:", artworkRes.reason);
        throw new Error("Failed to fetch artwork data");
      }

      if (blockchainRes.status === "fulfilled") {
        blockchainData = blockchainRes.value;

        // Validate blockchain data before setting
        if (
          blockchainData.error ||
          blockchainData.blockchain_status === "error"
        ) {
          console.warn("Blockchain data has errors:", blockchainData.error);
          // Still set it but with warning
          setBlockchainInfo(blockchainData);
        } else {
          setBlockchainInfo(blockchainData);
        }
      } else {
        console.warn("Failed to fetch blockchain data:", blockchainRes.reason);
        // Create fallback blockchain data from artwork
        const fallbackBlockchainData = {
          token_id: parseInt(tokenId),
          owner: artworkData?.owner_address || "Unknown",
          creator: artworkData?.creator_address || "Unknown",
          royalty_percentage: artworkData?.royalty_percentage || 0,
          metadata_uri: artworkData?.metadata_uri || "",
          is_licensed: false,
          blockchain_status: "fallback",
          source: "database_fallback",
        };
        setBlockchainInfo(fallbackBlockchainData);
      }
    } catch (err) {
      setError(err.message);
      toast.error("Failed to load artwork details");
    } finally {
      setLoading(false);
    }
  };

  const calculateSaleSimulation = () => {
    // Validate inputs first
    if (!artwork || !blockchainInfo) {
      console.warn("Missing artwork or blockchain data for simulation");
      return;
    }

    // Use artwork price instead of user input
    const price = artwork.price || 0;

    if (price <= 0) {
      console.warn("Artwork price is not set or invalid");
      return;
    }

    const platformFeeRate = 0.05; // 5% platform fee

    // Handle missing royalty_percentage
    const royaltyRate = (blockchainInfo.royalty_percentage || 0) / 10000;

    // Handle missing owner/creator addresses
    const creatorAddress = artwork.creator_address || "unknown";
    const ownerAddress = blockchainInfo.owner || "unknown";

    const isPrimarySale =
      creatorAddress.toLowerCase() === ownerAddress.toLowerCase();

    let platformFee = price * platformFeeRate;
    let royaltyAmount = 0;
    let sellerReceives = 0;
    let creatorRoyalty = 0;

    if (isPrimarySale) {
      sellerReceives = price - platformFee;
      royaltyAmount = 0;
    } else {
      royaltyAmount = price * royaltyRate;
      creatorRoyalty = royaltyAmount;
      sellerReceives = price - platformFee - royaltyAmount;
    }

    setSimulationResults({
      salePrice: price,
      platformFee: platformFee,
      royaltyAmount: royaltyAmount,
      creatorRoyalty: creatorRoyalty,
      sellerReceives: sellerReceives,
      isPrimarySale,
      royaltyRate: (royaltyRate * 100).toFixed(2),
      isValid: true,
    });
  };

  // const handlePurchase = async () => {
  //   if (!isAuthenticated) {
  //     toast.error("Please log in to purchase");
  //     return;
  //   }

  //   // Enhanced wallet connection check for crypto payments
  //   if (paymentMethod === "crypto") {
  //     if (!account) {
  //       toast.error("Please connect your wallet");
  //       const connected = await connectWallet();
  //       if (!connected) return;
  //     }

  //     if (!isCorrectNetwork) {
  //       toast.error("Please switch to Sepolia testnet");
  //       const switched = await switchToSepolia();
  //       if (!switched) return;
  //     }

  //     // ✅ COMPREHENSIVE WEB3 CHECK
  //     if (!web3 || !web3.utils) {
  //       console.error("Web3 not available:", {
  //         web3: !!web3,
  //         utils: web3?.utils,
  //       });
  //       toast.error("Web3 not available. Reconnecting wallet...");

  //       // Try to reconnect
  //       const reconnected = await connectWallet();
  //       if (!reconnected) {
  //         toast.error("Failed to initialize Web3. Please refresh the page.");
  //         return;
  //       }

  //       // Check again after reconnection
  //       if (!web3 || !web3.utils) {
  //         toast.error("Web3 still not available. Please refresh the page.");
  //         return;
  //       }
  //     }
  //   }

  //   // Validate blockchain data before purchase
  //   if (
  //     !blockchainInfo ||
  //     !blockchainInfo.owner ||
  //     blockchainInfo.owner === "Unknown"
  //   ) {
  //     toast.error("Cannot process purchase: Invalid owner information");
  //     return;
  //   }

  //   // Use artwork price
  //   const price = artwork.price;

  //   if (price <= 0 || isNaN(price)) {
  //     toast.error("Artwork price is not set or invalid");
  //     return;
  //   }

  //   // For crypto, check balance
  //   if (paymentMethod === "crypto") {
  //     const balanceEth = parseFloat(balance);
  //     const requiredBalance = price + 0.01; // Include gas estimate

  //     if (balanceEth < requiredBalance) {
  //       toast.error(
  //         `Insufficient balance. Need ${requiredBalance.toFixed(
  //           4
  //         )} ETH, have ${balanceEth} ETH`
  //       );
  //       return;
  //     }
  //   }

  //   setPurchasing(true);
  //   setError(null);

  //   try {
  //     console.log("🔄 Proceeding with purchase...");
  //     console.log("Web3 status:", {
  //       web3: !!web3,
  //       utils: web3?.utils,
  //       account,
  //       paymentMethod,
  //     });

  //     // ✅ SAFE PRICE CONVERSION WITH MULTIPLE FALLBACKS
  //     let salePriceWei;

  //     // Method 1: Use web3 from context (preferred)
  //     if (web3 && web3.utils) {
  //       console.log("Using Web3 from context for price conversion");
  //       salePriceWei = web3.utils.toWei(price.toString(), "ether");
  //     }
  //     // Method 2: Use web3Utils from context
  //     else if (web3Utils) {
  //       console.log("Using web3Utils for price conversion");
  //       salePriceWei = web3Utils.toWei(price.toString(), "ether");
  //     }
  //     // Method 3: Use ethers.js
  //     else if (typeof ethers !== "undefined") {
  //       console.log("Using ethers.js for price conversion");
  //       salePriceWei = ethers.parseEther(price.toString()).toString();
  //     }
  //     // Method 4: Manual calculation (fallback)
  //     else {
  //       console.log("Using manual calculation for price conversion");
  //       salePriceWei = (price * 1e18).toString();
  //     }

  //     console.log("💰 Price conversion:", {
  //       eth: price,
  //       wei: salePriceWei,
  //       method: "web3 context",
  //     });

  //     // ✅ FIXED: Send proper request body with correct field names
  //     const prepareResponse = await artworksAPI.prepareSaleTransaction({
  //       token_id: parseInt(tokenId),
  //       buyer_address: account || userIdentifier,
  //       seller_address: blockchainInfo.owner,
  //       sale_price_wei: salePriceWei, // ✅ Send wei value, not ETH
  //     });

  //     console.log("✅ Sale preparation response:", prepareResponse);



  //     // ✅ FIXED: Better response validation
  //     if (!prepareResponse || typeof prepareResponse !== 'object') {
  //       throw new Error("Invalid response from server");

  //     }
  //     // Check if it's a PayPal response
  //     if (prepareResponse.payment_method === "paypal" || prepareResponse.type === "paypal") {
  //       const approvalUrl = prepareResponse.transaction_data?.approval_url || prepareResponse.approval_url;
  //       if (approvalUrl) {
  //         window.location.href = approvalUrl;
  //         return;
  //       }
  //     }
  //     // ✅ FIXED: Handle different response structures
  //     const transactionData =
  //       prepareResponse.transaction_data || prepareResponse;

  //     // Validate required fields for MetaMask
  //     if (!transactionData.to || !transactionData.value) {
  //       console.error("Missing transaction data:", transactionData);
  //       throw new Error("Blockchain transaction required but not provided");
  //     }

  //     const requiresBlockchain = prepareResponse.requires_blockchain !== false;
  //     const mode = prepareResponse.mode || "REAL";

  //     // // Handle PayPal response
  //     // if (prepareResponse.payment_method === "paypal") {
  //     //   window.location.href = prepareResponse.transaction_data.approval_url;
  //     //   return;
  //     // }

  //     // ✅ FIXED: Handle MetaMask flow with proper transaction data
  //     if (
  //       (prepareResponse.payment_method === "crypto" ||
  //         paymentMethod === "crypto") &&
  //       requiresBlockchain
  //     ) {
  //       // Prepare transaction parameters for MetaMask
  //       const txParams = {
  //         to: transactionData.to,
  //         data: transactionData.data,
  //         from: account,
  //         value: transactionData.value, // This should already be in wei hex format
  //       };

  //       // Add gas settings
  //       if (
  //         transactionData.maxFeePerGas &&
  //         transactionData.maxPriorityFeePerGas
  //       ) {
  //         txParams.maxFeePerGas = transactionData.maxFeePerGas;
  //         txParams.maxPriorityFeePerGas = transactionData.maxPriorityFeePerGas;
  //       } else if (transactionData.gasPrice) {
  //         txParams.gasPrice = transactionData.gasPrice;
  //       }

  //       // Add gas limit if provided
  //       if (transactionData.gas) {
  //         txParams.gasLimit = transactionData.gas;
  //       }

  //       // Add chain ID if provided
  //       if (transactionData.chainId) {
  //         txParams.chainId = parseInt(transactionData.chainId, 16);
  //       }

  //       console.log("🦊 Sending transaction to MetaMask:", txParams);

  //       // ✅ This WILL trigger MetaMask popup
  //       const result = await sendTransaction(txParams);

  //       if (!result || !result.hash) {
  //         throw new Error("No transaction hash received from MetaMask");
  //       }

  //       toast.success(
  //         "Purchase transaction submitted! Waiting for confirmation..."
  //       );
  //       console.log("📝 Transaction hash:", result.hash);

  //       try {
  //         // ✅ NEW: Confirm the transaction with backend
  //         const confirmToast = toast.loading(
  //           "Confirming transaction on blockchain..."
  //         );

  //         // ✅ FIXED: Send proper confirmation data
  //         await artworksAPI.confirmSale({
  //           tx_hash: result.hash,
  //           token_id: parseInt(tokenId),
  //           buyer_address: account,
  //           seller_address: blockchainInfo.owner,
  //           sale_price_wei: salePriceWei, // Use the wei value we calculated
  //           sale_price_eth: price, // Original ETH price for display
  //           payment_method: paymentMethod,
  //         });

  //         toast.dismiss(confirmToast);
  //         toast.success(
  //           "✅ Purchase completed successfully! Transaction confirmed on blockchain."
  //         );

  //         // Refresh data to show new owner
  //         await fetchArtworkData();

  //         setTimeout(() => {
  //           navigate(`/artwork/${tokenId}`);
  //         }, 2000);
  //       } catch (confirmationError) {
  //         console.error("Sale confirmation failed:", confirmationError);
  //         // Even if confirmation fails, the transaction might still succeed
  //         toast.success(
  //           "✅ Transaction submitted! Please check your collection in a few moments."
  //         );

  //         setTimeout(() => {
  //           navigate(`/artwork/${tokenId}`);
  //         }, 2000);
  //       }
  //     } else {
  //       throw new Error(
  //         "Invalid response: Blockchain transaction required but not provided"
  //       );
  //     }
  //   } catch (error) {
  //     console.error("❌ Purchase failed:", error);

  //     // ✅ IMPROVED: Better error handling
  //     if (error.code === 4001) {
  //       setError("Transaction cancelled by user in MetaMask");
  //       toast.error("Transaction cancelled by user");
  //     } else if (error.code === -32603) {
  //       setError(
  //         "Transaction failed. Please check your gas settings and try again."
  //       );
  //       toast.error("Transaction failed. Check gas settings.");
  //     } else if (error.message?.includes("insufficient funds")) {
  //       setError("Insufficient funds. Please add ETH to your wallet.");
  //       toast.error("Insufficient funds. Add ETH to your wallet.");
  //     } else if (
  //       error.message?.includes("user rejected") ||
  //       error.message?.includes("denied")
  //     ) {
  //       setError("Transaction rejected by user in MetaMask.");
  //       toast.error("Transaction rejected by user");
  //     } else if (error.message?.includes("demo mode")) {
  //       setError(
  //         "Blockchain service is in demo mode. Real transactions are disabled."
  //       );
  //       toast.error("Blockchain service is in demo mode.");
  //     } else if (error.message?.includes("not connected")) {
  //       setError(
  //         "Blockchain connection issue detected, but proceeding with purchase..."
  //       );
  //       toast.success("Proceeding with purchase despite connection warning...");
  //       // Retry the purchase without health check
  //       setTimeout(() => handlePurchase(), 1000);
  //       return;
  //     } else if (error.response?.status === 422) {
  //       // ✅ FIXED: Handle 422 errors specifically
  //       const errorDetail = error.response?.data?.detail;
  //       if (Array.isArray(errorDetail)) {
  //         // Handle validation errors
  //         const fieldErrors = errorDetail
  //           .map((err) => `${err.loc.join(".")}: ${err.msg}`)
  //           .join(", ");
  //         setError(`Validation error: ${fieldErrors}`);
  //         toast.error("Validation error. Please check your input.");
  //       } else if (typeof errorDetail === "string") {
  //         setError(errorDetail);
  //         toast.error(errorDetail);
  //       } else {
  //         setError(
  //           "Invalid request format. Please check your input and try again."
  //         );
  //         toast.error("Invalid request format.");
  //       }
  //     } else if (error.response?.status === 400) {
  //       setError(
  //         error.response?.data?.detail ||
  //         "Bad request. Please check your input."
  //       );
  //       toast.error(error.response?.data?.detail || "Bad request.");
  //     } else if (error.response?.status === 500) {
  //       setError("Server error. Please try again later.");
  //       toast.error("Server error. Please try again later.");
  //     } else {
  //       const errorMessage =
  //         error.response?.data?.detail ||
  //         error.response?.data?.error ||
  //         error.message ||
  //         "Purchase failed. Please try again.";
  //       setError(errorMessage);
  //       toast.error(errorMessage || "Purchase failed");
  //     }
  //   } finally {
  //     setPurchasing(false);
  //   }
  // };

  const handlePurchase = async () => {
    if (!isAuthenticated) {
      toast.error("Please log in to purchase");
      return;
    }
    // ✅ STEP 1: CHECK PAYMENT METHOD FIRST
    // If PayPal, skip all wallet checks
    if (paymentMethod === "paypal") {
      setPurchasing(true);
      setError(null);

      try {
        console.log("🔄 Processing PayPal purchase...");

        // ✅ Calculate USD price using same converter as display
    const priceUSD = CurrencyConverter.ethToUsd(artwork.price);

    console.log("💰 Price Details:", {
      price_eth: artwork.price,
      price_usd: priceUSD,
      displayed: formatPrice(artwork.price)
    });

        // / ✅ LOG THE REQUEST
        const requestData = {
          token_id: parseInt(tokenId),
          buyer_address: user?.wallet_address || user?.email || 'paypal_user',
          payment_method: "paypal"
        };

        console.log("📤 Sending PayPal request:", requestData);

        const prepareResponse = await artworksAPI.prepareSaleTransaction({
          token_id: parseInt(tokenId),
          buyer_address: user?.wallet_address || user?.email || 'paypal_user',
          seller_address: blockchainInfo.owner,
          payment_method: "paypal",
          sale_price: priceUSD  // ✅ ADD THIS
        });

        // ✅ FULL RESPONSE LOGGING
        console.log("=== FULL PAYPAL RESPONSE ===");
        console.log("Type:", typeof prepareResponse);
        console.log("Keys:", Object.keys(prepareResponse || {}));
        console.log("Full object:", JSON.stringify(prepareResponse, null, 2));
        console.log("transaction_data:", prepareResponse?.transaction_data);
        console.log("approval_url direct:", prepareResponse?.approval_url);
        console.log("=== END ===");


        console.log("✅ PayPal preparation response:", prepareResponse);

        // Check if it's a PayPal response
        if (prepareResponse?.transaction_data?.type === "paypal" || paymentMethod === "paypal") {
          const approvalUrl = prepareResponse?.transaction_data?.approval_url;

          console.log("🔗 Approval URL:", approvalUrl);

          if (approvalUrl) {
            console.log("✅ Redirecting to PayPal:", approvalUrl);
            window.location.href = approvalUrl;
            return;
          } else {
            throw new Error('PayPal approval URL not provided');
          }
        }

        throw new Error('Invalid PayPal response');



      }

      catch (error) {
        console.error("❌ PayPal purchase failed:", error);
        const errorMessage = error.response?.data?.detail || error.message || "PayPal purchase failed";
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setPurchasing(false);
      }

      return; // ✅ EXIT HERE FOR PAYPAL
    }

    // Enhanced wallet connection check for crypto payments
    if (paymentMethod === "crypto") {
      if (!account) {
        toast.error("Please connect your wallet");
        const connected = await connectWallet();
        if (!connected) return;
      }

      if (!isCorrectNetwork) {
        toast.error("Please switch to Sepolia testnet");
        const switched = await switchToSepolia();
        if (!switched) return;
      }

      // ✅ COMPREHENSIVE WEB3 CHECK
      if (!web3 || !web3.utils) {
        console.error("Web3 not available:", {
          web3: !!web3,
          utils: web3?.utils,
        });
        toast.error("Web3 not available. Reconnecting wallet...");

        // Try to reconnect
        const reconnected = await connectWallet();
        if (!reconnected) {
          toast.error("Failed to initialize Web3. Please refresh the page.");
          return;
        }

        // Check again after reconnection
        if (!web3 || !web3.utils) {
          toast.error("Web3 still not available. Please refresh the page.");
          return;
        }
      }
    }

    // Validate blockchain data before purchase
    if (
      !blockchainInfo ||
      !blockchainInfo.owner ||
      blockchainInfo.owner === "Unknown"
    ) {
      toast.error("Cannot process purchase: Invalid owner information");
      return;
    }

    // Use artwork price
    const price = artwork.price;

    if (price <= 0 || isNaN(price)) {
      toast.error("Artwork price is not set or invalid");
      return;
    }

    // For crypto, check balance
    if (paymentMethod === "crypto") {
      const balanceEth = parseFloat(balance);
      const requiredBalance = price + 0.01; // Include gas estimate

      if (balanceEth < requiredBalance) {
        toast.error(
          `Insufficient balance. Need ${requiredBalance.toFixed(
            4
          )} ETH, have ${balanceEth} ETH`
        );
        return;
      }
    }

    setPurchasing(true);
    setError(null);

    try {
      console.log("🔄 Proceeding with purchase...");
      console.log("Web3 status:", {
        web3: !!web3,
        utils: web3?.utils,
        account,
        paymentMethod,
      });

      // ✅ SAFE PRICE CONVERSION WITH MULTIPLE FALLBACKS
      let salePriceWei;

      // Method 1: Use web3 from context (preferred)
      if (web3 && web3.utils) {
        console.log("Using Web3 from context for price conversion");
        salePriceWei = web3.utils.toWei(price.toString(), "ether");
      }
      // Method 2: Use web3Utils from context
      else if (web3Utils) {
        console.log("Using web3Utils for price conversion");
        salePriceWei = web3Utils.toWei(price.toString(), "ether");
      }
      // Method 3: Use ethers.js
      else if (typeof ethers !== "undefined") {
        console.log("Using ethers.js for price conversion");
        salePriceWei = ethers.parseEther(price.toString()).toString();
      }
      // Method 4: Manual calculation (fallback)
      else {
        console.log("Using manual calculation for price conversion");
        salePriceWei = (price * 1e18).toString();
      }

      console.log("💰 Price conversion:", {
        eth: price,
        wei: salePriceWei,
        method: "web3 context",
      });

      // ✅ FIXED: Send proper request body with correct field names
      const prepareResponse = await artworksAPI.prepareSaleTransaction({
        token_id: parseInt(tokenId),
        buyer_address: account || userIdentifier,
        seller_address: blockchainInfo.owner,
        sale_price_wei: salePriceWei, // ✅ Send wei value, not ETH
        payment_method: paymentMethod
      });

      console.log("✅ Sale preparation response:", prepareResponse);

      // ✅ FIXED: Better response validation
      if (!prepareResponse || typeof prepareResponse !== 'object') {
        throw new Error("Invalid response from server");
      }

      // ✅ NEW FIX: Check if response has transaction fields directly at root level
      let transactionData;
      if (prepareResponse.to && prepareResponse.value) {
        // Response IS the transaction data
        transactionData = prepareResponse;
        console.log("✅ Using root-level transaction data");
      } else if (prepareResponse.transaction_data) {
        // Response has nested transaction_data
        transactionData = prepareResponse.transaction_data;
        console.log("✅ Using nested transaction_data");
      } else {
        // No valid transaction data found
        console.error("Missing transaction data:", prepareResponse);
        throw new Error("Blockchain transaction required but not provided");
      }

      // Validate required fields for MetaMask
      if (!transactionData.to || !transactionData.value) {
        console.error("Missing required fields:", transactionData);
        throw new Error("Blockchain transaction required but not provided");
      }

      const requiresBlockchain = prepareResponse.requires_blockchain !== false;
      const mode = prepareResponse.mode || "REAL";

      // ✅ FIXED: Handle MetaMask flow with proper transaction data
      if (
        (prepareResponse.payment_method === "crypto" ||
          paymentMethod === "crypto") &&
        requiresBlockchain
      ) {
        // Prepare transaction parameters for MetaMask
        const txParams = {
          to: transactionData.to,
          data: transactionData.data,
          from: account,
          value: transactionData.value, // This should already be in wei hex format
        };

        // Add gas settings
        if (
          transactionData.maxFeePerGas &&
          transactionData.maxPriorityFeePerGas
        ) {
          txParams.maxFeePerGas = transactionData.maxFeePerGas;
          txParams.maxPriorityFeePerGas = transactionData.maxPriorityFeePerGas;
        } else if (transactionData.gasPrice) {
          txParams.gasPrice = transactionData.gasPrice;
        }

        // Add gas limit if provided
        if (transactionData.gas) {
          txParams.gasLimit = transactionData.gas;
        }

        // Add chain ID if provided
        if (transactionData.chainId) {
          txParams.chainId = parseInt(transactionData.chainId, 16);
        }

        console.log("🦊 Sending transaction to MetaMask:", txParams);

        // ✅ This WILL trigger MetaMask popup
        const result = await sendTransaction(txParams);

        if (!result || !result.hash) {
          throw new Error("No transaction hash received from MetaMask");
        }

        toast.success(
          "Purchase transaction submitted! Waiting for confirmation..."
        );
        console.log("📝 Transaction hash:", result.hash);

        try {
          // ✅ NEW: Confirm the transaction with backend
          const confirmToast = toast.loading(
            "Confirming transaction on blockchain..."
          );

          // ✅ FIXED: Send proper confirmation data
          await artworksAPI.confirmSale({
            tx_hash: result.hash,
            token_id: parseInt(tokenId),
            buyer_address: account,
            seller_address: blockchainInfo.owner,
            sale_price_wei: salePriceWei, // Use the wei value we calculated
            sale_price_eth: price, // Original ETH price for display
            payment_method: paymentMethod,
          });

          toast.dismiss(confirmToast);
          toast.success(
            "✅ Purchase completed successfully! Transaction confirmed on blockchain."
          );

          // Refresh data to show new owner
          await fetchArtworkData();

          setTimeout(() => {
            navigate(`/artwork/${tokenId}`);
          }, 2000);
        } catch (confirmationError) {
          console.error("Sale confirmation failed:", confirmationError);
          // Even if confirmation fails, the transaction might still succeed
          toast.success(
            "✅ Transaction submitted! Please check your collection in a few moments."
          );

          setTimeout(() => {
            navigate(`/artwork/${tokenId}`);
          }, 2000);
        }
      } else {
        throw new Error(
          "Invalid response: Blockchain transaction required but not provided"
        );
      }
    } catch (error) {
      console.error("❌ Purchase failed:", error);

      // ✅ IMPROVED: Better error handling
      if (error.code === 4001) {
        setError("Transaction cancelled by user in MetaMask");
        toast.error("Transaction cancelled by user");
      } else if (error.code === -32603) {
        setError(
          "Transaction failed. Please check your gas settings and try again."
        );
        toast.error("Transaction failed. Check gas settings.");
      } else if (error.message?.includes("insufficient funds")) {
        setError("Insufficient funds. Please add ETH to your wallet.");
        toast.error("Insufficient funds. Add ETH to your wallet.");
      } else if (
        error.message?.includes("user rejected") ||
        error.message?.includes("denied")
      ) {
        setError("Transaction rejected by user in MetaMask.");
        toast.error("Transaction rejected by user");
      } else if (error.message?.includes("demo mode")) {
        setError(
          "Blockchain service is in demo mode. Real transactions are disabled."
        );
        toast.error("Blockchain service is in demo mode.");
      } else if (error.message?.includes("not connected")) {
        setError(
          "Blockchain connection issue detected, but proceeding with purchase..."
        );
        toast.success("Proceeding with purchase despite connection warning...");
        // Retry the purchase without health check
        setTimeout(() => handlePurchase(), 1000);
        return;
      } else if (error.response?.status === 422) {
        // ✅ FIXED: Handle 422 errors specifically
        const errorDetail = error.response?.data?.detail;
        if (Array.isArray(errorDetail)) {
          // Handle validation errors
          const fieldErrors = errorDetail
            .map((err) => `${err.loc.join(".")}: ${err.msg}`)
            .join(", ");
          setError(`Validation error: ${fieldErrors}`);
          toast.error("Validation error. Please check your input.");
        } else if (typeof errorDetail === "string") {
          setError(errorDetail);
          toast.error(errorDetail);
        } else {
          setError(
            "Invalid request format. Please check your input and try again."
          );
          toast.error("Invalid request format.");
        }
      } else if (error.response?.status === 400) {
        setError(
          error.response?.data?.detail ||
          "Bad request. Please check your input."
        );
        toast.error(error.response?.data?.detail || "Bad request.");
      } else if (error.response?.status === 500) {
        setError("Server error. Please try again later.");
        toast.error("Server error. Please try again later.");
      } else {
        const errorMessage =
          error.response?.data?.detail ||
          error.response?.data?.error ||
          error.message ||
          "Purchase failed. Please try again.";
        setError(errorMessage);
        toast.error(errorMessage || "Purchase failed");
      }
    } finally {
      setPurchasing(false);
    }
  };

  const formatAddress = (address) => {
    if (!address) return "Unknown";
    return `${address.substring(0, 6)}...${address.substring(
      address.length - 4
    )}`;
  };

  // Format price display based on payment method
  const formatPrice = (amount) => {
    if (!amount || isNaN(amount)) return "N/A";

    if (paymentMethod === "paypal") {
      const usdAmount = CurrencyConverter.ethToUsd(amount);
      return CurrencyConverter.formatUsd(usdAmount);
    }
    return CurrencyConverter.formatEth(amount);
  };

  // Format simulation values
  const formatSimValue = (ethValue) => {
    if (!ethValue) return "N/A";

    if (paymentMethod === "paypal") {
      return CurrencyConverter.formatUsd(CurrencyConverter.ethToUsd(ethValue));
    }
    return CurrencyConverter.formatEth(ethValue);
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

  if (error || !artwork || !blockchainInfo) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center bg-red-50 border border-red-200 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Artwork Not Found
          </h2>
          <p className="text-gray-600 mb-4">
            {error || "The requested artwork could not be loaded."}
          </p>
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

  // Show warning if using fallback data
  const isUsingFallbackData =
    blockchainInfo?.blockchain_status === "fallback" ||
    blockchainInfo?.blockchain_status === "partial";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="text-center flex-1">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-800 p-3 rounded-full">
              <ShoppingCart className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Purchase Artwork
          </h1>
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

      {/* Fallback Data Warning */}
      {isUsingFallbackData && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
            <p className="text-yellow-800 text-sm">
              Using fallback data. Blockchain information may be incomplete.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Artwork Details */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-gray-100 rounded-lg overflow-hidden aspect-square flex items-center justify-center">
            <IPFSImage
              ipfsUri={artwork.metadata_uri}
              tokenId={artwork.token_id}
              alt={artwork.title || `Artwork ${artwork.token_id}`}
              className="w-full h-full object-cover"
              showFallbackInfo={true}
            />
          </div>

          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {artwork.title || `Artwork #${tokenId}`}
            </h2>

            {artwork.description && (
              <p className="text-gray-600 mb-4">{artwork.description}</p>
            )}

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Creator</span>
                <span className="text-sm font-mono text-gray-900">
                  {formatAddress(artwork.creator_address)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Current Owner</span>
                <span className="text-sm font-mono text-gray-900">
                  {formatAddress(blockchainInfo.owner)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Artwork Price</span>
                <span className="text-sm font-semibold text-gray-900">
                  {formatPrice(artwork.price)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Royalty</span>
                <span className="text-sm font-semibold text-gray-900">
                  {(blockchainInfo.royalty_percentage / 100).toFixed(2)}%
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Sale Type</span>
                <span
                  className={`text-sm px-2 py-1 rounded-full ${artwork.creator_address.toLowerCase() ===
                    blockchainInfo.owner.toLowerCase()
                    ? "bg-blue-100 text-blue-800"
                    : "bg-green-100 text-green-800"
                    }`}
                >
                  {artwork.creator_address.toLowerCase() ===
                    blockchainInfo.owner.toLowerCase()
                    ? "Primary Sale"
                    : "Secondary Sale"}
                </span>
              </div>

              {artwork.payment_method && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Listed With</span>
                  <span
                    className={`text-sm px-2 py-1 rounded-full ${artwork.payment_method === "paypal"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-blue-100 text-blue-800"
                      }`}
                  >
                    {artwork.payment_method === "paypal" ? (
                      <CreditCard className="w-3 h-3 inline mr-1" />
                    ) : (
                      <Wallet className="w-3 h-3 inline mr-1" />
                    )}
                    {artwork.payment_method === "paypal" ? "PayPal" : "Crypto"}
                  </span>
                </div>
              )}

              {/* Blockchain Status */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Blockchain Status</span>
                <span
                  className={`text-sm px-2 py-1 rounded-full ${blockchainInfo.blockchain_status === "full"
                    ? "bg-green-100 text-green-800"
                    : blockchainInfo.blockchain_status === "partial"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                    }`}
                >
                  {blockchainInfo.blockchain_status === "full"
                    ? "Live"
                    : blockchainInfo.blockchain_status === "partial"
                      ? "Partial"
                      : "Fallback"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Purchase Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">
            Purchase Details
          </h3>

          {!isAuthenticated ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Authentication Required
              </h4>
              <p className="text-gray-600">
                Please log in to purchase this artwork.
              </p>
            </div>
          ) : paymentMethod === "crypto" && !isCorrectNetwork ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Wrong Network
              </h4>
              <p className="text-gray-600">
                Please switch to Sepolia testnet to make purchases.
              </p>
            </div>
          ) : artwork.price <= 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Price Not Set
              </h4>
              <p className="text-gray-600">
                This artwork does not have a price set. Cannot purchase.
              </p>
            </div>
          ) : (
            <>
              {/* Fixed Price Display */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">
                  Artwork Price
                </h4>
                <div className="text-2xl font-bold text-blue-800">
                  {formatPrice(artwork.price)}
                </div>
                <p className="text-sm text-blue-600 mt-1">
                  This is the fixed price set by the owner
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-blue-800"
                >
                  <option value="crypto">MetaMask (Crypto)</option>
                  <option value="paypal">PayPal</option>
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  {paymentMethod === "crypto"
                    ? "Purchase on blockchain using MetaMask"
                    : "Purchase using PayPal (no crypto wallet needed)"}
                </p>
              </div>

              {/* Simulation Results */}
              {simulationResults && simulationResults.isValid && (
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">
                    Transaction Breakdown
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sale Price:</span>
                      <span className="font-mono">
                        {formatSimValue(simulationResults.salePrice)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Platform Fee (5%):</span>
                      <span className="font-mono text-red-600">
                        -{formatSimValue(simulationResults.platformFee)}
                      </span>
                    </div>
                    {!simulationResults.isPrimarySale &&
                      simulationResults.royaltyAmount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            Creator Royalty ({simulationResults.royaltyRate}%):
                          </span>
                          <span className="font-mono text-orange-600">
                            -{formatSimValue(simulationResults.creatorRoyalty)}
                          </span>
                        </div>
                      )}
                    <div className="border-t pt-2">
                      <div className="flex justify-between font-medium">
                        <span className="text-gray-900">Seller Receives:</span>
                        <span className="font-mono text-green-600">
                          {formatSimValue(simulationResults.sellerReceives)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === "crypto" && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Your balance: {balance} ETH
                  </p>
                  {artwork.price > 0 && (
                    <p className="text-sm text-gray-600 mt-1">
                      Required:{" "}
                      {CurrencyConverter.formatEth(artwork.price + 0.01)} ETH
                      (including gas)
                    </p>
                  )}
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <Button
                onClick={handlePurchase}
                disabled={purchasing || artwork.price <= 0}
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
                    {paymentMethod === "crypto" ? (
                      <Wallet className="w-5 h-5 mr-2" />
                    ) : (
                      <CreditCard className="w-5 h-5 mr-2" />
                    )}
                    Purchase Artwork for {formatPrice(artwork.price)} (
                    {paymentMethod === "crypto" ? "Crypto" : "PayPal"})
                  </div>
                )}
              </Button>

              <div className="mt-4 text-xs text-gray-500 text-center">
                <p>
                  By purchasing, you agree to the platform's terms and
                  conditions.
                </p>
                <p className="mt-1">
                  Transaction fees will be deducted automatically.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Additional Information */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start">
          <CheckCircle className="w-6 h-6 text-blue-800 mt-0.5 mr-3" />
          <div>
            <h4 className="text-lg font-semibold text-blue-900 mb-2">
              Secure Transaction
            </h4>
            <p className="text-blue-800 mb-2">
              This transaction is secured by{" "}
              {paymentMethod === "crypto"
                ? "blockchain technology and smart contracts"
                : "PayPal's secure payment system"}
              .
            </p>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Ownership transfer is automatic upon payment</li>
              <li>• Creator royalties are distributed automatically</li>
              <li>• Transaction is permanently recorded</li>
              <li>• Platform fees support continued development</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalePage;
