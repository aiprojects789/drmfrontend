import React, { useEffect, useRef } from 'react';

const GoogleLoginButton = ({ onSuccess, onError, text = "Continue with Google" }) => {
  const buttonRef = useRef(null);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    
    if (!clientId) {
      console.error('❌ Google Client ID not configured');
      return;
    }

    // Load script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      if (window.google && buttonRef.current) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            try {
              if (response.credential) {
                await onSuccess(response.credential);
              }
            } catch (error) {
              if (onError) onError(error);
            }
          },
          use_fedcm_for_prompt: true,
        });

        // Render Google's native button
        window.google.accounts.id.renderButton(
          buttonRef.current,
          {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            width: buttonRef.current.offsetWidth,
          }
        );
      }
    };
    
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [onSuccess, onError]);

  return (
    <div 
      ref={buttonRef} 
      className="w-full"
      style={{ minHeight: '44px' }}
    />
  );
};

const handleCredentialResponse = async (response) => {
  console.log('📩 Credential response received');
  console.log('Token preview:', response.credential.substring(0, 50) + '...');
  setLoading(true);
  
  try {
    if (response.credential) {
      console.log('✅ Passing credential to app...');
      await onSuccess(response.credential);
    } else {
      throw new Error('No credential received from Google');
    }
  } catch (error) {
    console.error('❌ Google login error:', error);
    if (onError) {
      onError(error);
    }
  } finally {
    setLoading(false);
  }
};

export default GoogleLoginButton;