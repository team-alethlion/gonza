"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFinancialVisibility } from '@/hooks/useFinancialVisibility';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { formatNumber } from '@/lib/utils';

interface StockSummaryData {
  productId: string;
  productName: string;
  itemNumber: string;
  imageUrl?: string | null;
  costPrice: number;
  sellingPrice: number;
  openingStock: number;
  itemsSold: number;
  stockIn: number;
  transferOut: number;
  returnIn: number;
  returnOut: number;
  adjustmentsIn: number;
  adjustmentsOut: number;
  closingStock: number;
  revaluation: number;
}

interface StockSummaryOverviewProps {
  data: StockSummaryData[];
}

const StockSummaryOverview: React.FC<StockSummaryOverviewProps> = ({ data }) => {
  const { canViewCostPrice } = useFinancialVisibility();
  const { settings } = useBusinessSettings();
  const currency = settings?.currency || 'UGX';

  const formatCurrencyValue = (amount: number) => {
    return `${currency} ${formatNumber(amount)}`;
  };

  const financialTotals = React.useMemo(() => {
    const totals = data.reduce((acc, item) => ({
      openingStock: acc.openingStock + (item.openingStock * item.costPrice),
      // Aggregate Stock In (Stock In + Return In + Adjustments In)
      stockIn: acc.stockIn + ((item.stockIn + item.returnIn + (item.adjustmentsIn || 0)) * item.costPrice),
      // Aggregate Stock Out (Items Sold + Transfer Out + Return Out + Adjustments Out)
      stockOut: acc.stockOut + ((item.itemsSold + item.transferOut + item.returnOut + (item.adjustmentsOut || 0)) * item.costPrice)
    }), {
      openingStock: 0,
      stockIn: 0,
      stockOut: 0
    });

    // Calculate closing stock value derived from the aggregated totals
    // Closing = Opening + StockIn - StockOut
    const closingStock = totals.openingStock + totals.stockIn - totals.stockOut;

    return { ...totals, closingStock };
  }, [data]);

  if (data.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock Summary Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium uppercase">Opening Stock Value</p>
            <p className="text-xl font-bold text-blue-600">
              {canViewCostPrice ? formatCurrencyValue(financialTotals.openingStock) : '•••'}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium uppercase">Total Stock In Value</p>
            <p className="text-xl font-bold text-green-600">
              {canViewCostPrice ? formatCurrencyValue(financialTotals.stockIn) : '•••'}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium uppercase">Total Stock Out Value</p>
            <p className="text-xl font-bold text-red-600">
              {canViewCostPrice ? formatCurrencyValue(financialTotals.stockOut) : '•••'}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium uppercase">Closing Stock Value</p>
            <p className="text-xl font-bold text-purple-600">
              {canViewCostPrice ? formatCurrencyValue(financialTotals.closingStock) : '•••'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StockSummaryOverview;
