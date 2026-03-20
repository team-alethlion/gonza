/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from 'react';

export interface MobileOptimizationConfig {
  pageSize: number;
  enableVirtualScrolling: boolean;
  reducedAnimations: boolean;
  compactView: boolean;
}

export const useMobileOptimization = (): MobileOptimizationConfig => {
  const [config, setConfig] = useState<MobileOptimizationConfig>({
    pageSize: 20, // Increased default page size
    enableVirtualScrolling: false,
    reducedAnimations: false,
    compactView: false
  });

  useEffect(() => {
    const updateConfig = () => {
      const isMobile = window.innerWidth < 768;
      const isSlowConnection = 'connection' in navigator && 
        (navigator as any).connection?.effectiveType === 'slow-2g' || 
        (navigator as any).connection?.effectiveType === '2g';

      setConfig({
        pageSize: isMobile ? 15 : 20, // Increased page sizes but keep them reasonable
        enableVirtualScrolling: isMobile,
        reducedAnimations: isSlowConnection,
        compactView: isMobile
      });
    };

    updateConfig();
    window.addEventListener('resize', updateConfig);
    
    return () => window.removeEventListener('resize', updateConfig);
  }, []);

  return config;
};
