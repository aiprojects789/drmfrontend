import React, { useEffect } from "react";
import {
  Wallet,
  AlertCircle,
  CheckCircle,
  Link as LinkIcon,
} from "lucide-react";
import { Button } from "@mui/material";
import toast from "react-hot-toast";
import { useWeb3 } from "../context/Web3Context";
import { useAuth } from "../context/AuthContext";

const WalletButton = () => {
  const {
    connected,
    connecting,
    account,
    balance,
    connectWallet: web3ConnectWallet,
    disconnectWallet,
    isCorrectNetwork,
    switchToSepolia,
    refreshBalance, // ✅ Move this here
  } = useWeb3();

  const {
    isAuthenticated,
    isWalletConnected,
    connectWallet: authConnectWallet,
    loading,
    user,
  } = useAuth();

  // ✅ Calculate isFullyConnected here
  const isFullyConnected = connected && 
                          account && 
                          user?.wallet_address && 
                          user.wallet_address.toLowerCase() === account.toLowerCase();

  // Debug the wallet connection state
  useEffect(() => {
    console.log("WalletButton Debug State:", {
      isAuthenticated,
      connected,
      account: account
        ? `${account.substring(0, 6)}...${account.substring(
            account.length - 4
          )}`
        : null,
      isWalletConnected,
      isFullyConnected, // ✅ Add this
      userWalletAddress: user?.wallet_address,
      addressMatch:
        user?.wallet_address?.toLowerCase() === account?.toLowerCase(),
      fullAccount: account,
      fullUserWallet: user?.wallet_address,
    });
  }, [isAuthenticated, connected, account, isWalletConnected, user, isFullyConnected]);

  // Handle the wallet connection process
  const handleConnectWallet = async () => {
    console.log("🔄 WalletButton: Connect wallet clicked");

    if (!isAuthenticated) {
      console.log("❌ User not authenticated");
      toast.error("Please log in first to connect your wallet");
      return;
    }

    try {
      // Step 1: Connect to MetaMask first if not connected
      if (!connected) {
        console.log("Step 1: Connecting to MetaMask...");
        const success = await web3ConnectWallet();
        if (!success) {
          console.log("❌ MetaMask connection failed");
          return;
        }
        console.log("✅ MetaMask connected successfully");

        // Wait for the account state to update
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      // Step 2: Get current account from multiple sources
      let currentAccount = account;

      if (!currentAccount && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({
            method: "eth_accounts",
          });
          currentAccount = accounts[0];
          console.log("🔍 Got account directly from MetaMask:", currentAccount);
        } catch (error) {
          console.warn("Failed to get accounts from MetaMask:", error);
        }
      }

      if (!currentAccount) {
        console.log("❌ No account available after MetaMask connection");
        toast.error("Failed to get wallet account. Please try again.");
        return;
      }

      console.log("Step 2: Linking wallet to account:", currentAccount);

      // Step 3: Link wallet to user account - PASS THE ACCOUNT DIRECTLY
      const result = await authConnectWallet(currentAccount);

      if (result && !result.error) {
        console.log("✅ Wallet linked to account successfully");
        toast.success("Wallet connected and linked successfully!");
      } else {
        console.log("❌ Wallet linking failed:", result?.error);
        toast.error(
          "Failed to link wallet: " + (result?.error || "Unknown error")
        );
      }
    } catch (error) {
      console.error("❌ Error in wallet connection flow:", error);
      toast.error("Failed to connect wallet: " + error.message);
    }
  };

  const handleDisconnect = () => {
    console.log("🔄 Disconnecting wallet...");
    disconnectWallet();
  };

  // Don't show if user is not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // ✅ User is authenticated and wallet is fully connected and linked
  if (isFullyConnected) {
    return (
      <div className="flex items-center space-x-1">
        {/* <div className="hidden sm:flex items-center space-x-2">
          {isCorrectNetwork ? (
            <div className="flex items-center space-x-1 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs">Sepolia</span>
            </div>
          ) : (
            <button
              onClick={switchToSepolia}
              className="flex items-center space-x-1 text-orange-600 hover:text-orange-700"
            >
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs">Wrong Network</span>
            </button>
          )}
        </div> */}

        {/* Connected Wallet Info with Refresh Button */}
        <div className="flex items-center space-x-2 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <div className="flex flex-col">
            <span className="text-xs text-gray-700 font-medium">
              {account.substring(0, 6)}...
              {account.substring(account.length - 4)}
            </span>
            <span className="text-xs text-gray-500">
              {balance && balance !== "0" ? `${balance} ETH` : "Loading..."}
            </span>
          </div>
          <button
            onClick={refreshBalance}
            className="text-xs text-blue-600 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
            title="Refresh balance"
          >
            🔄
          </button>
        </div>

        {/* Disconnect Button */}
        <button
          onClick={handleDisconnect}
          className="px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  // User is authenticated but wallet not fully connected/linked yet
  return (
    <div className="flex items-center space-x-2">
      {/* Show current status if wallet is connected to MetaMask but not linked to account */}
      {connected && account && user?.wallet_address !== account && (
        <div className="flex items-center space-x-2 bg-yellow-50 border border-yellow-200 px-3 py-2 rounded-lg">
          <AlertCircle className="w-4 h-4 text-yellow-600" />
          <div className="flex flex-col">
            <span className="text-xs text-gray-700">
              {account.substring(0, 6)}...
              {account.substring(account.length - 4)}
            </span>
            <span className="text-xs text-yellow-600">Not Linked</span>
          </div>
        </div>
      )}

      <Button
        onClick={handleConnectWallet}
        disabled={connecting || loading}
        variant="contained"
        color="primary"
        startIcon={
          connected && !user?.wallet_address ? <LinkIcon /> : <Wallet />
        }
        size="small"
      >
        {connecting
          ? "Connecting..."
          : loading
          ? "Linking..."
          : connected && !user?.wallet_address
          ? "Link Wallet"
          : "Connect Wallet"}
      </Button>
    </div>
  );
};

export default WalletButton;