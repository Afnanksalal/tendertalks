import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { initialize } = useAuthStore();
  const [status, setStatus] = useState('Processing...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        setStatus('Verifying authentication...');
        
        // Get the session from URL hash (OAuth callback)
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          navigate('/?error=auth_failed');
          return;
        }

        if (session?.user) {
          setStatus('Syncing your account...');
          
          // Re-initialize auth store to sync user to database
          await initialize();
          
          setStatus('Redirecting...');
          
          // Small delay to ensure state is updated
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 500);
        } else {
          // No session, might be email confirmation
          // Check URL for confirmation token
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          
          if (accessToken) {
            // This is an email confirmation, session should be set
            setStatus('Confirming email...');
            const { data, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError || !data.session) {
              navigate('/?error=confirmation_failed');
              return;
            }
            
            await initialize();
            navigate('/dashboard', { replace: true });
          } else {
            navigate('/');
          }
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/?error=auth_failed');
      }
    };

    handleCallback();
  }, [navigate, initialize]);

  return (
    <div className="min-h-screen bg-[#030014] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-10 h-10 text-neon-cyan animate-spin mx-auto mb-4" />
        <p className="text-slate-400">{status}</p>
      </div>
    </div>
  );
};
