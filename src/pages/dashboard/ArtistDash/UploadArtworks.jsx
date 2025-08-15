import React, { useState, useEffect } from 'react';
import { Upload, ChevronDown, X } from 'lucide-react';
import * as blazeface from '@tensorflow-models/blazeface';
import * as tf from '@tensorflow/tfjs';
import { Button, Input, InputLabel } from '@mui/material';

const UploadArtworks= () => {
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
const loyaltyPercentage=[
  {
    id:1,
    percentage: '5%'
  },
  {
    id:2,
    percentage: '10%'
  },
  {
    id:3,
    percentage: '15%'
  },
  {
    id:4,
    percentage: '20%'
  },
  {
    id:5,
    percentage: '25%'
  },
  {
    id:6,
    percentage: '30%'
  },
]
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedLicense, setSelectedLicense] = useState(licenseTermsOptions[0].id);
  const [selectedLoyalty, setSelectedLoyalty] = useState(loyaltyPercentage[1].id);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [currentStep, setCurrentStep] = useState('upload');
  const [model, setModel] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadModel = async () => {
      await tf.ready();
      const loadedModel = await blazeface.load();
      setModel(loadedModel);
    };
    loadModel();
  }, []);

 

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
            } else {
              setUploadedFile(file);
              setPreviewUrl(reader.result);
            }
          } catch (err) {
            setError('Error analyzing image. Please try again.');
            setUploadedFile(null);
            setPreviewUrl(null);
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
            } else {
              setUploadedFile(file);
              setPreviewUrl(reader.result );
            }
          } catch (err) {
            setError('Error analyzing image. Please try again.');
            setUploadedFile(null);
            setPreviewUrl(null);
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
  };

  const handleUpload = () => {
    setIsUploading(true);
    
    // Simulate upload progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setUploadProgress(progress);
      
      if (progress >= 100) {
        clearInterval(interval);
        setIsUploading(false);
        setCurrentStep('details');
      }
    }, 500);
  };

  const handleDetailsSubmit = (e) => {
    e.preventDefault();
    setCurrentStep('blockchain');
    
    // Simulate blockchain registration
    setTimeout(() => {
      setCurrentStep('complete');
    }, 3000);
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

      {uploadedFile && !isUploading && (
        <div className="mt-6">
          <Button 
            variant="contained" color="secondary" 
            onClick={handleUpload}
            fullWidth
          className='!font-bold'

          >
            Continue to Details
          </Button>
        </div>
      )}

      {isUploading && (
        <div className="mt-6">
          <div className="text-sm text-gray-600 mb-2">
            Uploading... {uploadProgress}%
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-purple-800 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );

  const renderDetailsStep = () => (
    <form onSubmit={handleDetailsSubmit} className="mt-6 space-y-6">
      <div>
      <InputLabel htmlFor="title">Artwork Title</InputLabel>
        <Input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          fullWidth
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          id="description"
          rows={4}
          className="shadow-sm focus:ring-purple-500 focus:border-purple-500 block w-full sm:text-sm border-gray-300 rounded-md"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor="license" className="block text-sm font-medium text-gray-700 mb-1">
          License Terms
        </label>
        <div className="relative">
          <select
            id="license"
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
            value={selectedLicense}
            onChange={(e) => setSelectedLicense(e.target.value)}
            required
          >
            {licenseTermsOptions.map((license) => (
              <option key={license.id} value={license.id}>
                {license.name} - ${license.price}
              </option>
            ))}
          </select>
          
        </div>
        <p className="mt-2 text-sm text-gray-500">
          {licenseTermsOptions.find(l => l.id === selectedLicense)?.description}
        </p>
      </div>
      <div>
        <label htmlFor="loyalty" className="block text-sm font-medium text-gray-700 mb-1">
Loyalty & Percentage        </label>
        <div className="relative">
          <select
            id="loyalty"
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
            value={selectedLoyalty}
            onChange={(e) => setSelectedLicense(e.target.value)}
            required
          >
            {loyaltyPercentage.map((license) => (
              <option key={license.id} value={license.id}>
                {license.percentage}
              </option>
            ))}
          </select>
          
        </div>
        
      </div>

      

      <div>
        <Button
          type="submit"
          variant="contained" color="secondary"
          fullWidth
          className='!font-bold'

        >
          Register Your Artwork
        </Button>
      </div>
    </form>
  );

  const renderBlockchainStep = () => (
    <div className="mt-8 text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-800 mx-auto"></div>
      <h3 className="mt-6 text-lg font-medium text-gray-900">Registering your artwork </h3>
     
      <div className="mt-6 flex justify-center space-x-4">
        <div className="text-center">
          <div className="flex items-center justify-center w-8 h-8 mx-auto rounded-full bg-green-100 text-green-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="mt-1 text-xs text-gray-500">Upload</p>
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
        {title || "Your artwork"} has been registered!
      </h3>
      <p className="mt-2 text-sm text-gray-500">
        Your artwork is now  ready to be licensed
      </p>
    
      <div className="mt-6 flex space-x-4">
        <Button
          variant="outlined" color="secondary"
          fullWidth
          onClick={() => setCurrentStep('upload')}
          className='!font-bold'
        >
          Upload Another
        </Button>
        <Button
          variant="contained" color="secondary"
          fullWidth
          onClick={() => window.location.href = '/dashboard/artworks'}
          className='!font-bold !ms-2'
        >
          View My Artworks
        </Button>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Upload Artwork</h1>
        <p className="mt-1 text-sm text-gray-500">
          Register your digital creation on the blockchain to protect your ownership
        </p>
        <p className="mt-1 text-sm text-red-500">
          *Note: Please do not upload artworks containing living beings or cartoons. It will be rejected while uploading or may be by admin later.
        </p>

      </div>

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