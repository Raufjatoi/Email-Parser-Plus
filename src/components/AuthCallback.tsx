import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { handleOAuthCallback } from '@/lib/emailService';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const [status, setStatus] = useState('Processing authentication...');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const processAuth = async () => {
      try {
        // Get the authorization code from URL
        const urlParams = new URLSearchParams(location.search);
        const code = urlParams.get('code');
        
        if (!code) {
          setError('No authorization code received');
          return;
        }
        
        // Exchange code for access token
        setStatus('Exchanging authorization code for access token...');
        await handleOAuthCallback(code);
        
        setStatus('Authentication successful! Redirecting...');
        
        // Redirect back to the main page with state
        setTimeout(() => {
          navigate('/', { 
            state: { authenticated: true },
            replace: true 
          });
        }, 1500);
      } catch (error) {
        console.error('Authentication error:', error);
        setError('Authentication failed. Please try again.');
      }
    };
    
    processAuth();
  }, [location, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Gmail Authentication</h2>
            
            {error ? (
              <>
                <p className="text-red-500 mb-4">{error}</p>
                <button 
                  onClick={() => navigate('/')}
                  className="px-4 py-2 bg-primary text-white rounded-md"
                >
                  Return to Home
                </button>
              </>
            ) : (
              <>
                <div className="flex justify-center mb-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
                <p className="text-gray-600">{status}</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthCallback;

