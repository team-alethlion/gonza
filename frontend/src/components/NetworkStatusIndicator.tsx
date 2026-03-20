"use client"

import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WifiOff } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

const NetworkStatusIndicator = () => {
  const { isOnline } = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
      <Alert className="bg-red-50 border-red-200 animate-fade-in">
        <WifiOff className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800 font-medium">
          No internet connection. Please check your network.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default NetworkStatusIndicator;
