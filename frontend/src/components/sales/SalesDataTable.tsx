import React, { Suspense } from 'react';
import { Sale } from '@/types';
import SalesTable from '@/components/SalesTable';
import SalesTableSkeleton from './SalesTableSkeleton';
import { useIsMobile } from '@/hooks/use-mobile';

interface SalesDataTableProps {
  sales: Sale[];
  onViewReceipt: (sale: Sale) => void;
  onEditSale: (sale: Sale) => void;
  onDeleteSale: (sale: Sale) => void;
  currency: string;
  isLoading: boolean;
  initialCategories?: any[];
}

const SalesDataTable: React.FC<SalesDataTableProps> = ({
  sales,
  onViewReceipt,
  onEditSale,
  onDeleteSale,
  currency,
  isLoading,
  initialCategories
}) => {
  const isMobile = useIsMobile();

  return (
    <div className="space-y-6">
      <Suspense fallback={<SalesTableSkeleton />}>
        <SalesTable
          sales={sales}
          onViewReceipt={onViewReceipt}
          onEditSale={onEditSale}
          onDeleteSale={onDeleteSale}
          currency={currency}
          isLoading={isLoading}
          mobileOptimized={isMobile}
          initialCategories={initialCategories}
        />
      </Suspense>
    </div>
  );
};

export default SalesDataTable;