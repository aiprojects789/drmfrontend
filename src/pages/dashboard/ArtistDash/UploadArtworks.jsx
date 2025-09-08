import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Upload, ChevronDown, X, AlertCircle, Palette, Percent } from 'lucide-react';
import * as blazeface from '@tensorflow-models/blazeface';
import * as tf from '@tensorflow/tfjs';
import { Button, Input, InputLabel } from '@mui/material';
import { useWeb3 } from '../../../context/Web3Context';
import { useAuth } from '../../../context/AuthContext';
import { artworksAPI } from '../../../services/api';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import imageCompression from 'browser-image-compression';

// Validation schema
const schema = yup.object({
  title: yup.string().required('Title is required').max(100, 'Title too long'),
  description: yup.string().max(1000, 'Description too long'),
  royalty_percentage: yup
    .number()
    .required('Royalty percentage is required')
    .min(0, 'Royalty cannot be negative')
    .max(2000, 'Royalty cannot exceed 20% (2000 basis points)')
    .integer('Royalty must be a whole number'),
  price: yup
    .number()
    .required('Price is required')
    .min(0, 'Price cannot be negative'),
  image: yup
    .mixed()
    .required('Image is required')
    .test('fileSize', 'File too large (max 5MB)', value => {
      if (!value) return false;
      return value.size <= 5 * 1024 * 1024; // 5MB limit
    })
    .test('fileType', 'Unsupported file type', value => {
      if (!value) return false;
      return ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(value.type);
    })
    .test('dimensions', 'Image dimensions too large', async (value) => {
      if (!value) return false;
      
      // Check image dimensions
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = function() {
          // Max 4000px on longest side
          resolve(Math.max(this.width, this.height) <= 4000);
        };
        img.onerror = function() {
          resolve(false);
        };
        img.src = URL.createObjectURL(value);
      });
    })
});

const UploadArtworks = () => {
  const navigate = useNavigate();
  const { account, sendTransaction, isCorrectNetwork } = useWeb3();
  const { isAuthenticated, isWalletConnected } = useAuth();

  
  const licenseTermsOptions = [
    {
      id: 'license-1',
      name: 'Standard License',
      description: 'Use for personal and small business purposes',
      price: 50,
      duration: 365,
      rights: ['Print', 'Digital display', 'No commercial use']
    },
    {
      id: 'license-2',
      name: 'Commercial License',
      description: 'Full commercial usage rights',
      price: 200,
      duration: 730,
      rights: ['Print', 'Digital display', 'Commercial use', 'Merchandise']
    },
    {
      id: 'license-3',
      name: 'Enterprise License',
      description: 'Unlimited usage rights for large organizations',
      price: 500,
      duration: 0, // perpetual
      rights: ['Print', 'Digital display', 'Commercial use', 'Merchandise', 'Resale', 'Sublicensing']
    }
  ];

  const loyaltyPercentage = [
    { id: 1, percentage: '5%', value: 500 },
    { id: 2, percentage: '10%', value: 1000 },
    { id: 3, percentage: '15%', value: 1500 },
    { id: 4, percentage: '20%', value: 2000 },
    { id: 5, percentage: '25%', value: 2500 },
    { id: 6, percentage: '30%', value: 3000 }
  ];

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionHash, setTransactionHash] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [backendStatus, setBackendStatus] = useState(null);
  const [balanceCheck, setBalanceCheck] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [currentStep, setCurrentStep] = useState('upload');
  const [model, setModel] = useState(null);
  const [error, setError] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [selectedLicense, setSelectedLicense] = useState(licenseTermsOptions[0].id);
  const [selectedLoyalty, setSelectedLoyalty] = useState(loyaltyPercentage[1].id);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    setValue,
    trigger
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      royalty_percentage: 1000,
      price: '',
      image: null
    }
  });

  const image = watch('image');

  // Load TensorFlow model
  useEffect(() => {
    const loadModel = async () => {
      await tf.ready();
      const loadedModel = await blazeface.load();
      setModel(loadedModel);
    };
    loadModel();
  }, []);

  // Check backend status and wallet balance on component mount
  useEffect(() => {
    const checkBackendStatus = async () => {
      if (!account) return;
      
      try {
        const statusResponse = await artworksAPI.getBackendStatus();
        setBackendStatus(statusResponse);
        
        const balanceResponse = await artworksAPI.getWalletBalance(account);
        setBalanceCheck(balanceResponse);
      } catch (error) {
        console.error('Failed to check backend status:', error);
        setBackendStatus({ 
          status: 'error', 
          message: 'Cannot connect to backend API' 
        });
      }
    };

    if (account && isAuthenticated) {
      checkBackendStatus();
    }
  }, [account, isAuthenticated]);

  // Generate preview when image changes
  useEffect(() => {
    if (image && image instanceof File) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(image);
    } else {
      setPreviewUrl(null);
    }
  }, [image]);

  const compressImage = async (file) => {
    const options = {
      maxSizeMB: 2, // Maximum file size in MB
      maxWidthOrHeight: 2000, // Maximum width or height
      useWebWorker: true,
      fileType: 'image/jpeg', // Convert to JPEG for better compression
    };

    try {
      const compressedFile = await imageCompression(file, options);
      return compressedFile;
    } catch (error) {
      console.error('Image compression failed:', error);
      throw new Error('Failed to compress image');
    }
  };

  const validateTransactionData = (txData) => {
    if (!txData) return ['Transaction data is null or undefined'];
    
    const errors = [];
    if (!txData.to || txData.to === '0x0000000000000000000000000000000000000000') {
      errors.push('Invalid contract address');
    }
    if (!txData.data || txData.data === '0x') {
      errors.push('Invalid transaction data');
    }
    return errors;
  };

  const handleRegistrationError = (error) => {
    console.error('Registration error:', error);
    
    if (error.message.includes('timeout')) {
      toast.error('Transaction is taking longer than expected. It may still be processing.');
    }
    else if (error.message.includes('DEMO MODE')) {
      toast.error('Backend Configuration Error', { duration: 10000 });
    } 
    else if (error.message.includes('missing revert data') || error.code === 'CALL_EXCEPTION') {
      toast.error('Smart Contract Error: Contract may not be deployed correctly', { duration: 8000 });
    }
    else if (error.message.includes('Network Error') || error.message.includes('CONNECTION_ERROR')) {
      toast.error('Network connection issue - check if backend can reach Sepolia RPC');
    }
    else if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
      toast.error('Cannot connect to backend server');
    } 
    else if (error.response?.status === 404) {
      toast.error('API endpoint not found');
    } 
    else if (error.response?.status === 500) {
      toast.error('Backend server error - check server logs');
    } 
    else if (error.code === 4001) {
      toast.error('Transaction cancelled by user');
    } 
    else if (error.message.includes('insufficient funds')) {
      toast.error('Insufficient funds for gas fees');
    }
    else if (error.message.includes('nonce')) {
      toast.error('Transaction sequence error. Please try again in a moment.');
    }
    else if (error.response?.data?.detail) {
      toast.error(`API error: ${error.response.data.detail}`);
    } 
    else {
      toast.error(`${error.message || 'Registration failed'}`);
    }
  };

  const checkForLivingBeings = async (imageElement) => {
    try {
      const model = await blazeface.load();
      const predictions = await model.estimateFaces(imageElement, false);
  
      console.log('BlazeFace predictions:', predictions);
  
      // Check if any faces were detected
      if (predictions.length > 0) {
        console.log('Face(s) detected. Upload blocked.');
        return true; // Detected human face, treat as living being
      } else {
        console.log('No face detected. Upload allowed.');
        return false; // No human detected
      }
    } catch (error) {
      console.error('Error checking for living beings:', error);
      return false; // Fail open if error
    }
  };

  const handleFileChange = async (e) => {
    setError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = async () => {
        // Create an image element for TensorFlow.js
        const img = new Image();
        img.src = reader.result;
        img.onload = async () => {
          try {
            const containsLivingBeings = await checkForLivingBeings(img);
            if (containsLivingBeings) {
              setError('Images containing living beings are not allowed.');
              setUploadedFile(null);
              setPreviewUrl(null);
              setValue('image', null);
            } else {
              setUploadedFile(file);
              setPreviewUrl(reader.result);
              setValue('image', file, { shouldValidate: true });
            }
          } catch (err) {
            setError('Error analyzing image. Please try again.');
            setUploadedFile(null);
            setPreviewUrl(null);
            setValue('image', null);
          }
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setError(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = async () => {
        // Create an image element for TensorFlow.js
        const img = new Image();
        img.src = reader.result;
        img.onload = async () => {
          try {
            const containsLivingBeings = await checkForLivingBeings(img);
            if (containsLivingBeings) {
              setError('Images containing living beings are not allowed.');
              setUploadedFile(null);
              setPreviewUrl(null);
              setValue('image', null);
            } else {
              setUploadedFile(file);
              setPreviewUrl(reader.result);
              setValue('image', file, { shouldValidate: true });
            }
          } catch (err) {
            setError('Error analyzing image. Please try again.');
            setUploadedFile(null);
            setPreviewUrl(null);
            setValue('image', null);
          }
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setPreviewUrl(null);
    setError(null);
    setValue('image', null);
  };

  const handleUpload = async () => {
    // Validate the image field
    const isValid = await trigger('image');
    if (isValid) {
      setCurrentStep('details');
    }
  };

  const onSubmit = async (data) => {
    if (!isCorrectNetwork || !account) {
      toast.error(!isCorrectNetwork 
        ? 'Please switch to Sepolia testnet first' 
        : 'Wallet not connected');
      return;
    }

    setIsSubmitting(true);
    setDebugInfo(null);
    
    try {
      // Compress image before upload
      const compressedImage = await compressImage(data.image);
      
      // Create FormData with compressed image
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('description', data.description || '');
      formData.append('royalty_percentage', data.royalty_percentage.toString());
      formData.append('price', data.price.toString());
      formData.append('license_type', selectedLicense);
      formData.append('image', compressedImage, data.image.name);

      // Phase 1: Prepare registration with image upload
      const prepToast = toast.loading('Uploading image and preparing registration...');
      const preparation = await artworksAPI.registerWithImage(formData);
      toast.dismiss(prepToast);

      setDebugInfo({
        step: 'preparation',
        data: preparation,
        request_data: {
          title: data.title,
          description: data.description,
          royalty_percentage: data.royalty_percentage,
          price: data.price,
          license_type: selectedLicense,
          account: account
        }
      });

      if (!preparation.transaction_data) {
        throw new Error('Backend did not return transaction data');
      }

      // Validate transaction data
      const validationErrors = validateTransactionData(preparation.transaction_data);
      if (validationErrors.length > 0) {
        throw new Error(`Invalid transaction data: ${validationErrors.join(', ')}`);
      }

      // Check for demo mode addresses
      if (preparation.transaction_data.to && preparation.transaction_data.to.startsWith('0x1234567890')) {
        throw new Error('Backend is in demo mode - check contract configuration');
      }

      setCurrentStep('blockchain');

      // Phase 2: Send transaction with longer timeout
      const txToast = toast.loading('Sending transaction... (This may take 1-2 minutes on testnet)');
      const txResponse = await sendTransaction({
        ...preparation.transaction_data,
        from: account,
        gas: 500000 // Higher gas for registration
      });
      toast.dismiss(txToast);

      // Phase 3: Confirm registration (non-blocking)
      const finalizingToast = toast.loading('Finalizing registration...');
      try {
        const confirmation = await artworksAPI.confirmRegistration({
          tx_hash: txResponse.hash,
          from_address: account,
          metadata_uri: preparation.metadata_uri,
          royalty_percentage: data.royalty_percentage,
          title: data.title,
          description: data.description,
          price: data.price,
          license_type: selectedLicense
        });

        if (!confirmation.success) {
          console.warn('Registration confirmation had issues:', confirmation);
        }
        
        toast.dismiss(finalizingToast);
        
      } catch (confirmError) {
        console.warn('Registration confirmation failed, but transaction was successful:', confirmError);
        toast.dismiss(finalizingToast);
        // Non-critical error, continue
      }

      // Success
      setTransactionHash(txResponse.hash);
      toast.success('Artwork registration submitted to blockchain!');
      reset();
      setCurrentStep('complete');
      
    } catch (error) {
      toast.dismiss();
      handleRegistrationError(error);
      setCurrentStep('details');
    } finally {
      setIsSubmitting(false);
    }
  };

  const StatusIndicator = ({ title, message, type = 'info' }) => {
    const colors = {
      success: 'bg-green-50 border-green-200 text-green-800',
      error: 'bg-red-50 border-red-200 text-red-800',
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      info: 'bg-blue-50 border-blue-200 text-blue-800'
    };

    return (
      <div className={`p-4 rounded-lg border ${colors[type]} mb-4`}>
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          <h4 className="font-semibold">{title}</h4>
        </div>
        <p className="text-sm mt-1">{message}</p>
      </div>
    );
  };

  const renderUploadStep = () => (
    <div className="mt-6">
      <div
        className={`
          border-2 border-dashed rounded-lg p-12 text-center
          ${uploadedFile ? 'border-purple-800' : 'border-gray-300 hover:border-gray-400'}
          transition-colors duration-200
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {!uploadedFile ? (
          <div>
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4 flex text-sm text-gray-600 justify-center">
              <label
                htmlFor="file-upload"
                className="relative cursor-pointer rounded-md font-medium text-purple-800 hover:text-purple-700 focus-within:outline-none"
              >
                <span>Upload a file</span>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  className="sr-only"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-purple-500 mt-2">
              PNG, JPG, GIF up to 10MB (No images containing living beings)
            </p>
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
            {errors.image && (
              <p className="mt-2 text-sm text-red-600">{errors.image.message}</p>
            )}
          </div>
        ) : (
          <div>
            <div className="relative mx-auto w-64 h-64 mb-4">
              <img
                src={previewUrl || ''}
                alt="Preview"
                className="w-full h-full object-contain rounded"
              />
              <button
                type="button"
                className="absolute top-0 right-0 -mt-2 -mr-2 bg-red-600 rounded-full p-1 text-white shadow-sm hover:bg-red-700 focus:outline-none"
                onClick={handleRemoveFile}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-gray-600">{uploadedFile.name}</p>
            <p className="text-xs text-gray-500 mt-1">
              {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        )}
      </div>

      {uploadedFile && (
        <div className="mt-6">
          <Button 
            variant="contained" 
            color="secondary" 
            onClick={handleUpload}
            fullWidth
            className='!font-bold'
          >
            Continue to Details
          </Button>
        </div>
      )}
    </div>
  );

  const renderDetailsStep = () => (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6">
      <div>
        <InputLabel htmlFor="title">Artwork Title *</InputLabel>
        <Input
          id="title"
          type="text"
          {...register('title')}
          error={!!errors.title}
          fullWidth
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
        )}
      </div>

      <div>
        <InputLabel htmlFor="description">Description</InputLabel>
        <textarea
          id="description"
          rows={4}
          className="shadow-sm focus:ring-purple-500 focus:border-purple-500 block w-full sm:text-sm border-gray-300 rounded-md"
          {...register('description')}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      <div>
        <InputLabel htmlFor="price">Price (ETH) *</InputLabel>
        <Input
          id="price"
          type="number"
          step="0.001"
          {...register('price')}
          error={!!errors.price}
          fullWidth
        />
        {errors.price && (
          <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
        )}
      </div>

      <div>
        <InputLabel htmlFor="royalty_percentage">Royalty Percentage *</InputLabel>
        <select
          id="royalty_percentage"
          className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
          {...register('royalty_percentage')}
        >
          {loyaltyPercentage.map((option) => (
            <option key={option.id} value={option.value}>
              {option.percentage}
            </option>
          ))}
        </select>
        {errors.royalty_percentage && (
          <p className="mt-1 text-sm text-red-600">{errors.royalty_percentage.message}</p>
        )}
      </div>

      {/* <div>
        <InputLabel htmlFor="license">License Terms</InputLabel>
        <select
          id="license"
          className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
          value={selectedLicense}
          onChange={(e) => setSelectedLicense(e.target.value)}
        >
          {licenseTermsOptions.map((license) => (
            <option key={license.id} value={license.id}>
              {license.name} - ${license.price}
            </option>
          ))}
        </select>
        <p className="mt-2 text-sm text-gray-500">
          {licenseTermsOptions.find(l => l.id === selectedLicense)?.description}
        </p>
      </div> */}

      <Button
        type="submit"
        variant="contained" 
        color="secondary"
        fullWidth
        className='!font-bold'
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <div className="flex items-center justify-center">
            <LoadingSpinner size="small" text="" />
            <span className="ml-2">Registering...</span>
          </div>
        ) : (
          'Register Your Artwork'
        )}
      </Button>
    </form>
  );

  const renderBlockchainStep = () => (
    <div className="mt-8 text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-800 mx-auto"></div>
      <h3 className="mt-6 text-lg font-medium text-gray-900">Registering your artwork on blockchain</h3>
      <p className="mt-2 text-sm text-gray-500">This may take a few moments...</p>
      
      <div className="mt-6 flex justify-center space-x-4">
        <div className="text-center">
          <div className="flex items-center justify-center w-8 h-8 mx-auto rounded-full bg-green-100 text-green-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="mt-1 text-xs text-gray-500">Upload</p>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center w-8 h-8 mx-auto rounded-full bg-green-100 text-green-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="mt-1 text-xs text-gray-500">Details</p>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center w-8 h-8 mx-auto rounded-full bg-purple-100 text-purple-600">
            <span className="text-sm font-bold">3</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">Register</p>
        </div>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="mt-8 text-center">
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
        <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 className="mt-6 text-lg font-medium text-gray-900">
        Artwork has been registered!
      </h3>
      <p className="mt-2 text-sm text-gray-500">
        Your artwork is now on the blockchain and ready to be licensed
      </p>
      
      {transactionHash && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">Transaction Hash:</p>
          <p className="text-xs font-mono text-gray-800 break-all">
            {transactionHash}
          </p>
        </div>
      )}
    
      <div className="mt-6 flex space-x-4">
        <Button
          variant="outlined" 
          color="secondary"
          fullWidth
          onClick={() => {
            setCurrentStep('upload');
            reset();
            setUploadedFile(null);
            setPreviewUrl(null);
          }}
          className='!font-bold'
        >
          Upload Another
        </Button>
        <Button
          variant="contained" 
          color="secondary"
          fullWidth
          onClick={() => navigate('/dashboard/artworks')}
          className='!font-bold !ms-2'
        >
          View My Artworks
        </Button>
      </div>
    </div>
  );

  if (isAuthenticated && !isWalletConnected) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center bg-yellow-50 border border-yellow-200 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Wallet Connection Required
          </h2>
          <p className="text-gray-600 mb-6">
            Please connect your MetaMask wallet to register artworks.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Upload Artwork</h1>
        <p className="mt-1 text-sm text-gray-500">
          Register your digital creation on the blockchain to protect your ownership
        </p>
        <p className="mt-1 text-sm text-red-500">
          *Note: Please do not upload artworks containing living beings or cartoons. It will be rejected while uploading or may be by admin later.
        </p>
      </div>

      {/* Status Indicators */}
      {/* <div className="mb-8 space-y-4">
        {backendStatus && (
          <StatusIndicator
            title="Backend Status"
            message={backendStatus.message}
            type={backendStatus.status === 'success' ? 'success' : 'error'}
          />
        )}

        {balanceCheck && (
          <StatusIndicator
            title="Wallet Balance"
            message={balanceCheck.sufficient_balance ? 
              `Sufficient balance: ${balanceCheck.balance_eth} ETH` :
              `Insufficient balance: ${balanceCheck.balance_eth} ETH`}
            type={balanceCheck.sufficient_balance ? 'success' : 'error'}
          />
        )}

        {!isCorrectNetwork && (
          <StatusIndicator
            title="Network Error"
            message="Please switch to Sepolia testnet"
            type="error"
          />
        )}
      </div> */}

      {debugInfo && (
        <div className="mb-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Debug Information
          </h3>
          <pre className="text-xs text-gray-600 overflow-auto max-h-64 bg-white p-4 rounded border">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200">
          <nav className="flex justify-between">
            <button
              type="button"
              className={`text-sm font-medium ${
                currentStep === 'upload' ? 'text-purple-800' : 'text-gray-500'
              }`}
              disabled={true}
            >
              <span className={`rounded-full w-8 h-8 inline-flex items-center justify-center mr-2 ${
                currentStep === 'upload' ? 'bg-purple-800 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                1
              </span>
              Upload
            </button>
            <div className="hidden sm:block w-10 h-0.5 self-center bg-gray-200"></div>
            <button
              type="button"
              className={`text-sm font-medium ${
                currentStep === 'details' ? 'text-purple-800' : 'text-gray-500'
              }`}
              disabled={true}
            >
              <span className={`rounded-full w-8 h-8 inline-flex items-center justify-center mr-2 ${
                currentStep === 'details' ? 'bg-purple-800 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                2
              </span>
              Details
            </button>
            <div className="hidden sm:block w-10 h-0.5 self-center bg-gray-200"></div>
            <button
              type="button"
              className={`text-sm font-medium ${
                currentStep === 'blockchain' || currentStep === 'complete' ? 'text-purple-800' : 'text-gray-500'
              }`}
              disabled={true}
            >
              <span className={`rounded-full w-8 h-8 inline-flex items-center justify-center mr-2 ${
                currentStep === 'blockchain' || currentStep === 'complete' ? 'bg-purple-800 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                3
              </span>
              Register
            </button>
          </nav>
        </div>

        <div className="px-6 py-6">
          {currentStep === 'upload' && renderUploadStep()}
          {currentStep === 'details' && renderDetailsStep()}
          {currentStep === 'blockchain' && renderBlockchainStep()}
          {currentStep === 'complete' && renderCompleteStep()}
        </div>
      </div>
    </div>
  );
};

export default UploadArtworks;