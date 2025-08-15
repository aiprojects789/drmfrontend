import React, { useState } from 'react';
import { DollarSign, ArrowRight, CreditCard, Wallet } from 'lucide-react';
import { Badge, Card,Button } from '@mui/material';


const Wallets= () => {
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  
  const transactions = [
    {
      id: 'tx1',
      type: 'license',
      amount: 50,
      date: '2023-11-15',
      description: 'License purchase for "ArtWork"',
      status: 'completed'
    },
    {
      id: 'tx2',
      type: 'withdrawal',
      amount: -100,
      date: '2023-11-10',
      description: 'Withdrawal to bank account',
      status: 'completed'
    },
    
  ];

  const handleWithdraw = () => {
    setIsWithdrawing(true);
    // Simulate withdrawal process
    setTimeout(() => {
      setIsWithdrawing(false);
    }, 2000);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Wallet & Royalties</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your earnings and withdraw funds
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Balance Card */}
        <div className="lg:col-span-2">
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">Available Balance</h2>
                  <p className="mt-1 text-sm text-gray-500">Ready to withdraw</p>
                </div>
                <div className="text-3xl font-bold text-gray-900">$350.00</div>
              </div>
              <div className="mt-6">
                <Button
                  color="secondary"
                  variant='contained'
                  onClick={handleWithdraw}
                  isLoading={isWithdrawing}
                  leftIcon={<DollarSign className="h-5 w-5" />}
                >
                  Withdraw Funds
                </Button>
              </div>
            </div>
          </Card>

          {/* Transaction History */}
          <div className="mt-6">
            <Card>
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Transaction History</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {transactions.map((tx) => (
                  <div key={tx.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`
                          p-2 rounded-full 
                          ${tx.type === 'license' ? 'bg-green-100' : 'bg-blue-100'}
                        `}>
                          {tx.type === 'license' ? (
                            <CreditCard className={`h-5 w-5 ${
                              tx.type === 'license' ? 'text-green-600' : 'text-blue-600'
                            }`} />
                          ) : (
                            <ArrowRight className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-900">{tx.description}</p>
                          <p className="text-sm text-gray-500">{tx.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span className={`text-sm font-medium ${
                          tx.amount > 0 ? 'text-green-600' : 'text-blue-600'
                        }`}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)} USD
                        </span>
                        <Badge
                          color="secondary"
                          size="sm"
                          className="mx-14 opacity-50"
                          badgeContent={tx.status}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Payment Methods */}
        <div>
          <Card>
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Payment Methods</h3>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Connected Wallet</h4>
                <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                  <Wallet className="h-5 w-5 text-gray-400" />
                  <div className="ml-3">
                   
                    <p className="text-xs text-gray-500">Ethereum</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Bank Account</h4>
                <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                  <CreditCard className="h-5 w-5 text-gray-400" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">
                      •••• •••• •••• 4242
                    </p>
                    <p className="text-xs text-gray-500">Connected Bank Account</p>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <Button
                  variant="outlined"
                  fullWidth
                  color='secondary'
                >
                  Add Payment Method
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Wallets;