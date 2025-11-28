import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useSettingsStore } from '../stores/settingsStore';
import { Loader2 } from 'lucide-react';

interface FeatureGuardProps {
  feature: 'feature_blog' | 'feature_merch' | 'feature_subscriptions' | 'feature_downloads' | 'feature_newsletter';
  children: React.ReactNode;
  fallback?: string;
}

export const FeatureGuard: React.FC<FeatureGuardProps> = ({ 
  feature, 
  children, 
  fallback = '/' 
}) => {
  const { settings, isLoading, isLoaded, fetchSettings } = useSettingsStore();

  useEffect(() => {
    if (!isLoaded) {
      fetchSettings();
    }
  }, [isLoaded, fetchSettings]);

  if (isLoading || !isLoaded) {
    return (
      <div className="min-h-screen bg-[#030014] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-neon-cyan animate-spin" />
      </div>
    );
  }

  if (!settings[feature]) {
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
};
