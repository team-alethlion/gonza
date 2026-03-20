"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import StockSummaryFilters from './StockSummaryFilters';
import StockSummaryTable from './StockSummaryTable';
import StockSummaryOverview from './StockSummaryOverview';
import { useStockSummaryData } from '@/hooks/useStockSummaryData';
import { useProducts } from '@/hooks/useProducts';
import { useAuth } from '@/components/auth/AuthProvider';
import { exportStockSummaryToPDF } from '@/utils/exportStockSummaryToPDF';

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
      adjustmentsIn: number;  adjustmentsOut: number;
  closingStock: number;
  category?: string;
  revaluation: number;
}

const StockSummaryTab = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { products } = useProducts(user?.id, 10000); // Load all products for filtering

  // Load persisted state from localStorage
  const getPersistedState = () => {
    try {
      const saved = localStorage.getItem('stockSummaryFilters');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          period: parsed.period || 'this-month',
          dateRange: parsed.dateRange ? {
            from: parsed.dateRange.from ? new Date(parsed.dateRange.from) : startOfMonth(new Date()),
            to: parsed.dateRange.to ? new Date(parsed.dateRange.to) : endOfMonth(new Date())
          } : {
            from: startOfMonth(new Date()),
            to: endOfMonth(new Date())
          },
          specificDay: parsed.specificDay ? new Date(parsed.specificDay) : undefined
        };
      }
    } catch (error) {
      console.error('Error loading persisted stock summary filters:', error);
    }
    return {
      period: 'all-time' as const,
      dateRange: {
        from: new Date(2020, 0, 1),
        to: endOfDay(new Date())
      },
      specificDay: undefined
    };
  };

  const persistedState = getPersistedState();
  const [period, setPeriod] = useState<'today' | 'yesterday' | 'this-week' | 'last-week' | 'this-month' | 'last-month' | 'this-year' | 'all-time' | 'specific-day' | 'custom'>('all-time');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>(persistedState.dateRange);
  const [specificDay, setSpecificDay] = useState<Date | undefined>(persistedState.specificDay);
  const [filteredStockData, setFilteredStockData] = useState<StockSummaryData[]>([]);

  const { stockSummaryData, isLoading, loadStockSummaryData, clearCache } = useStockSummaryData(dateRange);

  // Handle manual refresh with cache clearing
  const handleRefresh = async () => {
    clearCache();
    await loadStockSummaryData();
  };

  // Listen for stock updates from other components
  useEffect(() => {
    const handleStockUpdate = () => {
      console.log('Stock updated, refreshing stock summary data');
      clearCache();
      loadStockSummaryData();
    };

    window.addEventListener('stock-updated', handleStockUpdate);

    return () => {
      window.removeEventListener('stock-updated', handleStockUpdate);
    };
  }, [clearCache, loadStockSummaryData]);

  // Persist state to localStorage whenever filters change
  useEffect(() => {
    const stateToSave = {
      period,
      dateRange: {
        from: dateRange.from?.toISOString(),
        to: dateRange.to?.toISOString()
      },
      specificDay: specificDay?.toISOString()
    };
    localStorage.setItem('stockSummaryFilters', JSON.stringify(stateToSave));
  }, [period, dateRange, specificDay]);

  // Update date range when period changes
  useEffect(() => {
    const now = new Date();
    let newRange: { from: Date; to: Date };

    switch (period) {
      case 'today':
        newRange = {
          from: startOfDay(now),
          to: endOfDay(now)
        };
        break;
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        newRange = {
          from: startOfDay(yesterday),
          to: endOfDay(yesterday)
        };
        break;
      case 'this-week':
        newRange = {
          from: startOfWeek(now),
          to: endOfWeek(now)
        };
        break;
      case 'last-week':
        const lastWeek = new Date(now);
        lastWeek.setDate(lastWeek.getDate() - 7);
        newRange = {
          from: startOfWeek(lastWeek),
          to: endOfWeek(lastWeek)
        };
        break;
      case 'this-month':
        newRange = {
          from: startOfMonth(now),
          to: endOfMonth(now)
        };
        break;
      case 'last-month':
        const lastMonth = new Date(now);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        newRange = {
          from: startOfMonth(lastMonth),
          to: endOfMonth(lastMonth)
        };
        break;
      case 'this-year':
        newRange = {
          from: new Date(now.getFullYear(), 0, 1),
          to: new Date(now.getFullYear(), 11, 31)
        };
        break;
      case 'all-time':
        newRange = {
          from: new Date(2020, 0, 1), // Go back far enough to cover everything
          to: endOfDay(now) // Ensure we cover up to the very end of today
        };
        break;
      case 'specific-day':
        if (specificDay) {
          newRange = {
            from: startOfDay(specificDay),
            to: endOfDay(specificDay)
          };
        } else {
          return; // Don't update if no specific day is selected
        }
        break;
      default:
        return; // Don't change for custom
    }

    const nextRange = newRange;
    if (JSON.stringify(dateRange) !== JSON.stringify(nextRange)) {
      const timer = setTimeout(() => {
        setDateRange(nextRange);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [period, specificDay, dateRange]);

  const exportToCSV = () => {
    const headers = [
      'Item Number',
      'Product Name',
      'Category',
      'Opening Stock',
      'Items Sold',
      'Stock In',
      'Transfer Out',
      'Return In',
      'Return Out',
      'Closing Stock'
    ];

    const rows = filteredStockData.map(item => [
      item.itemNumber,
      item.productName,
      item.category || '',
      item.openingStock.toString(),
      item.itemsSold.toString(),
      item.stockIn.toString(),
      item.transferOut.toString(),
      item.returnIn.toString(),
      item.returnOut.toString(),
      item.closingStock.toString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stock-summary-filtered-${format(dateRange?.from || new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    exportStockSummaryToPDF(filteredStockData, 'Current Period', dateRange);
  };

  const handleProductClick = (productId: string) => {
    router.push(`/inventory/${productId}`);
  };

  const handleFilteredDataChange = (filteredData: StockSummaryData[]) => {
    setFilteredStockData(filteredData);
  };

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-end mb-4">
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
          </div>
          <StockSummaryFilters
            period={period}
            setPeriod={setPeriod}
            dateRange={dateRange}
            setDateRange={setDateRange}
            specificDay={specificDay}
            setSpecificDay={setSpecificDay}
            onExportCSV={exportToCSV}
            onExportPDF={exportToPDF}
          />
        </CardContent>
      </Card>

      {/* Stock Summary Table */}
      <Card>
        <CardContent className="pt-6">
          <StockSummaryTable
            data={stockSummaryData}
            isLoading={isLoading}
            onProductClick={handleProductClick}
            onFilteredDataChange={handleFilteredDataChange}
            currentProducts={products}
          />
        </CardContent>
      </Card>

      {/* Stock Summary Overview */}
      <StockSummaryOverview data={filteredStockData} />
    </div>
  );
};

export default StockSummaryTab;
