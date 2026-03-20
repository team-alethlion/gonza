"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import SalesCategoryManager from '@/components/sales/SalesCategoryManager';

const SalesHeader: React.FC = () => {
  const router = useRouter();

  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-3xl font-bold text-sales-dark">Overview</h1>
      <div className="flex gap-2">
        <SalesCategoryManager />
        <Button onClick={() => router.push('/agency/new-sale')} className="gap-2">
          <Plus size={16} /> New Sale
        </Button>

      </div>
    </div>
  );
};

export default SalesHeader;
