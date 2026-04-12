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
  summary: {
    totalOpeningStock: number;
    totalStockIn: number;
    totalItemsSold: number;
    totalAdjustmentsIn: number;
    totalAdjustmentsOut: number;
    totalClosingStock: number;
    totalRevaluation: number;
  } | null;
  isFiltered?: boolean;
}

const StockSummaryOverview: React.FC<StockSummaryOverviewProps> = ({ data, summary, isFiltered }) => {
  const { canViewCostPrice } = useFinancialVisibility();
  const { settings } = useBusinessSettings();
  const currency = settings?.currency || 'UGX';

  // 🛡️ Math Hardening
  const toSafeNum = (val: any) => {
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  };

  const formatCurrencyValue = (amount: number) => {
    return `${currency} ${formatNumber(amount)}`;
  };

  const financialTotals = React.useMemo(() => {
    // 🚀 USE BACKEND TOTALS ONLY: Strictly use server-provided summary to ensure accuracy
    const s = summary;
    return {
      openingStockValue: toSafeNum(s?.totalOpeningStockValue),
      stockInValue: toSafeNum(s?.totalStockInValue) + toSafeNum(s?.totalReturnInValue),
      stockOutValue: toSafeNum(s?.totalItemsSoldValue) + toSafeNum(s?.totalAdjustmentsOutValue) + toSafeNum(s?.totalTransferOutValue) + toSafeNum(s?.totalReturnOutValue),
      closingStockValue: toSafeNum(s?.totalClosingStockValue),
      revaluation: toSafeNum(s?.totalRevaluation)
    };
  }, [summary]);

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
              {canViewCostPrice ? formatCurrencyValue(financialTotals.openingStockValue) : '•••'}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium uppercase">Total Stock In Value</p>
            <p className="text-xl font-bold text-green-600">
              {canViewCostPrice ? formatCurrencyValue(financialTotals.stockInValue) : '•••'}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium uppercase">Total Stock Out Value</p>
            <p className="text-xl font-bold text-red-600">
              {canViewCostPrice ? formatCurrencyValue(financialTotals.stockOutValue) : '•••'}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium uppercase">Closing Stock Value</p>
            <p className="text-xl font-bold text-purple-600">
              {canViewCostPrice ? formatCurrencyValue(financialTotals.closingStockValue) : '•••'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default React.memo(StockSummaryOverview);
