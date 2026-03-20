"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Product } from '@/types';
import { Package, AlertTriangle, Ban, TrendingUp, DollarSign } from 'lucide-react';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { formatNumber } from '@/lib/utils';
import { useFinancialVisibility } from '@/hooks/useFinancialVisibility';

interface InventoryStatsProps {
  products: Product[];
  hideStockValue?: boolean;
  // Optional overrides to show totals beyond the current page without fetching all rows here
  totalCountOverride?: number;
  totalCostValueOverride?: number;
  lowStockOverride?: number;
  outOfStockOverride?: number;
  totalStockValueOverride?: number;
}

const InventoryStats: React.FC<InventoryStatsProps> = ({
  products,
  hideStockValue = false,
  totalCountOverride,
  totalCostValueOverride,
  lowStockOverride,
  outOfStockOverride,
  totalStockValueOverride
}) => {

  const { settings } = useBusinessSettings();
  const { canViewCostPrice, canViewSellingPrice } = useFinancialVisibility();


  // Calculate stats
  const totalProducts = typeof totalCountOverride === 'number' ? totalCountOverride : products.length;
  const lowStockProducts = typeof lowStockOverride === 'number' ? lowStockOverride : products.filter(p => p.quantity > 0 && p.quantity <= p.minimumStock).length;
  const outOfStockProducts = typeof outOfStockOverride === 'number' ? outOfStockOverride : products.filter(p => p.quantity === 0).length;

  const totalInventoryValue = typeof totalCostValueOverride === 'number'
    ? totalCostValueOverride
    : products.reduce((sum, product) => sum + (product.costPrice * product.quantity), 0);

  const totalStockValue = typeof totalStockValueOverride === 'number'
    ? totalStockValueOverride
    : products.reduce((sum, product) => {
      return sum + (product.sellingPrice * product.quantity);
    }, 0);

  // Get dynamic font size based on text length
  const getDynamicFontSize = (text: string) => {
    const length = text.length;
    if (length > 15) return "text-sm md:text-lg"; // Very long numbers
    if (length > 12) return "text-base md:text-xl"; // Long numbers
    if (length > 8) return "text-lg md:text-xl"; // Medium numbers
    return "text-lg md:text-2xl"; // Short numbers (default)
  };

  return (
    <div className={`grid gap-3 md:gap-4 mb-6 ${hideStockValue ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3 xl:grid-cols-5'}`}>
      <Card className="overflow-hidden">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center">
            <div className="inline-flex h-8 w-8 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-500">
              <Package className="h-4 w-4 md:h-5 md:w-5" />
            </div>
            <div className="ml-3 md:ml-4 min-w-0">
              <p className="text-xs md:text-sm font-medium text-gray-500 truncate">Total Products</p>
              <h3 className="text-lg md:text-2xl font-bold">{totalProducts}</h3>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center">
            <div className="inline-flex h-8 w-8 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-500">
              <AlertTriangle className="h-4 w-4 md:h-5 md:w-5" />
            </div>
            <div className="ml-3 md:ml-4 min-w-0">
              <p className="text-xs md:text-sm font-medium text-gray-500 truncate">Low Stock</p>
              <h3 className="text-lg md:text-2xl font-bold">{lowStockProducts}</h3>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center">
            <div className="inline-flex h-8 w-8 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-500">
              <Ban className="h-4 w-4 md:h-5 md:w-5" />
            </div>
            <div className="ml-3 md:ml-4 min-w-0">
              <p className="text-xs md:text-sm font-medium text-gray-500 truncate">Out of Stock</p>
              <h3 className="text-lg md:text-2xl font-bold">{outOfStockProducts}</h3>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center">
            <div className="inline-flex h-8 w-8 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-500">
              <TrendingUp className="h-4 w-4 md:h-5 md:w-5" />
            </div>
            <div className="ml-3 md:ml-4 min-w-0 flex-1">
              <p className="text-xs md:text-sm font-medium text-gray-500 truncate">Cost Value</p>
              <h3 className={`${getDynamicFontSize(`${settings.currency} ${formatNumber(totalInventoryValue)}`)} font-bold break-all leading-tight`}>
                {canViewCostPrice ? `${settings.currency} ${formatNumber(totalInventoryValue)}` : '•••'}
              </h3>
            </div>
          </div>
        </CardContent>
      </Card>

      {!hideStockValue && (
        <Card className="overflow-hidden">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center">
              <div className="inline-flex h-8 w-8 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-500">
                <DollarSign className="h-4 w-4 md:h-5 md:w-5" />
              </div>
              <div className="ml-3 md:ml-4 min-w-0 flex-1">
                <p className="text-xs md:text-sm font-medium text-gray-500 truncate">Stock Value</p>
                <h3 className={`${getDynamicFontSize(`${settings.currency} ${formatNumber(totalStockValue)}`)} font-bold break-all leading-tight`}>
                  {canViewSellingPrice ? `${settings.currency} ${formatNumber(totalStockValue)}` : '•••'}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InventoryStats;
