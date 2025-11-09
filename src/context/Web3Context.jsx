import React, { createContext, useContext, useState, useEffect } from "react";
import { ethers } from "ethers";
import Web3 from "web3";
import toast from "react-hot-toast";

const Web3Context = createContext();

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error("useWeb3 must be used within Web3Provider");
  }
  return context;
};

export const Web3Provider = ({ children }) => {
  const [web3, setWeb3] = useState(null);
  const [ethersProvider, setEthersProvider] = useState(null);
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [balance, setBalance] = useState("0");
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [pendingTransactions, setPendingTransactions] = useState(new Set());

  const EXPECTED_CHAIN_ID = "0xaa36a7"; // Sepolia
  const EXPECTED_CHAIN_ID_DECIMAL = 11155111;

  // Initialize providers with better error handling
  const initializeProviders = () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        console.log("🔄 Initializing Web3 providers...");

        // Create Web3 instance
        const web3Instance = new Web3(window.ethereum);

        // Verify Web3 instance is working
        if (!web3Instance || !web3Instance.utils) {
          throw new Error("Web3 instance created but utils not available");
        }

        console.log("✅ Web3 instance created successfully");

        // Create Ethers provider
        const provider = new ethers.BrowserProvider(window.ethereum);

        return { web3Instance, provider };
      } catch (error) {
        console.error("❌ Error initializing providers:", error);
        return { web3Instance: null, provider: null };
      }
    }
    console.warn("⚠️ MetaMask not detected");
    return { web3Instance: null, provider: null };
  };

  // Web3 utility functions with fallbacks
  const web3Utils = {
    toWei: (value, unit = "ether") => {
      if (!web3 || !web3.utils) {
        console.warn("Using fallback toWei calculation");
        // Fallback calculation
        const units = {
          ether: 1e18,
          gwei: 1e9,
          wei: 1,
          kwei: 1e3,
          mwei: 1e6,
        };
        const multiplier = units[unit] || units.ether;
        const result = (parseFloat(value) * multiplier).toString();
        console.log(`Fallback toWei: ${value} ${unit} = ${result} wei`);
        return result;
      }
      return web3.utils.toWei(value.toString(), unit);
    },

    fromWei: (value, unit = "ether") => {
      if (!web3 || !web3.utils) {
        console.warn("Using fallback fromWei calculation");
        // Fallback calculation
        const units = {
          ether: 1e18,
          gwei: 1e9,
          wei: 1,
          kwei: 1e3,
          mwei: 1e6,
        };
        const divisor = units[unit] || units.ether;
        const result = (parseFloat(value) / divisor).toString();
        console.log(`Fallback fromWei: ${value} wei = ${result} ${unit}`);
        return result;
      }
      return web3.utils.fromWei(value, unit);
    },

    isAddress: (address) => {
      if (!web3 || !web3.utils) {
        // Simple fallback check
        return /^0x[a-fA-F0-9]{40}$/.test(address);
      }
      return web3.utils.isAddress(address);
    },

    toHex: (value) => {
      if (!web3 || !web3.utils) {
        // Fallback for number to hex
        if (typeof value === "number") {
          return "0x" + value.toString(16);
        }
        return value;
      }
      return web3.utils.toHex(value);
    },
  };

  // In Web3Context.jsx - Update connectWallet function
  const connectWallet = async () => {
    if (typeof window.ethereum === "undefined") {
      toast.error("MetaMask not installed");
      return false;
    }

    setConnecting(true);

    try {
      console.log("🔄 Requesting accounts...");
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts.length === 0) {
        toast.error("No accounts found");
        return false;
      }

      console.log("✅ Accounts received:", accounts);

      const { web3Instance, provider } = initializeProviders();

      if (!web3Instance || !web3Instance.utils) {
        throw new Error("Failed to initialize Web3");
      }

      const currentChainId = await window.ethereum.request({
        method: "eth_chainId",
      });

      console.log("✅ Setting Web3 state...");
      setWeb3(web3Instance);
      setEthersProvider(provider);
      setAccount(accounts[0]);
      setChainId(currentChainId);
      setConnected(true);

      // ✅ CRITICAL: Force balance update after a short delay to ensure state is set
      setTimeout(async () => {
        console.log("🔄 Force balance update after connection...");
        await updateBalance(accounts[0]);
      }, 1000);

      if (currentChainId !== EXPECTED_CHAIN_ID) {
        toast.error("Please switch to Sepolia testnet");
      } else {
        toast.success("Wallet connected successfully!");
      }

      console.log("✅ Wallet connection completed");
      return true;
    } catch (error) {
      console.error("❌ Error connecting wallet:", error);

      if (error.code === 4001) {
        toast.error("Connection rejected by user");
      } else if (
        error.message.includes("Web3") ||
        error.message.includes("utils")
      ) {
        toast.error(
          "Web3 initialization failed. Please refresh and try again."
        );
      } else {
        toast.error(error.message || "Connection failed");
      }

      return false;
    } finally {
      setConnecting(false);
    }
  };

  // In Web3Context.jsx - Replace updateBalance function
  const updateBalance = async (accountAddress) => {
    console.log("🔄 updateBalance called with:", accountAddress);

    if (!accountAddress) {
      console.error("❌ No account address provided");
      setBalance("0");
      return;
    }

    try {
      console.log("💰 Fetching balance for:", accountAddress);

      // Method 1: Try using web3 if available and working
      if (web3 && web3.eth && typeof web3.eth.getBalance === "function") {
        try {
          console.log("💰 Using web3.eth.getBalance...");
          const balanceWei = await web3.eth.getBalance(accountAddress);
          console.log("💰 Raw balance from web3 (wei):", balanceWei);

          if (web3.utils && typeof web3.utils.fromWei === "function") {
            const balanceEth = web3.utils.fromWei(balanceWei, "ether");
            const formattedBalance = parseFloat(balanceEth).toFixed(4);
            console.log("💰 Balance via web3:", formattedBalance, "ETH");
            setBalance(formattedBalance);
            return;
          }
        } catch (web3Error) {
          console.warn(
            "❌ web3.eth.getBalance failed, falling back:",
            web3Error
          );
        }
      }

      // Method 2: Fallback to direct ethereum provider (this works as per your test)
      console.log("💰 Using direct ethereum provider fallback...");
      const balanceHex = await window.ethereum.request({
        method: "eth_getBalance",
        params: [accountAddress, "latest"],
      });

      console.log("💰 Balance hex from provider:", balanceHex);
      const balanceWei = parseInt(balanceHex, 16);
      const balanceEth = balanceWei / 1e18;
      const formattedBalance = balanceEth.toFixed(4);
      console.log("💰 Balance via direct provider:", formattedBalance, "ETH");
      setBalance(formattedBalance);
    } catch (error) {
      console.error("❌ All balance fetching methods failed:", error);
      setBalance("0");
    }
  };

  // In Web3Context.jsx - Add this function
  const refreshBalance = async () => {
    console.log("🔄 Manual balance refresh triggered");
    if (account) {
      await updateBalance(account);
    } else {
      console.warn("❌ No account available for balance refresh");
    }
  };

  const switchToSepolia = async () => {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: EXPECTED_CHAIN_ID }],
      });
      return true;
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: EXPECTED_CHAIN_ID,
                chainName: "Sepolia Testnet",
                nativeCurrency: {
                  name: "Sepolia Ether",
                  symbol: "ETH",
                  decimals: 18,
                },
                rpcUrls: ["https://rpc.sepolia.org"],
                blockExplorerUrls: ["https://sepolia.etherscan.io"],
              },
            ],
          });
          return true;
        } catch (addError) {
          console.error("Error adding Sepolia network:", addError);
          toast.error("Failed to add Sepolia network");
          return false;
        }
      }
      console.error("Error switching to Sepolia:", switchError);
      toast.error("Failed to switch to Sepolia network");
      return false;
    }
  };

  // Enhanced gas estimation for different transaction types
  const estimateGasForTransaction = async (transactionData) => {
    try {
      // Determine transaction type based on data length and content
      let transactionType = "ETH_TRANSFER";

      if (transactionData.data && transactionData.data !== "0x") {
        if (transactionData.data.length > 500) {
          transactionType = "ARTWORK_REGISTRATION"; // Most complex
        } else if (transactionData.data.length > 200) {
          transactionType = "LICENSE_TRANSACTION"; // Medium complexity
        } else {
          transactionType = "CONTRACT_INTERACTION"; // Simple contract call
        }
      }

      const defaultGasLimits = {
        ETH_TRANSFER: 21000, // Simple ETH transfer
        LICENSE_TRANSACTION: 150000, // License transactions
        CONTRACT_INTERACTION: 100000, // Other contract interactions
        ARTWORK_REGISTRATION: 300000, // Artwork registration (most complex)
      };

      let gasEstimate;

      try {
        // Try to estimate gas first
        const estimateParams = {
          from: transactionData.from,
          to: transactionData.to,
          value: transactionData.value || "0",
          data: transactionData.data || "0x",
        };

        // Convert value to hex if it's a string number
        if (
          typeof estimateParams.value === "string" &&
          !estimateParams.value.startsWith("0x")
        ) {
          estimateParams.value = web3Utils.toHex(
            web3Utils.toWei(estimateParams.value, "ether")
          );
        }

        gasEstimate = await web3.eth.estimateGas(estimateParams);
      } catch (estimationError) {
        console.warn("Gas estimation failed, using default:", estimationError);
        gasEstimate = defaultGasLimits[transactionType] || 300000;
      }

      // Add buffer based on transaction type
      const bufferMultipliers = {
        ETH_TRANSFER: 1.1, // 10% buffer
        LICENSE_TRANSACTION: 1.3, // 30% buffer
        CONTRACT_INTERACTION: 1.2, // 20% buffer
        ARTWORK_REGISTRATION: 1.5, // 50% buffer
      };

      const gasEstimateNum =
        typeof gasEstimate === "bigint"
          ? Number(gasEstimate)
          : parseInt(gasEstimate);

      const gasWithBuffer = Math.floor(
        gasEstimateNum * (bufferMultipliers[transactionType] || 1.3)
      );

      console.log(
        `Gas estimate for ${transactionType}: ${gasEstimate}, With buffer: ${gasWithBuffer}`
      );
      return gasWithBuffer;
    } catch (error) {
      console.error("Gas estimation failed:", error);
      return 300000; // Safe default
    }
  };

  // Get optimized gas prices for testnet
  const getOptimizedGasPrices = async () => {
    try {
      // For testnets, use simple and reliable gas pricing
      try {
        // Try to get current gas price from the network
        const gasPrice = await web3.eth.getGasPrice();

        // Convert to number if it's BigInt
        let gasPriceValue;
        if (typeof gasPrice === "bigint") {
          gasPriceValue = Number(gasPrice);
        } else if (typeof gasPrice === "string") {
          gasPriceValue = parseInt(gasPrice);
        } else {
          gasPriceValue = gasPrice;
        }

        // Add 20% buffer for testnet reliability
        const bufferedGasPrice = Math.floor(gasPriceValue * 1.2);

        return {
          gasPrice: bufferedGasPrice.toString(),
        };
      } catch (error) {
        console.warn("Error getting gas price, using fallback:", error);
        // Fallback for testnets - use fixed gas price (30 Gwei)
        const fallbackGasPrice = web3Utils.toWei("30", "gwei");
        return {
          gasPrice: fallbackGasPrice.toString(),
        };
      }
    } catch (error) {
      console.error("Error in getOptimizedGasPrices:", error);
      // Final fallback
      const fallbackGasPrice = web3Utils.toWei("30", "gwei");
      return {
        gasPrice: fallbackGasPrice.toString(),
      };
    }
  };

  // Monitor transaction status with proper timeout
  const monitorTransaction = async (transactionHash) => {
    const toastId = toast.loading("Waiting for blockchain confirmation...");

    try {
      // Set a reasonable timeout for testnets (3 minutes)
      const timeout = 3 * 60 * 1000;
      const startTime = Date.now();

      while (Date.now() - startTime < timeout) {
        try {
          const receipt = await web3.eth.getTransactionReceipt(transactionHash);

          if (receipt) {
            if (receipt.status) {
              toast.success("Transaction confirmed on blockchain!", {
                id: toastId,
              });
              return { success: true, receipt };
            } else {
              toast.error("Transaction failed on blockchain", { id: toastId });
              return { success: false, receipt };
            }
          }

          // Wait before checking again
          await new Promise((resolve) => setTimeout(resolve, 3000));
        } catch (pollError) {
          console.warn("Error checking transaction status:", pollError);
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }

      // Timeout reached
      toast.error(
        "Confirmation taking longer than expected. Please check blockchain explorer.",
        { id: toastId }
      );
      return { success: false, error: "Timeout" };
    } catch (error) {
      console.error("Transaction monitoring error:", error);
      toast.error("Confirmation check failed", { id: toastId });
      return { success: false, error };
    }
  };

  // Main sendTransaction function - compatible with all components
  const sendTransaction = async (transactionData) => {
    if (!web3 || !account) {
      throw new Error("Web3 not initialized or account not connected");
    }

    const toastId = toast.loading("Preparing transaction...");

    try {
      // Validate transaction data
      if (!transactionData.to || !web3Utils.isAddress(transactionData.to)) {
        throw new Error("Invalid recipient address");
      }

      // Get optimized gas prices
      const gasPrices = await getOptimizedGasPrices();

      // Estimate gas with proper buffer
      const gasLimit = await estimateGasForTransaction(transactionData);

      // Prepare transaction parameters
      const txParams = {
        from: account,
        to: transactionData.to,
        value: transactionData.value || "0",
        data: transactionData.data || "0x",
        gas: web3Utils.toHex(gasLimit),
        gasPrice: gasPrices.gasPrice,
      };

      // Convert value to wei if it's in ETH
      if (
        typeof txParams.value === "string" &&
        !txParams.value.startsWith("0x")
      ) {
        if (txParams.value.includes(".")) {
          // It's an ETH amount, convert to wei
          txParams.value = web3Utils.toWei(txParams.value, "ether");
        }
      }

      console.log("Transaction parameters:", {
        ...txParams,
        value: web3Utils.fromWei(txParams.value, "ether") + " ETH",
        gasPrice: web3Utils.fromWei(txParams.gasPrice, "gwei") + " Gwei",
        gasLimit: gasLimit,
      });

      // Check balance
      const balanceWei = await web3.eth.getBalance(account);
      const balanceBigInt =
        typeof balanceWei === "bigint" ? balanceWei : BigInt(balanceWei);

      const valueBigInt = BigInt(txParams.value);
      const gasPriceBigInt = BigInt(txParams.gasPrice);
      const gasLimitBigInt = BigInt(gasLimit);

      const totalCost = valueBigInt + gasLimitBigInt * gasPriceBigInt;

      if (balanceBigInt < totalCost) {
        const shortfallEth = web3Utils.fromWei(
          (totalCost - balanceBigInt).toString(),
          "ether"
        );
        throw new Error(
          `Insufficient funds. Need ${parseFloat(shortfallEth).toFixed(
            6
          )} more ETH.`
        );
      }

      toast.loading("Sending transaction... (This may take 1-2 minutes)", {
        id: toastId,
      });

      // Send transaction with timeout
      const sendPromise = web3.eth.sendTransaction(txParams);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Transaction submission timeout")),
          120000
        )
      );

      const receipt = await Promise.race([sendPromise, timeoutPromise]);
      const transactionHash = receipt.transactionHash || receipt;

      if (!transactionHash) {
        throw new Error("No transaction hash received");
      }

      // Add to pending transactions
      setPendingTransactions((prev) => new Set(prev).add(transactionHash));

      toast.success("Transaction submitted successfully!", { id: toastId });

      // Start monitoring in background (non-blocking)
      monitorTransaction(transactionHash)
        .then((result) => {
          // Remove from pending transactions
          setPendingTransactions((prev) => {
            const newSet = new Set(prev);
            newSet.delete(transactionHash);
            return newSet;
          });

          if (result.success) {
            console.log("✅ Transaction confirmed on chain:", transactionHash);
            toast.success("Transaction confirmed on blockchain!");
            // Update balance after successful transaction
            updateBalance(account);
          } else {
            console.warn("⚠️ Transaction failed or timeout:", result);
            toast.error("Transaction confirmation failed or timed out");
          }
        })
        .catch((monitorError) => {
          console.error("❌ Transaction monitoring failed:", monitorError);
          setPendingTransactions((prev) => {
            const newSet = new Set(prev);
            newSet.delete(transactionHash);
            return newSet;
          });
        });

      return { hash: transactionHash, receipt };
    } catch (error) {
      toast.dismiss(toastId);
      console.error("Transaction failed:", error);

      // User-friendly error messages
      const errorMessages = {
        timeout: "Transaction timed out. Please try again.",
        "insufficient funds":
          "Insufficient funds for transaction. Please add ETH to your wallet.",
        rejected: "Transaction rejected by user.",
        revert: "Transaction reverted. Check contract requirements.",
        "out of gas": "Transaction requires more gas. Please try again.",
        gas: "Gas estimation failed. Please try again.",
        network: "Network error. Please check your connection.",
        nonce: "Nonce error. Please try again.",
        "invalid recipient address":
          "Invalid contract address. Please contact support.",
      };

      const errorMessage =
        Object.entries(errorMessages).find(([key]) =>
          error.message.toLowerCase().includes(key)
        )?.[1] ||
        error.message ||
        "Transaction failed";

      throw new Error(errorMessage);
    }
  };

  // Check transaction status
  const checkTransactionStatus = async (transactionHash) => {
    try {
      const receipt = await web3.eth.getTransactionReceipt(transactionHash);
      return receipt ? (receipt.status ? "CONFIRMED" : "FAILED") : "PENDING";
    } catch (error) {
      console.error("Error checking transaction status:", error);
      return "UNKNOWN";
    }
  };

  useEffect(() => {
    if (typeof window.ethereum !== "undefined") {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          setAccount(null);
          setConnected(false);
          setBalance("0");
          setWeb3(null);
          setEthersProvider(null);
          console.log("Wallet disconnected");
        } else {
          setAccount(accounts[0]);
          updateBalance(accounts[0]);
          toast("Wallet account changed");
        }
      };

      const handleChainChanged = (newChainId) => {
        setChainId(newChainId);
        if (newChainId !== EXPECTED_CHAIN_ID) {
          toast.error("Please switch to Sepolia testnet");
        } else {
          toast.success("Connected to Sepolia testnet");
        }
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      // Auto-connect if previously connected
      const autoConnect = async () => {
        try {
          const accounts = await window.ethereum.request({
            method: "eth_accounts",
          });
          if (accounts.length > 0) {
            console.log("🔄 Auto-connecting wallet...");
            const { web3Instance, provider } = initializeProviders();
            const currentChainId = await window.ethereum.request({
              method: "eth_chainId",
            });

            if (web3Instance && web3Instance.utils) {
              setWeb3(web3Instance);
              setEthersProvider(provider);
              setAccount(accounts[0]);
              setChainId(currentChainId);
              setConnected(true);
              await updateBalance(accounts[0]);
              console.log("✅ Auto-connect successful");
            } else {
              console.warn(
                "⚠️ Auto-connect failed: Web3 not properly initialized"
              );
            }
          }
        } catch (error) {
          console.error("Auto-connect failed:", error);
        }
      };

      autoConnect();

      return () => {
        window.ethereum.removeListener(
          "accountsChanged",
          handleAccountsChanged
        );
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, []);

  const disconnectWallet = () => {
    setAccount(null);
    setConnected(false);
    setBalance("0");
    setWeb3(null);
    setEthersProvider(null);
    console.log("Wallet disconnected");
  };

  return (
    <Web3Context.Provider
      value={{
        web3,
        ethersProvider,
        account,
        chainId,
        balance,
        connected,
        connecting,
        pendingTransactions: Array.from(pendingTransactions),
        web3Utils, // ✅ Add web3 utilities
        connectWallet,
        disconnectWallet,
        switchToSepolia,
        sendTransaction,
        checkTransactionStatus,
        updateBalance,
        refreshBalance,
        isCorrectNetwork: chainId === EXPECTED_CHAIN_ID,
        expectedChainId: EXPECTED_CHAIN_ID,
        expectedChainIdDecimal: EXPECTED_CHAIN_ID_DECIMAL,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};
