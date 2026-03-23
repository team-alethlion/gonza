import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Sale } from '@/types';
import { formatNumber } from '@/lib/utils';
import { TrendingUp, DollarSign, Wallet } from 'lucide-react';
import { useFinancialVisibility } from '@/hooks/useFinancialVisibility';

interface SalesSummaryCardsProps {
  sales: Sale[];
  currency: string;
}

export const SalesSummaryCards: React.FC<SalesSummaryCardsProps> = ({ sales, currency }) => {
  const { formatFinancial, canViewCostPrice, canViewProfit, canViewTotalAmount, canViewSellingPrice } = useFinancialVisibility();

  const summary = useMemo(() => {
    return sales.reduce(
      (acc, sale) => {
        return {
          totalSales: acc.totalSales + (sale.total || 0),
          totalCost: acc.totalCost + (sale.totalCost || 0),
          totalProfit: acc.totalProfit + (sale.profit || 0)
        };
      },
      { totalSales: 0, totalCost: 0, totalProfit: 0 }
    );
  }, [sales]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card className="bg-blue-50 border-blue-100">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600 mb-1">Total Sales</p>
            <h3 className="text-2xl font-bold text-blue-900">
              {canViewTotalAmount || canViewSellingPrice ? `${currency} ${formatNumber(summary.totalSales)}` : '•••'}
            </h3>
            <p className="text-xs text-blue-500 mt-1">
              Based on {sales.length} records
            </p>
          </div>
          <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-blue-600" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-orange-50 border-orange-100">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-orange-600 mb-1">Total Cost</p>
            <h3 className="text-2xl font-bold text-orange-900">
              {canViewCostPrice ? `${currency} ${formatNumber(summary.totalCost)}` : '•••'}
            </h3>
            <p className="text-xs text-orange-500 mt-1">
              Cost of goods sold
            </p>
          </div>
          <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
            <Wallet className="h-6 w-6 text-orange-600" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-green-50 border-green-100">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-green-600 mb-1">Total Profit</p>
            <h3 className="text-2xl font-bold text-green-900">
              {canViewProfit ? `${currency} ${formatNumber(summary.totalProfit)}` : '•••'}
            </h3>
            <p className="text-xs text-green-500 mt-1">
              Net earnings
            </p>
          </div>
          <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
            <DollarSign className="h-6 w-6 text-green-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
