"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface DashboardHeaderProps {
  pageTitle: string;
  isRefreshing: boolean;
  isLoading: boolean;
  onRefresh: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  pageTitle,
  isRefreshing,
  isLoading,
  onRefresh
}) => {
  const router = useRouter();
  const isMobile = useIsMobile();

  return (
    <div className={`flex justify-between items-center ${isMobile ? 'mb-4' : 'mb-6'}`}>
      <h1 className={`${isMobile ? 'text-xl' : 'text-3xl'} font-bold text-sales-dark truncate`}>
        {pageTitle}
      </h1>
      <div className="flex gap-2">
        <Button onClick={() => router.push('/agency/new-sale')} className="gap-2" size={isMobile ? "sm" : "default"}>
          <Plus size={16} />
          {!isMobile && "New Sale"}
        </Button>
      </div>
    </div>
  );
};

export default DashboardHeader;