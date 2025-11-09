import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const PayPalOnboardSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { connectPayPal } = useAuth();
  
  useEffect(() => {
    const handleOnboardingComplete = async () => {
      const merchantId = searchParams.get('merchantIdInPayPal') || searchParams.get('merchant_id');
      
      if (merchantId) {
        // Connect the PayPal account
        const result = await connectPayPal(merchantId);
        
        if (result && !result.error) {
          toast.success('PayPal account connected successfully!');
          // Redirect to dashboard after 2 seconds
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        } else {
          toast.error('Failed to link PayPal account');
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        }
      }
    };

    handleOnboardingComplete();
  }, [searchParams, connectPayPal, navigate]);
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <div className="flex justify-center mb-6">
          <CheckCircle className="w-16 h-16 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          PayPal Connected Successfully!
        </h2>
        <p className="text-gray-600 mb-6">
          Your PayPal account has been linked. Redirecting...
        </p>
      </div>
    </div>
  );
};

export default PayPalOnboardSuccess;