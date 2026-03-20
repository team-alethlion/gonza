
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface UpdateNotificationButtonProps {
  onUpdate: () => void;
  isUpdating: boolean;
}

const UpdateNotificationButton: React.FC<UpdateNotificationButtonProps> = ({ 
  onUpdate, 
  isUpdating 
}) => {
  const isMobile = useIsMobile();

  return (
    <div className={`${isMobile ? 'mb-3' : 'mb-4'} w-full`}>
      <Button 
        onClick={onUpdate}
        disabled={isUpdating}
        className={`
          w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold
          ${isMobile ? 'h-10 text-sm' : 'h-12 text-base'}
          transition-all duration-200 shadow-md hover:shadow-lg
          ${isUpdating ? 'opacity-75' : ''}
        `}
      >
        <RefreshCw className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} mr-2 ${isUpdating ? 'animate-spin' : ''}`} />
        {isUpdating ? 'UPDATING APP...' : 'NEW FEATURES AVAILABLE, UPDATE APP'}
      </Button>
    </div>
  );
};

export default UpdateNotificationButton;
