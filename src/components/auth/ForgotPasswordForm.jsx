import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowLeft } from 'lucide-react';
import { Button, TextField, InputAdornment, Input } from '@mui/material';
import { baseURL } from '../../utils/backend_url';
import axios from 'axios';

const ForgotPasswordForm = ({ onBack }) => {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  const handleSubmitEmail = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const verifyEmail = new URLSearchParams();
    verifyEmail.append('email', email)
    try {
      await axios.post(`${baseURL}/api/v1/auth/forgot-password?email=${email}`)
        console.log("Successfully send code!");
        
      setStep('verify');
    } catch (err) {
      setError(err.detail);
      console.log(err);
      
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);

    try {
      // Simulate API call to verify code
      await axios.post(`${baseURL}/api/v1/auth/reset-password?token=${verificationCode}&new_password=${newPassword}`)
      // setStep('reset');
    } catch (err) {
      setError(err.detail);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      // Simulate API call to reset password
      await new Promise(resolve => setTimeout(resolve, 1000));
      onBack()
    } catch (err) {
      setError('Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl  shadow-lg w-full max-w-xl">
      <div className="max-w-md w-full space-y-8">
        <div>
          <p onClick={onBack} className="flex items-center text-sm text-purple-800 hover:text-purple-700 cursor-pointer">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Login
          </p>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {step === 'email' && 'Reset your password'}
            {step === 'verify' && 'Enter verification code'}
            {/* {step === 'reset' && 'Create new password'} */}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {step === 'email' && 'Enter your email address to receive a verification code'}
            {step === 'verify' && 'We sent a code to your email'}
            {/* {step === 'reset' && 'Choose a strong password for your account'} */}
          </p>
        </div>

        <div className="mt-8 bg-white py-8 px-4 shadow rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {step === 'email' && (
            <form className="space-y-6" onSubmit={handleSubmitEmail}>
              <TextField
                label="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Mail style={{ color: 'gray' }} />
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                type="submit"
                color="secondary"
                variant='contained'
                // isLoading={loading}
                fullWidth
                className='!my-5'
              >
                Send Verification Code
              </Button>
            </form>
          )}

          {step === 'verify' && (
            <form className="space-y-6" onSubmit={handleVerifyCode}>
              <Input
                placeholder="Verification Code"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                required
                fullWidth
                helpText="Enter the 6-digit code sent to your email"
              />
               <Input
                placeholder="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                leftIcon={<Lock className="h-5 w-5 text-gray-400" />}
                required
                fullWidth
                helpText="Password must be at least 8 characters"
              />
              <Input
                placeholder="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                leftIcon={<Lock className="h-5 w-5 text-gray-400" />}
                required
                fullWidth
              />
              <Button
                type="submit"
                color="secondary"
                variant='contained'
                isLoading={loading}
                fullWidth
                className='!my-5'
              >
                Reset Password
              </Button>
            </form>
          )}

          {/* {step === 'reset' && (
            <form className="space-y-6" onSubmit={handleResetPassword}>
              <Input
                placeholder="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                leftIcon={<Lock className="h-5 w-5 text-gray-400" />}
                required
                fullWidth
                helpText="Password must be at least 8 characters"
              />
              <Input
                placeholder="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                leftIcon={<Lock className="h-5 w-5 text-gray-400" />}
                required
                fullWidth
              />
              <Button
                type="submit"
                color="secondary"
                variant='contained'
                isLoading={loading}
                fullWidth
                className='!my-5'
              >
                Reset Password
              </Button>
            </form>
          )} */}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordForm;