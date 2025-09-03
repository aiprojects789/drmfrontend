import React, { useEffect } from 'react';
import { Wallet, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from "@mui/material";
import { useWeb3 } from '../context/Web3Context';
import { useAuth } from '../context/AuthContext';

const WalletButton = () => {
  const { 
    connected, 
    connecting, 
    account, 
    balance, 
    networkName, 
    connectWallet, 
    disconnectWallet,
    isCorrectNetwork,
    switchToSepolia 
  } = useWeb3();

  const { logout } = useAuth();

  // 👇 MetaMask detection check
  useEffect(() => {
    if (typeof window.ethereum !== "undefined") {
      console.log("✅ MetaMask detected:", window.ethereum);
      console.log("isMetaMask:", window.ethereum.isMetaMask);
    } else {
      console.log("❌ MetaMask not installed");
    }
  }, []);

 
const handleDisconnect = () => {
  disconnectWallet();  // 👈 Web3 se bhi disconnect
  logout();            // 👈 Auth se bhi logout
};

  if (connected && account) {
    return (
      <div className="flex items-center space-x-2">
        {/* Network Status */}
        <div className="hidden sm:flex items-center space-x-2">
          {isCorrectNetwork ? (
            <div className="flex items-center space-x-1 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs">{networkName}</span>
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
        </div>

        {/* Wallet Info */}
        <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-lg">
          <Wallet className="w-4 h-4 text-purple-600" />
          <div className="flex flex-col">
            <span className="text-xs text-gray-600">
              {account.substring(0, 6)}...{account.substring(account.length - 4)}
            </span>
            <span className="text-xs text-gray-500">{balance} ETH</span>
          </div>
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

  return (
    <Button
      onClick={connectWallet}
      disabled={connecting}
      variant="contained"
      color="primary"
      startIcon={<Wallet />}
      size="small"
    >
      {connecting ? "Connecting..." : "Connect Wallet"}
    </Button>
  );
};

export default WalletButton;
