
"use client"

import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useInstallPWA } from '@/hooks/useInstallPWA';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const InstallButton: React.FC = () => {
  const { isInstallable, isInstalled, promptToInstall } = useInstallPWA();
  
  if (isInstalled || !isInstallable) {
    return null;
  }
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button 
          variant="outline" 
          size="icon"
          onClick={promptToInstall} 
          className="text-gray-600 hover:text-gray-900"
        >
          <Download className="h-4 w-4" />
          <span className="sr-only">Install app</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Install this app on your computer</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default InstallButton;
