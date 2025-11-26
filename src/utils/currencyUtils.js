// Currency conversion utilities
export class CurrencyConverter {
  static ethToUsdRate = 2700; // Example rate - you should get this from an API
  
  static ethToUsd(ethAmount) {
    return parseFloat(ethAmount) * this.ethToUsdRate;
  }
  
  static usdToEth(usdAmount) {
    return parseFloat(usdAmount) / this.ethToUsdRate;
  }
  
  static formatEth(ethAmount) {
    return `${parseFloat(ethAmount).toFixed(4)} ETH`;
  }
  
  static formatUsd(usdAmount) {
    return `$${parseFloat(usdAmount).toFixed(2)}`;
  }
  
  static formatDual(ethAmount) {
    const usdAmount = this.ethToUsd(ethAmount);
    return `${this.formatEth(ethAmount)} (${this.formatUsd(usdAmount)})`;
  }
}

// User identification utilities
export class UserIdentifier {
  static getUserIdentifier(user) {
    // For PayPal users, use user ID; for crypto users, use wallet address
    if (user?.user_id && !user?.wallet_address) {
      return user.user_id; // PayPal user
    }
    return user?.wallet_address; // Crypto user
  }
  
  static isPayPalUser(user) {
    return user?.user_id && !user?.wallet_address;
  }
  
  static isCryptoUser(user) {
    return !!user?.wallet_address;
  }
}
