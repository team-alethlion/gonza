import React, { Suspense } from 'react';
import { Sale } from '@/types';
import SalesTable from '@/components/SalesTable';
import SalesTableSkeleton from './SalesTableSkeleton';

interface SalesDataTableProps {
  sales: Sale[];
  onViewReceipt: (sale: Sale) => void;
  onEditSale: (sale: Sale) => void;
  onDeleteSale: (sale: Sale) => void;
  currency: string;
  isLoading: boolean;
}

const SalesDataTable: React.FC<SalesDataTableProps> = ({
  sales,
  onViewReceipt,
  onEditSale,
  onDeleteSale,
  currency,
  isLoading
}) => {
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
          mobileOptimized={false} // Disable mobile optimization to show all records
        />
      </Suspense>
    </div>
  );
};

export default SalesDataTable;